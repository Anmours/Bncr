常见问题Q&A：
## 一、拉不了镜像？
* 镜像已经推了大概一周左右，如果拉不到就是你网络问题，或者是镜像服务器问题，请换回官方docker Hub源

## 二、为什么不回复消息 没反应？

* 当发送管理员命令没有反应时，请检查管理员是否正确  
* 步骤:  
  * 对着机器人发 '我的id' 机器人会回复你的id然后设置一下管理员(见下文)
  * 注意!  管理员命令需要在有管理员权限的平台操作，不然无效
  * 不知道哪个平台有管理员权限的，docker attach bncr 后在控制台发

```js
//设置qq管理员 其他平台类似
set qq admin 12345698
set wxKeAImao admin 12345698
set wxQianxun admin 12345698
set wxXyo admin 12345698
set tgBot admin 12345698
set HumanTG admin 12345698
```


* 当群友在群里发消息机器人没有任何回应时，说明你没对群监听
* 快捷操作
   * 管理员在群聊中发送 '监听该群' 即可响应群友消息
   * 发送 '屏蔽该群'   取消监听
   * 发送 '不回复该群' 监听消息但是不会回复任何消息
   * '回复该群' 恢复默认

* 手动设置上诉效果
```js
// 监听tg频道，或者手动设置监听群
set groupWhitelist 平台名:id true
// 栗子，监听一个频道
set groupWhitelist HumanTG:-1001744932665 true
// 删除监听(屏蔽该频道)
del groupWhitelist HumanTG:-1001744932665
// 不回复手动
set noReplylist HumanTG:-1001744932665 true
// 回复手动
set noReplylist HumanTG:-1001744932665 false
或
del noReplylist HumanTG:-1001744932665
```
* 官方命令作为演示插件 * @platform 只填了部分的，检查页眉这个值是否有你准备触发消息的平台名. 可以直接删掉这一行，表示接受所有平台的消息匹配该插件

## 三、鉴权问题
* 每个token对应一个机器码，初次鉴权的时候会绑定机器码，一台机器上重建docker 机器码不会变。 需要换机器码请在群里发/清空机器码

## 四、反馈问题？
* 请带上报错截图，以及说明发了什么命令触发的

## 五、关于部分报错！

## Error: Cannot find module 'xxxxx'  
统一为缺少npm模块,通过管理员对机器人发送 npm i xxxx 命令安装模块后重启即可解决

## Error: Cannot find module './xxxxx' 
统一为缺少自定义模块,谁写的插件找谁要这些模块,一般对应的插件仓库都有的,是你没装好!

## 插件[xxxx.js]加载异常 未设置xxxx
未设置@name|@rule|@version|@admin|@author|@origin
这种情况一般是你的插件放错位置了,比如红灯区 [GitHub](https://github.com/RedLightsDistrict/Bncr_plugins) 的插件,全部放在/plugins/红灯区/下,没有这个目录就新建!


## 五 、关于安装npm包！
* 安装npm失败?
    * 基本都是你网络环境问题,换网重试!
    * 百度报错！再不济然后在群里提问。不要一上来就是咔咔一顿截图
* 开发者在容器内部安装npm包时，尽量在BncrData下执行npm i 命令 ,否则在更新镜像时、重建docker时 会丢失安装过的npm包
* 正确示例：
```
docker exec -it bncr /bin/sh
cd BncrData
npm i xxxx
```
* 或者在宿主机cd到容器映射目录 （需要宿主机安装过node 且npm版本 不低于 9.5.0，使用npm -v 查看版本）直接安装npm包