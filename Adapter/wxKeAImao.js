/**
 * This file is part of the Bncr project.
 * @author Aming
 * @name wxKeAImao
 * @team Bncr团队
 * @version 1.0.3
 * @description wxKeAImao适配器
 * @adapter true
 * @public true
 * @disable false
 * @priority 2
 * @classification ["官方适配器"]
 * @Copyright ©2023 Aming and Anmours. All rights reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
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
    sysMethod.startOutLogs('未配置wxKeAImao适配器,退出.');
    return;
  }

  if (!ConfigDB.userConfig.enable) return sysMethod.startOutLogs('未启用KeAImao 退出.');
  let keaimaoUrl = ConfigDB.userConfig.sendUrl;
  if (!keaimaoUrl) return console.log('可爱猫:配置文件未设置sendUrl');
  const { randomUUID } = require('crypto');
  //这里new的名字将来会作为 sender.getFrom() 的返回值
  const wxKeAImao = new Adapter('wxKeAImao');
  // 包装原生require   你也可以使用其他任何请求工具 例如axios
  const request = require('util').promisify(require('request'));
  // wx数据库
  const wxDB = new BncrDB('wx');
  let token = await wxDB.get('keaimao_token', ''); //自动设置，无需更改
  let botId = await wxDB.get('keaimao_botid', ''); //自动设置，无需更改
  /**向/api/系统路由中添加路由 */
  router.get('/api/bot/KeAImao', (req, res) => res.send({ msg: '这是Bncr KeAImao Api接口，你的get请求测试正常~，请用post交互数据' }));
  router.post('/api/bot/KeAImao', async (req, res) => {
    try {
      const body = req.body;
      /* 拒收自己消息 */
      if (body.final_from_wxid === body.robot_wxid) return `拒收该消息:${body.msg}`;
      /* 读取设置鉴权token */
      if (req.header('Authorization') && token !== req.header('Authorization')) {
        /** 同步设置数据，成功返回true，否则false
         * 不加await为异步，不会等待设置数据库返回数据 */
        await wxDB.set('keaimao_token', req.header('Authorization'));
        token = req.header('Authorization');
      }
      if (botId !== body.robot_wxid) {
        /* 另一中set数据库操作，第三个值必须为一个对象，传入def字段时，设置成功返回def设置的值*/
        botId = await wxDB.set('keaimao_botid', body.robot_wxid, { def: body.robot_wxid });
      }

      // console.log('存储的鉴权头:', token);
      // console.log('请求的鉴权头:', req.header('Authorization'));
      // console.log('消息类型:', body.type);
      /* 群消息数据：
            {
                event: 'EventGroupMsg',
                robot_wxid: 'wxid_9pd',
                robot_name: 'test bot',
                type: 1,
                from_wxid: '195324@chatroom',
                from_name: '',
                final_from_wxid: '98756488854564',
                final_from_name: 'aming',
                to_wxid: 'wxid_9pd',
                msgid: '3764511392241821329',
                msg: '123'
            } */
      /* 私聊消息数据 */
      /* {
                event: 'EventFriendMsg',  
                robot_wxid: 'wxid_9pd',
                robot_name: 'test bot',
                type: 1,
                from_wxid: '98756488854564',
                from_name: 'aming',
                final_from_wxid: '98756488854564',
                final_from_name: 'aming',
                to_wxid: 'wxid_9pd',
                msgid: '2935941486483612223',
                msg: 'time',
            }; */

      /**
       * 1/文本消息 3/图片消息 34/语音消息  42/名片消息  43/视频 47/动态表情 48/地理位置
       * 49/分享链接  2000/转账 2001/红包  2002/小程序  2003/群邀请
       * 可以根据自己需求定制功能
       */
      if ([1, 49, 2002].indexOf(body.type) === -1) return `拒收该消息:${body.msg}`;
      const msgInfo = {
        userId: body.final_from_wxid || '',
        userName: body.final_from_name || '',
        groupId: body.event === 'EventGroupMsg' ? body.from_wxid.replace('@chatroom', '') : '0',
        groupName: body.event === 'EventGroupMsg' ? body.from_name : '',
        msg: body.msg || '',
        msgId: body.msgid || '',
        fromType: `Social`,
      };
      // console.log('msgInfo:', msgInfo);
      wxKeAImao.receive(msgInfo);
      res.send({ status: 200, data: '', msg: 'ok' });
    } catch (e) {
      console.error('可爱猫消息接收器错误:', e);
      res.send({ status: 400, data: '', msg: e.toString() });
    }
  });

  wxKeAImao.reply = async function (replyInfo) {
    // console.log('replyInfo', replyInfo);
    let body = null;
    const to_Wxid = +replyInfo.groupId ? replyInfo.groupId + '@chatroom' : replyInfo.userId;
    switch (replyInfo.type) {
      case 'text':
        body = {
          event: 'SendTextMsg',
          to_wxid: to_Wxid,
          msg: replyInfo.msg,
          token: token,
          robot_wxid: botId,
        };
        break;
      case 'image':
        body = {
          event: 'SendImageMsg',
          to_wxid: to_Wxid,
          msg: {
            // 根据可爱猫api，需要传一个唯一值过去，否则会根据该名在可爱猫服务器下找该文件名发送，找不到才会下载传过去的url图片发送
            // 这里我使用的是uuid，你可以调整成其他随机值
            name: randomUUID().split('-').join(''),
            url: replyInfo.path,
          },
          token: token,
          robot_wxid: botId,
        };
        break;
      case 'video':
        body = {
          event: 'SendVideoMsg',
          to_wxid: to_Wxid,
          msg: {
            // 根据可爱猫api，需要传一个唯一值过去，否则会根据该名在可爱猫服务器下找该文件名发送，找不到才会下载传过去的url图片发送
            // 这里我使用的是uuid，你可以调整成其他随机值
            name: randomUUID().split('-').join(''),
            url: replyInfo.path,
          },
          token: token,
          robot_wxid: botId,
        };
        break;
      default:
        return;
        break;
    }

    body && (await requestKeAImao(body));
    // console.log('body', body);
    /* 请求体 */
    async function requestKeAImao(body) {
      return (
        await request({
          url: keaimaoUrl,
          method: 'post',
          headers: { Authorization: token },
          body: JSON.stringify(body),
        })
      ).body;
    }
    return ''; //reply中的return 最终会返回到调用者 wx没有撤回方法，所以没有必要返回东西
  };
  /* 推送消息方法 */
  wxKeAImao.push = async function (replyInfo) {
    return this.reply(replyInfo);
  };
  /* wx无法撤回消息 为空 */
  wxKeAImao.delMsg = () => {};
  return wxKeAImao;
};
