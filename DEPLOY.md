部署这个项目https://github.com/in-git/domain-stream
部署前，要先找github的镜像加速访问
并且发布，CMS,客户端，ADMIN

要解决snow-admin-web刷新后丢失页面的问题，避免后端或者数据库乱码返回给前端
用nginx做反向代理，解除nginx文件大小限制
注意导入时SQL大小写的问题，不能随意改SQL

[下面的必须严格执行]
地址生成完成后，修改cms frontend，以及snowy-admin-web的后端指向，指向你刚刚生成的后端地址
snowy.config.common.backend-url=http://localhost:81/api [此处改成刚刚生成的后端地址]