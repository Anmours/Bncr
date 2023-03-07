<h1 align="center">无界 | Bncr | Boundless Nodejs Chat Robot</h1>
<div align="center">
<font size=3> Nodejs环境的插件式机器人框架，它可以diy Adapter来对接任何平台来实现交互.</font>

<font size=4>它拥有无限可能，我愿称之为 **《无界》**.</font>



_
</div>  

> **Bncr 是一个开箱即用的Nodejs Chat RoBot（会话式机器人）框架，允许开发者创建高度可测试、可扩展、松散耦合且易于维护的应用程序。本项目架构深受Koishi与sillyGirl的启发；**
# 特性
* 多平台多账户接入系统 ： 2个qq/3个wx/4个tg? so easy!；
* 基于TypeScritp开发 ： 源码仅1.5M；
* 极简的插件开发 ： 系统高度封装，提供简便人性化的系统函数，随心所欲开发插件；
* 异步同步执行自由控制 ： 基于nodejs async/await/Promise特性，你可以自由控制异步同步（阻塞非阻塞运行）；
* 不仅仅是Chat RoBot ： 原生支持npm/yarn，开发潜力无穷大，如果你愿意，可以在本框架上搭建网站、图片服务器、资源共享平台、并发请求等服务，在JavaScript上能做到的事情在这里都将被实现.


# 未来  

* [ ] 插件社区
* [ ] Web页面
* [ ] 在线编辑插件
* [ ] ...


> 目前暂无Web前端开发计划,如果有前端工程师对此感兴趣,请联系我~



# 安装
## Docker
(目前只支持docker安装)
```bash
# 在你要存放数据的目录下手动新建BncrData文件夹
# (以root目录为例) 
# 警告！群晖用户请勿在root下存放任何文件！修改成你的硬盘目录！
mkdir /root/BncrData

# 拉取并运行容器
docker run -dit \
 -v /root/BncrData:/bncr/BncrData \
 -p 9090:9090 \
 --name bncr \
 --hostname bncr \
 --restart on-failure:5 \
anmour/bncr
```

更新
```bash
docker run --rm \
 -v /var/run/docker.sock:/var/run/docker.sock \
 containrrr/watchtower \
 -c --run-once \
bncr
```

查看日志
```bash
docker logs bncr
```

进入容器控制台
```bash
#进入
docker attach bncr
# 退出attach
Ctrl+p Ctrl+q
```
进入容器命令行
```bash
docker exec -it bncr /bin/sh
```

# 开发

[开发文档](https://anmours.github.io/Bncr)
> 如果是手机端浏览开发文档，请点击开发文档右下角的按钮手动打开侧边栏目录

# 其他

 [Github](https://github.com/Anmours/Bncr)   
 [TG频道](https://t.me/red_Lights_District)  
 [赞助列表](./sponsors.md)

