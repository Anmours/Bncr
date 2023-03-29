经测试已经可以在Windows/liunx/MacOS上以二进制文件的方式启动，但是得以后~

目前只支持docker安装

## Docker
(目前只支持docker安装)
```bash
# 在你要存放数据的目录下手动新建BncrData文件夹
# (以root目录为例) 
# 警告！群晖用户请勿在root下存放任何文件！修改成你的硬盘目录！
mkdir /root/BncrData    #在root目录新建BncrData文件夹

# 拉取并运行容器 并进入交互控制台 
docker run -dit \
 -v /root/BncrData:/bncr/BncrData \
 -p 9090:9090 \
 --name bncr \
 --hostname bncr \
 --restart on-failure:5 \
 --log-opt max-size=5m \
 --log-opt max-file=3 \
anmour/bncr && docker attach bncr
```
进入容器交互控制台
```bash
#进入
docker attach bncr
# 退出交互控制台
Ctrl+p Ctrl+q
```


更新容器
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

进入容器命令行(一般用不到)
```bash
docker exec -it bncr /bin/sh
```


## Windows

敬请期待

## MacOS

敬请期待

## liunx

尽请期待
