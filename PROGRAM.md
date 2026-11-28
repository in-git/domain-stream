
## 环境与启动
### 前端
依赖：node.js ≥ 18
```bash
npm install
npm run dev
```
### 后端
- JDK 17
- Maven
- Redis
- MySQL 8.0 / 5.7
- IDEA 安装 Lombok 插件
配置数据库与Maven后直接启动主类。

## 代码结构（插件化分包，低耦合）
```
snowy
 |-snowy-admin-web == 前端
 |   |-public        静态资源
 |   |-src
 |       |-api        接口
 |       |-assets     静态文件
 |       |-components 组件
 |       |-config     基础配置
 |       |-layout     布局
 |       |-locales    多语言
 |       |-router     路由
 |       |-store      Pinia状态
 |       |-style      样式
 |       |-utils      工具函数
 |       |-views      页面视图
 |-snowy-common      公共基础模块
 |-snowy-plugin      插件包
 |   |-snowy-plugin-auth      登录鉴权
 |   |-snowy-plugin-biz       业务插件
 |   |-snowy-plugin-client    C端插件
 |   |-snowy-plugin-dev       开发工具
 |   |-snowy-plugin-gen       代码生成
 |   |-snowy-plugin-mobile    移动端管理
 |   |-snowy-plugin-sys       系统管理
 |-snowy-plugin-api  插件接口定义包
 |-snowy-web-app     主启动模块
```
插件化开发规范查阅官方文档。

## 分支说明
- `master`：稳定正式版，版本变更查看tag
- `dev`：开发分支，不保证稳定可用
- `snowy1.8`：1.x 停止新增功能，仅修复bug
- `snowy2.5`：2.x 停止新增功能，可平滑升级至3.x

## 国密密码能力
| 功能 | 算法 |
| ---- | ---- |
| 登录 | SM2前端加密、后端解密 |
| 登录登出日志 | SM2签名保护 |
| 操作日志 | SM2签名保护 |
| 用户密码 | SM3摘要校验 |
| 手机号 | SM4-CBC 脱敏加解密 |


