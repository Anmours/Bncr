/**
 * This file is part of the Bncr project.
 * @author Aming
 * @name wxQianxun
 * @team Bncr团队
 * @version 1.0.3
 * @description wxQianxun适配器
 * @adapter true
 * @public true
 * @disable false
 * @priority 2
 * @Copyright ©2023 Aming and Anmours. All rights reserved
 * @classification ["官方适配器"]
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Modified by Merrick
 */

/* 更新日志：
    v1.0.2 增加了自动同意添加好友和拉群功能，需要插件配合，插件下载地址：https://github.com/Merrickk/Bncr_plugins
    v1.0.3 适配3.0 
    */

/* 配置构造器 */
const jsonSchema = BncrCreateSchema.object({
  enable: BncrCreateSchema.boolean().setTitle('是否开启适配器').setDescription(`设置为关则不加载该适配器`).setDefault(false),
  sendUrl: BncrCreateSchema.string().setTitle('上报地址').setDescription(`无界收到消息要发送到的url`).setDefault(''),
});
/* 配置管理器 */
const ConfigDB = new BncrPluginConfig(jsonSchema);
module.exports = async () => {
  /* 读取用户配置 */
  await ConfigDB.get();
  /* 如果用户未配置,userConfig则为空对象{} */
  if (!Object.keys(ConfigDB.userConfig).length) {
    sysMethod.startOutLogs('未启用Qianxun适配器,退出.');
    return;
  }
  if (!ConfigDB.userConfig.enable) return sysMethod.startOutLogs('未启用Qianxun 退出.');
  let QianxunUrl = ConfigDB.userConfig.sendUrl;
  if (!QianxunUrl) return console.log('可爱猫:配置文件未设置sendUrl');
  const { randomUUID } = require('crypto');
  //这里new的名字将来会作为 sender.getFrom() 的返回值
  const wxQianxun = new Adapter('wxQianxun');
  // 包装原生require   你也可以使用其他任何请求工具 例如axios
  wxQianxun.Bridge = {};
  const request = require('util').promisify(require('request'));
  // wx数据库
  const wxDB = new BncrDB('wxQianxun');
  let botId = await wxDB.get('qianxun_botid', ''); //自动设置，无需更改
  /**向/api/系统路由中添加路由 */
  router.get('/api/bot/Qianxun', (req, res) => res.send({ msg: '这是Bncr Qianxun Api接口，你的get请求测试正常~，请用post交互数据' }));
  router.post('/api/bot/Qianxun', async (req, res) => {
    try {
      const body = req.body;
      if (botId !== body.wxid)
        /* 另一种set数据库操作，第三个值必须为一个对象，传入def字段时，设置成功返回def设置的值*/
        botId = await wxDB.set('qianxun_botid', body.wxid, { def: body.wxid });
      // console.log('消息类型:', body.data.data.msgType);

      /**
       * 消息类型：1|文本 3|图片 34|语音 42|名片 43|视频 47|
       * 动态表情 48|地理位置 49|分享链接或附件 2001|
       * 红包 2002|小程序 2003|群邀请 10000|系统消息
       */
      // if (body.data.data.msgType !== 1) return `拒收该消息:${body.msg}`;
      let msgInfo = null;
      //私聊
      if (body.event === 10009 && body.data.data.fromType === 1) {
        msgInfo = {
          userId: body.data.data.fromWxid || '',
          userName: '',
          groupId: '0',
          groupName: '',
          msg: body.data.data.msg || '',
          msgId: body.data.data.msgBase64 || '',
          fromType: `Social`,
        };
        //群
      } else if (body.event === 10008 && body.data.data.fromType === 2) {
        msgInfo = {
          userId: body.data.data.finalFromWxid || '',
          userName: '',
          groupId: body.data.data.fromWxid.replace('@chatroom', '') || '0',
          groupName: '',
          msg: body.data.data.msg || '',
          msgId: body.data.data.msgBase64 || '',
          fromType: `Social`,
        };
        // 自动同意好友请求
      } else if (body.event === 10011) {
        wxQianxun.Bridge.body = body;
        msgInfo = {
          userId: 'EventFriendVerify',
          userName: '好友申请通知',
          groupId: '0',
          groupName: '',
          msg: '收到千寻好友添加请求',
          msgId: '',
          fromType: 'Friend',
        };
      }
      msgInfo && wxQianxun.receive(msgInfo);
      res.send({ status: 200, data: '', msg: 'ok' });
    } catch (e) {
      console.error('千寻消息接收器错误:', e);
      res.send({ status: 400, data: '', msg: e.toString() });
    }
  });

  wxQianxun.reply = async function (replyInfo) {
    // console.log('replyInfo', replyInfo);
    let body = null;
    const to_Wxid = +replyInfo.groupId ? replyInfo.groupId + '@chatroom' : replyInfo.userId;
    switch (replyInfo.type) {
      case 'text':
        replyInfo.msg = replyInfo.msg.replace(/\n/g, '\r');
        body = {
          type: 'Q0001',
          data: {
            wxid: to_Wxid,
            msg: replyInfo.msg,
          },
        };
        break;
      case 'image':
        body = {
          type: 'Q0010',
          data: {
            wxid: to_Wxid,
            path: replyInfo.path,
          },
        };
        break;
        // 自动同意好友请求
        case 'friend':
          body = {
            type: 'Q0017',
            data: {
              scene: '6',
              v3: replyInfo.v3,
              v4: replyInfo.v4
            },
          };
          break;
          // 拉群
          case 'group':
            body = {
              type: 'Q0021',
              data: {
                wxid: replyInfo.wxid,
                objWxid: replyInfo.objWxid,
                type: replyInfo.add_type
              },
            };
            break;
      default:
        return;
        break;
    }
    body && (await requestQianxun(body));
    // console.log('body', body);
    return ''; //reply中的return 最终会返回到调用者 wx没有撤回方法，所以没有必要返回东西
  };
  /* 推送消息方法 */
  wxQianxun.push = async function (replyInfo) {
    return this.reply(replyInfo);
  };
  /* wx无法撤回消息 为空 */
  wxQianxun.delMsg = () => {};
  /* 发送消息请求体 */
  async function requestQianxun(body) {
    return (
      await request({
        url: `${QianxunUrl}/DaenWxHook/httpapi/?wxid=${botId}`,
        method: 'post',
        body: body,
        json: true,
      })
    ).body;
  }
  return wxQianxun;
};