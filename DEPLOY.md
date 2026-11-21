# Domain Stream 部署文档

本文档描述如何从零拉取并部署本仓库：后端 Spring Boot（含进程守护）、三个前端（客户端 `frontend`、内容管理 `cms`、Snowy 管理后台 `snowy-admin-web`）、MySQL / Redis，以及如何把三个前端的后端指向统一到部署后生成的后端地址，并解决管理后台刷新丢页面、中文乱码两个问题。

---

## 0. 组件与端口规划

| 组件 | 目录 | 技术栈 | 默认监听 | 生产对外 |
| --- | --- | --- | --- | --- |
| 后端服务 | `backend/` | Java 17 / Spring Boot 3.5.16（Snowy 3.0） | `127.0.0.1:82` | nginx 反代 |
| MySQL | — | MySQL 8.0 | `127.0.0.1:3306` | 仅本机 |
| Redis | — | Redis 7 | `127.0.0.1:6379` | 仅本机 |
| 客户端 | `frontend/` | React + Vite | 构建为静态文件 | nginx `:80` |
| 内容管理 | `cms/` | React + Vite | 构建为静态文件 | nginx `:80` |
| 管理后台 | `backend/snowy-admin-web/` | Vue3 + Vite | 构建为静态文件 | nginx `:80` |

约定变量（下文统一使用）：

```bash
BACKEND_ORIGIN=http://127.0.0.1:82        # 后端服务的实际地址（若在别的机器，改成对应 IP:端口 或域名）
DEPLOY_DIR=/opt/domain-stream              # 仓库部署目录
```

> 后端接口没有 `/api` ContextPath，所有接口挂在根路径（`/public/**`、`/auth/b/**`、`/biz/**`、`/dev/**` 等）。因此凡是前端请求里的 `/api`、`/snowy` 前缀，都必须在 nginx 或前端侧**剥掉**后再转发。

---

## 1. 拉取仓库

```bash
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $DEPLOY_DIR
cd $DEPLOY_DIR
git clone https://github.com/in-git/domain-stream.git .
```

后续更新：

```bash
cd $DEPLOY_DIR && git pull
```

---

## 2. 安装环境

```bash
# Java 17、Maven、Node.js 22 LTS（Vite 8 要求 Node 20.19+ / 22.12+）
sudo apt update
sudo apt install -y openjdk-17-jdk maven mysql-server redis-server nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

java -version && mvn -v && node -v && nginx -v
```

---

## 3. 初始化数据库（乱码防治起点）

乱码的根因几乎都在这一环节：库/表字符集不是 `utf8mb4`，或导入时客户端字符集不对。**必须先做对这里，再导入数据。**

### 3.1 配置 MySQL 服务端字符集

编辑 `/etc/mysql/mysql.conf.d/mysqld.cnf`，在 `[mysqld]` 下加入：

```ini
[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
init_connect='SET NAMES utf8mb4'
```

重启并确认：

```bash
sudo systemctl restart mysql
mysql -uroot -p -e "SHOW VARIABLES LIKE 'character_set_server'; SHOW VARIABLES LIKE 'collation_server';"
# 两行都应显示 utf8mb4 / utf8mb4_unicode_ci
```

### 3.2 建库并导入

```bash
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS \`domain-stream\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 关键：--default-character-set=utf8mb4，脚本本身为 UTF-8（含中文注释与数据）
mysql --default-character-set=utf8mb4 -uroot -p \
  --database=domain-stream < $DEPLOY_DIR/sql/snowy_mysql.sql

# 若使用到分类升级脚本
mysql --default-character-set=utf8mb4 -uroot -p \
  --database=domain-stream < $DEPLOY_DIR/sql/update_material_category.sql
```

导入后抽查：

```bash
mysql -uroot -p -e "USE \`domain-stream\`; SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='domain-stream';"
```

### 3.3 确认 JDBC 连接参数

`backend/snowy-web-app/src/main/resources/application.properties` 中的连接串已包含防乱码参数，请勿删除：

```properties
spring.datasource.dynamic.datasource.master.url=jdbc:mysql://localhost:3306/domain-stream?useUnicode=true&characterEncoding=utf-8&useSSL=false&allowPublicKeyRetrieval=true&nullCatalogMeansCurrent=true&useInformationSchema=true&rewriteBatchedStatements=true
```

按实际环境修改 MySQL 账号密码、Redis 地址：

```properties
spring.datasource.dynamic.datasource.master.username=root
spring.datasource.dynamic.datasource.master.password=<你的MySQL密码>
spring.data.redis.host=127.0.0.1
spring.data.redis.port=6379
spring.data.redis.password=
```

同时在 `application.properties` 补充（强制请求/响应使用 UTF-8，双保险）：

```properties
server.servlet.encoding.enabled=true
server.servlet.encoding.charset=UTF-8
server.servlet.encoding.force=true
server.servlet.encoding.force-response=true
```

> 生产环境如需改端口，用 `server.port=`；用环境变量注入时对应 `SERVER_PORT`。

---

## 4. 构建后端并配置进程守护

### 4.1 打包

```bash
cd $DEPLOY_DIR/backend
mvn clean package -DskipTests
# 产物：$DEPLOY_DIR/backend/snowy-web-app/target/snowy-web-app-3.0.0.jar
```

### 4.2 systemd 进程守护

创建服务文件：

```bash
sudo tee /etc/systemd/system/domain-stream.service > /dev/null <<'EOF'
[Unit]
Description=Domain Stream Backend (Snowy)
After=network-online.target mysql.service redis-server.service
Wants=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/domain-stream/backend
Environment=JAVA_OPTS=-Dfile.encoding=UTF-8
ExecStart=/usr/bin/java ${JAVA_OPTS} -Xms512m -Xmx1024m -jar /opt/domain-stream/backend/snowy-web-app/target/snowy-web-app-3.0.0.jar
Restart=always
RestartSec=10
LimitNOFILE=65535
StandardOutput=append:/var/log/domain-stream/backend.log
StandardError=append:/var/log/domain-stream/backend-error.log

[Install]
WantedBy=multi-user.target
EOF

sudo mkdir -p /var/log/domain-stream
sudo chown -R www-data:www-data /var/log/domain-stream
sudo chown -R www-data:www-data $DEPLOY_DIR/backend/snowy-web-app/target

sudo systemctl daemon-reload
sudo systemctl enable --now domain-stream
sudo systemctl status domain-stream
```

常用运维：

```bash
sudo systemctl restart domain-stream     # 重启
sudo systemctl stop domain-stream        # 停止
journalctl -u domain-stream -f           # 跟踪日志
tail -f /var/log/domain-stream/backend.log
```

验证后端（返回 JSON 即为正常，且中文不乱码）：

```bash
curl http://127.0.0.1:82/public/categories | head
```

---

## 5. 生成并确认后端地址

部署完成后，确定对外可访问的后端地址 `$BACKEND_ORIGIN`：

- 本机部署：`http://127.0.0.1:82`
- 独立服务器：`http://<服务器公网IP>:82`（安全组放行 82）
- 有域名：`https://api.example.com`（推荐，配合证书）

**下一步用这个地址统一修改三个前端的后端指向。** 下文给出两种做法：

- **方案 A（推荐）**：前端保持相对路径 `/api`、`/snowy`，由 nginx 把这些前缀反代到 `$BACKEND_ORIGIN`。后端地址只写在 nginx 一处，改地址只改 nginx，最省事，且能一并解决刷新 404 与 WebSocket。
- **方案 B**：构建时把 `$BACKEND_ORIGIN` 直接写进前端配置（直连）。适合前端与后端不同域、且不引入 nginx 反代的场景。

> 无论哪种方案，Vite 的 `server.proxy` / `preview.proxy` 只在开发/预览生效，对 `npm run build` 生成的 `dist/` 静态文件无效。生产环境请改环境变量或改 nginx。

---

## 6. 修改三个前端的后端指向

### 6.1 客户端 `frontend/`

代码已支持环境变量覆盖，构建时创建 `frontend/.env.production`：

**方案 A（nginx 同域反代）**

```env
VITE_API_BASE_URL=/api
VITE_SNOWY_BASE_URL=/snowy
```

**方案 B（直连后端）**

```env
VITE_API_BASE_URL=http://<BACKEND_ORIGIN>
VITE_SNOWY_BASE_URL=http://<BACKEND_ORIGIN>
```

> 说明：`VITE_API_BASE_URL` 用于内容接口（`/public/**`），`VITE_SNOWY_BASE_URL` 用于登录注册等认证接口（`/auth/c/**`）。两者都取 `${path}` 拼接，值里**不要带结尾 `/`**。若采用直连，需保证后端已开启 CORS（本仓库 `GlobalConfigure` 已放行 `Access-Control-Allow-Origin: *`）。

访客 WebSocket 走 `/ws`。方案 A 由 nginx 反代；方案 B 需把 WebSocket 地址改为 `ws://<BACKEND_ORIGIN>/ws`（在 `frontend/src` 中搜索 `ws://` 或 `/ws` 的定义处调整）。

构建：

```bash
cd $DEPLOY_DIR/frontend
npm install
npm run build          # 产物 frontend/dist
```

### 6.2 内容管理 `cms/`

`cms/src/lib/snowy.ts` 中 `SNOWY_BASE = '/snowy'` 是**代码常量，没有环境变量开关**，因此：

- **方案 A（推荐）**：保持 `/snowy` 不变，由 nginx 反代 `/snowy/ → $BACKEND_ORIGIN/`（剥掉前缀）。无需改源码。
- **方案 B（直连）**：编辑 `cms/src/lib/snowy.ts` 第 15 行：

```ts
const SNOWY_BASE = 'http://<BACKEND_ORIGIN>';
```

构建：

```bash
cd $DEPLOY_DIR/cms
npm install
npm run build          # 产物 cms/dist
```

> 开发/预览时若后端不在本机，可用环境变量 `SNOWY_HOST=<后端IP> SNOWY_PORT=82 npm run dev` 覆盖 `cms/vite.config.ts` 中代理的默认 `localhost:82`。

### 6.3 管理后台 `backend/snowy-admin-web/`

`request.js` 的逻辑：生产环境且 `VITE_API_BASEURL` 是完整 `http(s)://` 地址时走直连；否则走 `/api` 相对路径代理。

编辑 `backend/snowy-admin-web/.env.production`：

**方案 A（nginx 同域反代）**

```env
VITE_API_BASEURL = /api
```

**方案 B（直连后端）**

```env
VITE_API_BASEURL = http://<BACKEND_ORIGIN>
```

构建：

```bash
cd $DEPLOY_DIR/backend/snowy-admin-web
npm install
npm run build          # 产物 backend/snowy-admin-web/dist
```

> 若采用方案 B 直连，注意后台返回的图片/文件 URL 多为相对路径（如 `/dev/file/download?id=...`），浏览器会请求到后台站点域名导致 404。因此**强烈建议方案 A**，把 `/api`、`/dev`、`/snowy` 等全部由同域 nginx 反代到后端。

---

## 7. nginx 配置（解决刷新丢页面 + 反代 + 乱码）

`snowy-admin-web` 使用 `createWebHistory()`（history 路由）。直接访问或刷新 `/index`、`/sys/user` 等路径时，nginx 会去找同名文件，找不到就 404，导致“刷新后页面丢失”。必须用 `try_files` 回退到 `index.html`。

下面给出三个前端各自独立 server 的完整示例（可按需合并到不同域名/端口）。把 `root` 指向上一节构建出的 `dist`。

```nginx
# 通用：接口响应强制 UTF-8，避免 JSON 中文乱码
charset utf-8;

# ---------- 客户端 frontend ----------
server {
    listen 80;
    server_name www.example.com;
    root /opt/domain-stream/frontend/dist;
    index index.html;

    # 接口/静态文件：必须放在 location / 之前
    location /api/ {
        proxy_pass http://127.0.0.1:82/;      # 结尾 / 剥掉 /api 前缀
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    location /snowy/ {
        proxy_pass http://127.0.0.1:82/;      # 剥掉 /snowy 前缀
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /ws/ {
        proxy_pass http://127.0.0.1:82/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 600s;
    }

    # SPA 回退：刷新任意前端路由都返回 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# ---------- 内容管理 cms ----------
server {
    listen 80;
    server_name cms.example.com;
    root /opt/domain-stream/cms/dist;
    index index.html;

    location /snowy/ {
        proxy_pass http://127.0.0.1:82/;      # cms 的 /snowy 同样剥前缀转后端
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 1024m;           # 素材/富文本图片上传
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# ---------- 管理后台 snowy-admin-web ----------
server {
    listen 80;
    server_name admin.example.com;
    root /opt/domain-stream/backend/snowy-admin-web/dist;
    index index.html;
    client_max_body_size 1024m;

    # 后台所有接口都带 /api 前缀，统一剥掉后转发到后端根路径
    location /api/ {
        proxy_pass http://127.0.0.1:82/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 关键：history 路由刷新回退，解决刷新丢页面
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

应用配置：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

刷新验证：

1. 打开 `admin.example.com` 登录，进入任意菜单（如 `/sys/user`）。
2. 按 `F5` 刷新，页面应正常保留，而不是 404 或白屏。
3. 若部署在子路径（如 `/admin/`），需同时把 `snowy-admin-web/src/router/index.js` 的 `createWebHistory('/admin/')` 加上 base，并把 try_files 改为 `try_files $uri $uri/ /admin/index.html;`。

---

## 8. 乱码问题排查清单

出现中文变成 `??` 或 `\uXXXX` 之外的乱码时，按以下顺序排查：

1. **数据库**：库、表、字段字符集均为 `utf8mb4`（见 3.1 / 3.2）。
2. **导入**：导入命令带 `--default-character-set=utf8mb4`，SQL 文件本身为 UTF-8。
3. **JDBC**：连接串含 `useUnicode=true&characterEncoding=utf-8`（见 3.3）。
4. **后端**：`application.properties` 已加 `server.servlet.encoding.*=UTF-8`；systemd 加了 `-Dfile.encoding=UTF-8`。
5. **接口验证**：直接 `curl http://127.0.0.1:82/public/categories`，终端显示中文正常，则后端无问题，乱码来自nginx/前端。
6. **nginx**：配置中有 `charset utf-8;`；确认没有多余的 `charset_types` 限制把 `application/json` 排除。
7. **前端文件**：各 `index.html` 的 `<meta charset="UTF-8">` 存在；`.env` 文件保存为 UTF-8 无 BOM。

---

## 9. 部署验收清单

- [ ] `git clone` 成功，目录结构完整
- [ ] MySQL 字符集为 `utf8mb4`，数据导入无报错，中文正常
- [ ] Redis 正常运行
- [ ] 后端 jar 构建成功，`domain-stream.service` 为 `active (running)` 且开机自启
- [ ] `curl $BACKEND_ORIGIN/public/categories` 返回正常 JSON、中文不乱码
- [ ] 三个前端 `.env.production`（或 cms 源码 / nginx）的后端指向已改为 `$BACKEND_ORIGIN`
- [ ] 三个 `dist` 构建成功，nginx `try_files` 已配置
- [ ] 客户端可浏览内容、可登录；cms 可管理；admin 可登录
- [ ] admin 登录后在非首页路径刷新，页面不丢失
- [ ] 前端各处中文显示正常，无乱码

---

## 10. 一键更新流程（参考）

```bash
cd $DEPLOY_DIR && git pull

# 后端
cd backend && mvn clean package -DskipTests
sudo systemctl restart domain-stream

# 客户端
cd ../frontend && npm install && npm run build

# 内容管理
cd ../cms && npm install && npm run build

# 管理后台
cd backend/snowy-admin-web && npm install && npm run build

sudo nginx -t && sudo systemctl reload nginx
```
