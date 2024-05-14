/**
 * This file is part of the Bncr project.
 * @author Anmour
 * @name wxXyo
 * @team Bncr团队
 * @version 1.0.2
 * @description wxXyo适配器
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
    sysMethod.startOutLogs('未启用Xyo适配器,退出.');
    return;
  }
  if (!ConfigDB.userConfig.enable) return sysMethod.startOutLogs('未启用Xyo 退出.');
  let XyoUrl = ConfigDB.userConfig.sendUrl;
  if (!XyoUrl) return console.log('Xyo:配置文件未设置sendUrl');
  ///这里new的名字将来会作为 sender.getFrom() 的返回值
  const wxXyo = new Adapter('wxXyo');
  // 包装原生require   你也可以使用其他任何请求工具 例如axios
  const request = require('util').promisify(require('request'));
  // wx数据库
  const wxDB = new BncrDB('wxXyo');
  let botId = await wxDB.get('xyo_botid', ''); //自动设置，无需更改
  let token = await wxDB.get('xyo_token', ''); //set wxXyo xyo_token xxx
  /**向/api/系统路由中添加路由 */
  router.get('/api/bot/Xyo', (req, res) =>
      res.send({ msg: '这是Bncr Xyo Api接口，你的get请求测试正常~，请用post交互数据' })
  );
  router.post('/api/bot/Xyo', async (req, res) => {
      try {
          const body = req.body;
          if (body.content.from_wxid === body.content.robot_wxid) return res.send({ status: 400, data: '', msg: `拒收该消息:${body.msg}` });
          // console.log(body);
          if (botId !== body.content.robot_wxid)
              /* 另一种set数据库操作，第三个值必须为一个对象，传入def字段时，设置成功返回def设置的值*/
              botId = await wxDB.set('xyo_botid', body.content.robot_wxid, { def: body.content.robot_wxid });

          /**
           * 消息类型：1|文本 3|图片 34|语音 42|名片 43|视频 47|
           * 动态表情 48|地理位置 49|分享链接或附件 2001|
           * 红包 2002|小程序 2003|群邀请 10000|系统消息
           */
          if (body.content.type !== 1) return `拒收该消息:${body.msg}`;
          let msgInfo = null;
          //私聊

          if (body.Event === 'EventPrivateChat') {
              msgInfo = {
                  userId: body.content.from_wxid || '',
                  userName: body.content.from_name || '',
                  groupId: '0',
                  groupName: '',
                  msg: body.content.msg || '',
                  msgId: body.content.msg_id || '',
                  fromType: `Social`,
              };
              //群
          } else if (body.Event === 'EventGroupChat') {
              msgInfo = {
                  userId: body.content.from_wxid || '',
                  userName: body.content.from_name || '',
                  groupId: body.content.from_group.replace('@chatroom', '') || '0',
                  groupName: body.content.from_group_name || '',
                  msg: body.content.msg || '',
                  msgId: body.content.msg_id || '',
                  fromType: `Social`,
              };
          }
          msgInfo && wxXyo.receive(msgInfo);
          res.send({ status: 200, data: '', msg: 'ok' });
      } catch (e) {
          console.error('wxXyo接收器错误:', e);
          res.send({ status: 400, data: '', msg: e.toString() });
      }
  });

  wxXyo.reply = async function (replyInfo) {
      // console.log('replyInfo', replyInfo);
      let body = null;
      if (!token) throw new Error('xyo发送消息失败，没有设置xyo token，发送set wxXyo xyo_token xxx设置');
      const to_Wxid = +replyInfo.groupId ? replyInfo.groupId + '@chatroom' : replyInfo.userId;
      switch (replyInfo.type) {
          case 'text':
              replyInfo.msg = replyInfo.msg.replace(/\n/g, '\r');
              body = {
                  to_wxid: to_Wxid,
                  msg: replyInfo.msg,
                  api: "SendTextMsg",
              };
              break;
          case 'image':
              body = {
                  to_wxid: to_Wxid,
                  path: replyInfo.path,
                  api: "SendImageMsg",
              };
              break;
          case 'video':
              body = {
                  to_wxid: to_Wxid,
                  path: replyInfo.path,
                  api: "SendVideoMsg",
              };
              break;
          case 'audio':
              body = {
                  to_wxid: to_Wxid,
                  title: replyInfo?.name || '',
                  desc: replyInfo?.singer || '',
                  url: replyInfo?.path || '',
                  dataurl: replyInfo?.path || '',
                  thumburl: replyInfo?.img || '',
                  api: 'SendMusicLinkMsg'
              };
              break;
          default:
              return;
              break;
      }

      body && await requestXyo(body);
      // console.log('body', );
      return '';
  };
  /* 推送消息方法 */
  wxXyo.push = async function (replyInfo) {
      return this.reply(replyInfo);
  };
  /* wx无法撤回消息 为空 */
  wxXyo.delMsg = () => { };
  /* 发送消息请求体 */
  async function requestXyo(body) {
      return (
          await request({
              url: XyoUrl,
              method: 'post',
              body: {
                  ...body, ...{
                      token, robot_wxid: botId
                  }
              },
              json: true
          })
      ).body;
  }
  return wxXyo;
};