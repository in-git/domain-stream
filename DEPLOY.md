部署这个项目

https://github.com/in-git/domain-stream

并且发布应用

supervisord开启守护，避免服务器进程被杀

一共需要3个完全不同的地址，CMS,客户端，ADMIN

地址生成完成后，修改cms frontend，以及snowy-admin-web的后端指向，指向你刚刚生成的后端地址
要解决snow-admin-web刷新后丢失页面的问题，避免后端或者数据库乱码返回给前端