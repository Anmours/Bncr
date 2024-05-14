/**
 * This file is part of the App project.
 * @author Aming
 * @name tgBot
 * @team Bncr团队
 * @version 1.0.3
 * @description tgBot适配器
 * @adapter true
 * @public true
 * @disable false
 * @priority 3
 * @classification ["官方适配器"]
 * @Copyright ©2023 Aming and Anmours. All rights reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 */
/* 配置构造器 */
const jsonSchema = BncrCreateSchema.object({
  enable: BncrCreateSchema.boolean().setTitle('是否开启适配器').setDescription(`设置为关则不加载该适配器`).setDefault(false),
  token: BncrCreateSchema.string().setTitle('tgBot的Token').setDescription(`你的telegarmBot的apiToken`).setDefault(''),
  proxyHost: BncrCreateSchema.string().setTitle('自建tg反代').setDescription(`你的telegarm自建反代`).setDefault(''),
});

/* 配置管理器 */
const ConfigDB = new BncrPluginConfig(jsonSchema);

module.exports = async () => {
  /* 读取用户配置 */
  await ConfigDB.get();
  /* 如果用户未配置,userConfig则为空对象{} */
  if (!Object.keys(ConfigDB.userConfig).length) {
      sysMethod.startOutLogs('未配置tgBot适配器,退出.');
      return;
  }

  if (!ConfigDB.userConfig.enable) return sysMethod.startOutLogs('未启用tgBot 退出.');
  /* 补全依赖 */
  await sysMethod.testModule(['node-telegram-bot-api'], { install: true });
  const TelegramBot = require(`node-telegram-bot-api`);
  const Token = ConfigDB.userConfig.token;
  const opt = {
      polling: true,
      baseApiUrl: ConfigDB.userConfig.proxyHost
  };

  const tgBot = new TelegramBot(Token, opt);
  const tg = new Adapter('tgBot');
  /* 注入发送消息方法 */
  tg.reply = async function (replyInfo, send = '') {
      try {
          let sendId = +replyInfo.groupId || +replyInfo.userId;
          if (replyInfo.type === 'text') {
              send = await tgBot.sendMessage(sendId, replyInfo.msg);
          } else if (replyInfo.type === 'image') {
              if (replyInfo.msg) {
                  send = await tgBot.sendPhoto(sendId, replyInfo.path, {caption: replyInfo.msg});
              } else {
                  send = await tgBot.sendPhoto(sendId, replyInfo.path);
              }
          } else if (replyInfo.type === 'video') {
              send = await tgBot.sendVideo(sendId, replyInfo.path);
          } else if (replyInfo.type === 'audio') {
              send = await tgBot.sendAudio(sendId, replyInfo.path, {
                title: replyInfo?.name || '',
                performer: replyInfo?.singer || ''
              });
          } else if (replyInfo.type === 'markdown') {
              send = await tgBot.sendMessage(sendId, replyInfo.msg, {
                  parse_mode: 'Markdown'
              });
          } else if (replyInfo.type === 'html') {
              send = await tgBot.sendMessage(sendId, replyInfo.msg, {
                  parse_mode: 'HTML'
              });
          }
          return send ? `${send.chat.id}:${send.message_id}` : '0';
      } catch (e) {
          console.error('tg发送消息失败....', e.message);
      }
  };
  /* 推送方法 */
  tg.push = async function (replyInfo) {
      try {
          return await this.reply(replyInfo);
      } catch (e) {
          console.error('tgBot push消息失败', e);
      }
  };
  /* 注入删除消息方法 */
  tg.delMsg = async function (args) {
      try {
          args.forEach(e => {
              if (typeof e === 'string' || typeof e === 'number') {
                  let [chatid, sendid] = e.split(':');
                  // console.log(chatid);
                  // console.log(sendid);
                  console.log('撤销:', e);
                  tgBot.deleteMessage(chatid, sendid);
              }
          });
          return true;
      } catch (e) {
          console.log(e);
          return false;
      }
  };

  tgBot.on('message', req => {
      try {
          // console.log("data: ", req);
          let msgInfo = {
              userId: req['from']['id'] + '' || '',
              userName: req['from']['username'] || '',
              groupId: req['chat']['type'] !== 'private' ? req['chat']['id'] + '' : '0',
              groupName: req['group_name'] || '',
              msg: req['text'] || '',
              msgId: `${req['chat']['id']}:${req['message_id']}` || '',
              fromType: `Social`,
          };
          // console.log('tg最终消息：', msgInfo);
          tg.receive(msgInfo);
      } catch (e) {
          console.log('tgBot接收器错误:', e);
      }
  });
  tgBot.on('polling_error', msg => console.log('tgBot轮询错误:', msg.message));
  sysMethod.startOutLogs('链接tgBot 成功.');
  return tg;
};