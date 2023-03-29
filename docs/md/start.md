# 配置
初次启动会在你映射的宿主机路径下创建5个文件夹，分别为 `Adapter` `config` `public` `db` `plugins`
`config` 下会自动生成一些启动所需的配置文件，已进行详细注释，根据自己情况来填写；

`Adapter`下会自带 `tgbot、HumanTG 、qqbot、wxKeAImao、wxQianxun`以及系统适配器；

`public` 为静态资源目录，你可以在里边放一些文件，通过 `http://ip:9090/public/文件名`来访问这些资源

`db` 为系统数据库存放目录

`plugins` 插件目录，自带一些官方插件

# 管理员命令没反应？群聊不回复群友？  
参见 [**常见问题Q&A**](/help/Q&A.md)

# 基础命令
```js
//获取数据库数据
get 表 key
//例如获取管理员
get qq admin
// 设置数据库
set 表 key value
set system name Anmour
// 重启机器
重启
//获取时间
time
//启动时间
启动时间
//获取机器码
机器码
//获取版本
bncr版本
// 获取群id
群id
//获取个人id
我的id
//监听群消息 （默认屏蔽所有群）
监听该群
//屏蔽群消息
屏蔽该群
//不回复该群
不回复该群
//回复
回复该群

```


# 其他命令
其他命令要视插件情况而定,具体问队友插件作者

# 关于报错!

## Error: Cannot find module 'xxxxx'  
统一为缺少npm模块,通过管理员对机器人发送 npm i xxxx 命令安装模块后重启即可解决

## Error: Cannot find module './xxxxx' 
统一为缺少自定义模块,谁写的插件找谁要这些模块,一般对应的插件仓库都有的,是你没装好!

## 插件[xxxx.js]加载异常 未设置xxxx
未设置@name|@rule|@version|@admin|@author|@origin
这种情况一般是你的插件放错位置了,比如红灯区的插件,全部放在/plugins/红灯区/下,没有这个目录就新建!