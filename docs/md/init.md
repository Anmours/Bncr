经测试已经可以在Windows/liunx/MacOS上以二进制文件的方式启动，但是得以后~

目前只支持docker安装

## Docker
安装
```bash
docker run -dit \
 -v /你的宿主机目录:/bncr/BncrData \
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

## Windows

敬请期待

## MacOS

敬请期待

## liunx

尽请期待
