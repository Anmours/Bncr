/**
 * This file is part of the Bncr project.
 * @author Aming
 * @name HumanTG
 * @origin 官方
 * @version 1.0.0
 * @description 适配器
 * @adapter true
 * @public false
 * @disable false
 * @priority 101
 * @Copyright ©2023 Aming and Anmours. All rights reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 */
module.exports = () => {

    if (!sysMethod.config.HumanTG.enable) return sysMethod.startOutLogs('未启用HumanTG 退出.');
    return new Promise(async (resolve, reject) => {
        /** 定时器 */
        let timeoutID = setTimeout(() => {
            /* 2分钟限时，超时退出 */
            reject('HumanTG登录超时,放弃加载该适配器');
        }, 2 * 60 * 1000);

        const HumanTG = new Adapter('HumanTG');
        const { StringSession } = require('telegram/sessions');
        const { Api, TelegramClient } = require('telegram');
        const { NewMessage } = require('telegram/events');
        const input = require('input');
        const HumanTgDb = new BncrDB('HumanTG');
        const session = await HumanTgDb.get('session', '');

        const apiId = sysMethod.config.HumanTG.apiId;
        const apiHash = sysMethod.config.HumanTG.apiHash;
        const stringSession = new StringSession(session); // fill this later with the value from session.save()

        const loginOpt = {
            connectionRetries: sysMethod.config.HumanTG.connectionRetries,
            useWSS: false,
        };
        if (sysMethod.config.HumanTG.proxyEnable) {
            sysMethod.startOutLogs('使用socks5登录HumanTG...');
            loginOpt['proxy'] = sysMethod.config.HumanTG.proxy;
            loginOpt['proxy']['ip'] = sysMethod.config.HumanTG.proxy.host;
        } else sysMethod.startOutLogs('直连登录HumanTG...');

        const client = new TelegramClient(stringSession, apiId, apiHash, loginOpt);

        await client.start({
            phoneNumber: async () => await input.text('输入注册TG手机号(带+86): '),
            password: async () => await input.text('输入密码: '),
            phoneCode: async () => await input.text('输入TG收到的验证码: '),
            onError: err => console.log(err),
        });
        sysMethod.startOutLogs('HumanTG登录成功...');
        // await sysMethod.sleep(5);
        const newSession = client.session.save();
        if (newSession !== session) await HumanTgDb.set('session', newSession); //保存登录session
        // await client.connect();
        /* 获取登录的账号信息 */
        const loginUserInfo = await client.getMe();
        /* 保存管理员信息 ，如果需要手动设置管理员 注释这句*/
        HumanTgDb.set('admin', loginUserInfo.id.toString());
        // console.log(loginUserInfo);
        
        let startLog = `Hello ${loginUserInfo.firstName || loginUserInfo.username}\n`;
        startLog += `Bncr 启动成功.....\n`;
        startLog += sysMethod.getTime('yyyy-MM-dd hh:mm:ss') + '\n';
        startLog += `\`-------------------------\``;
        let pushChat = sysMethod.config.HumanTG.startLogOutChat || '';
        /* 向指定用户发送信息 */
        pushChat && (await client.sendMessage(pushChat, { message: startLog, parseMode: 'md' }));

        /* 监听消息 */
        client.addEventHandler(async event => {
            const message = event.message;
            /* 空消息拒收 */
            if (!message.text) return;
            // console.log('className',message.peerId.className);
            // console.log('userId',message.peerId.userId);
            // console.log('channelId',message.peerId.channelId);
            // console.log('message',message);
            const senderInfo = await message.getSender();
            /* bot消息拒收 */
            if (senderInfo && senderInfo.bot) return;

            const msgInfo = {
                userId: (senderInfo && senderInfo.id && senderInfo.id.toString()) || '',
                userName: senderInfo && (senderInfo.username || senderInfo.firstName || ''),
                groupId: event.isPrivate ? '0' : message.chatId.toString() || '0',
                groupName: event.isPrivate ? '' : message.chat.title || '',
                msg: message.text || '',
                msgId: `${message.id}` || '',
            };
            HumanTG.receive(msgInfo);
        }, new NewMessage());

        HumanTG.reply = async function (replyInfo) {
            // console.log('replyInfo',replyInfo);
            try {
                let sendRes = null;
                let sendID = +replyInfo.groupId || +replyInfo.userId;
                if (replyInfo.type === 'text') {
                    /* 编辑消息 */
                    if (replyInfo.userId === loginUserInfo.id.toString()) {
                        try {
                            sendRes = await client.editMessage(sendID, {
                                message: +replyInfo.toMsgId,
                                text: replyInfo.msg,
                            });
                            return (sendRes && `${sendRes.id}`) || '';
                        } catch (e) {
                        }
                    }
                    /* 编辑消息失败直接发送信息 */
                    sendRes = await client.sendMessage(sendID, {
                        message: replyInfo.msg,
                        parseMode: 'md',
                        replyTo: +replyInfo.toMsgId,
                    });
                } else if (replyInfo.type === 'image') {
                    sendRes = await client.sendMessage(sendID, {
                        file:replyInfo.msg,
                        replyTo: +replyInfo.toMsgId,
                        forceDocument:false
                    });
                } else if (replyInfo.type === 'video') {
                    sendRes = await client.sendMessage(sendID, {
                        file: replyInfo.msg,
                        replyTo: +replyInfo.toMsgId,
                    });
                }
                return (sendRes && `${sendRes.id}`) || '';
            } catch (e) {
                console.error('HumanTG发送消息失败', e);
            }
        };
        HumanTG.delMsg = async function (msgidArr) {
            let delChatId = +this.msgInfo.groupId || +this.msgInfo.userId;
            if (this.msgInfo.userId === loginUserInfo.id.toString()) {
                for (const e of msgidArr) {
                    await client.deleteMessages(delChatId, [+e], {
                        revoke: true,
                    });
                }
            } else {
                //...
            }
        };
        HumanTG.push = async function (replyInfo) {
            return this.reply(replyInfo);
        };
        clearTimeout(timeoutID);
        resolve(HumanTG);
    });
};
