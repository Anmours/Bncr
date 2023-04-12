/**
 * This file is part of the App project.
 * @author Aming
 * @name tgBot
 * @origin Bncr团队
 * @version 1.0.1
 * @description tgBot适配器
 * @adapter true
 * @public false
 * @disable false
 * @priority 3
 * @Copyright ©2023 Aming and Anmours. All rights reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 */

module.exports = async () => {
    if (!sysMethod.config.tgBot.enable) return sysMethod.startOutLogs('未启用tgBot 退出.');
    /* 补全依赖 */
    await sysMethod.testModule(['node-telegram-bot-api'], { install: true });
    const TelegramBot = require(`node-telegram-bot-api`);
    // const Agent = require('socks5-https-client/lib/Agent');
    const Token = sysMethod.config.tgBot.token;
    const opt = {
        polling: true,
        // 测试不支持Agent代理
        // request: {
        //     agentClass: Agent,
        //     agentOptions: {
        //         socksHost: sysMethod.config.tgBot.proxy.host,
        //         socksPort: sysMethod.config.tgBot.proxy.port,
        //         socksUsername: sysMethod.config.tgBot.proxy.username,
        //         socksPassword: sysMethod.config.tgBot.proxy.password,
        //     },
        // },
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
                send = await tgBot.sendPhoto(sendId, replyInfo.path);
            } else if (replyInfo.type === 'video') {
                send = await tgBot.sendVideo(sendId, replyInfo.path);
            }
            return send ? `${send.chat.id}:${send.message_id}` : '0';
        } catch (e) {
            console.error('tg发送消息失败....');
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
    sysMethod.startOutLogs('链接tgBot 成功.');
    return tg;
};
