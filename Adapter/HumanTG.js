/**
 * This file is part of the Bncr project.
 * @author Aming
 * @name HumanTG
 * @origin Bncr团队
 * @version 1.0.4
 * @description 适配器
 * @adapter true
 * @public false
 * @disable false
 * @priority 101
 * @Copyright ©2023 Aming and Anmours. All rights reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 */


module.exports = () => {
    const sysDB = new BncrDB('system');
    if (!sysMethod.config.HumanTG.enable) return sysMethod.startOutLogs('未启用HumanTG 退出.');
    return new Promise(async (resolve, reject) => {
        /** 定时器 */
        let timeoutID = setTimeout(() => {
            /* 2分钟限时，超时退出 */
            /* login timeout */
            reject('HumanTG登录超时,放弃加载该适配器');
            return;
        }, 2 * 60 * 1000);

        /* 补全依赖 */
        await sysMethod.testModule(['telegram', 'input'], { install: true });

        const HumanTG = new Adapter('HumanTG'),
            { StringSession } = require('telegram/sessions'),
            { Api, TelegramClient } = require('telegram'),
            { NewMessage } = require('telegram/events'),
            input = require('input'),
            HumanTgDb = new BncrDB('HumanTG'),
            session = await HumanTgDb.get('session', ''); //Read Database
        HumanTG.Bridge = {};

        const apiId = sysMethod.config.HumanTG.apiId;
        const apiHash = sysMethod.config.HumanTG.apiHash;
        const stringSession = new StringSession(session); // fill this later with the value from session.save()

        const loginOpt = {
            connectionRetries: 100,
            useWSS: false,
            requestRetries: 1 /* 单次重试次数 */,
            timeout: 5 /* 超时5秒 */,
            autoReconnect: true /* 是否自动重连 */,
            floodSleepThreshold: 20,
            deviceModel: 'Bncr' /* 设备名 */,
            appVersion: await sysDB.get('Version') /* 版本 */,
        };
        if (sysMethod.config.HumanTG.proxyEnable) {
            sysMethod.startOutLogs('使用socks5登录HumanTG...');
            loginOpt['proxy'] = sysMethod.config.HumanTG.proxy;
            loginOpt['proxy']['ip'] = sysMethod.config.HumanTG.proxy.host;
        } else sysMethod.startOutLogs('直连登录HumanTG...');

        const client = new TelegramClient(stringSession, apiId, apiHash, loginOpt);

        // client.setLogLevel("debug")

        await client.start({
            phoneNumber: async () => await input.text('输入注册TG手机号(带+86): '),
            password: async () => await input.text('输入密码: '),
            phoneCode: async () => await input.text('输入TG收到的验证码: '),
            onError: err => console.log(err),
        });
        try {
            await client.getDialogs().catch(e => e);
        } catch {}

        sysMethod.startOutLogs('HumanTG登录成功...');
        // await sysMethod.sleep(5);
        const newSession = client.session.save();
        if (newSession !== session) await HumanTgDb.set('session', newSession); //保存登录session
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
        let botid = sysMethod.config.tgBot?.token?.split(':')[0];

        /* 监听消息 */
        client.addEventHandler(async event => {
            /* 空消息拒收 */
            if (!event.message.text) return;
            const message = event.message;
            const senderInfo = await message.getSender();
            /* bot消息拒收 */
            if (senderInfo?.id?.toString() === botid) return;
            const msgInfo = {
                userId: senderInfo?.id?.toString() || '',
                friendId: message?.peerId?.userId?.toString() || '',
                userName: senderInfo?.username || senderInfo?.firstName || '',
                groupId: event.isPrivate ? '0' : message?.chatId?.toString() || '0',
                groupName: event.isPrivate ? '' : message?.chat?.title || '',
                msg: message.text || '',
                msgId: `${message?.id}` || '',
                replyToMsgId: `${message?.replyTo?.replyToMsgId}` || '0',
            };
            /* 禁用陌生人消息 */
            // if (msgInfo.userId !== loginUserInfo.id.toString() && msgInfo.groupId === '0') return
            if (message?.replyTo?.replyToMsgId) {
                let ChatID = +msgInfo.groupId || +msgInfo.friendId || +msgInfo.userId;
                const replyMsg = await HumanTG.Bridge.getReplyMsg(ChatID, +msgInfo.replyToMsgId);
                Array.isArray(replyMsg) && replyMsg[0]?.message && (msgInfo.msg += replyMsg[0]?.message);
            }
            HumanTG.receive(msgInfo);
        }, new NewMessage());

        HumanTG.reply = async function (replyInfo) {
            try {
                let sendRes = null,
                    sendID = +replyInfo.groupId || +this?.msgInfo?.friendId || +replyInfo.userId;
                // console.log('sendID', sendID);
                if (replyInfo.type === 'text') {
                    /* 编辑消息 */
                    if (replyInfo.userId === loginUserInfo.id.toString()) {
                        try {
                            // throw new Error('')   //取消注释此行代码为直接发送消息,不编辑
                            sendRes = await client.editMessage(sendID, {
                                message: +replyInfo.toMsgId,
                                text: replyInfo.msg,
                            });
                            return (sendRes && `${sendRes.id}`) || '';
                        } catch (e) {
                            // console.log(e);
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
                        message: replyInfo?.msg || '',
                        file: replyInfo.path,
                        replyTo: +replyInfo.toMsgId,
                        forceDocument: false,
                    });
                } else if (replyInfo.type === 'video') {
                    sendRes = await client.sendMessage(sendID, {
                        message: replyInfo?.msg || '',
                        file: replyInfo.path,
                        replyTo: +replyInfo.toMsgId,
                    });
                }
                return (sendRes && `${sendRes.id}`) || '';
            } catch (e) {
                console.error('HumanTG发送消息失败', e);
            }
        };
        HumanTG.delMsg = async function (msgidArr) {
            if (!msgidArr.length) return;
            let delChatId = +this.msgInfo.groupId || +this.msgInfo.userId;
            if (this.msgInfo.userId === loginUserInfo.id.toString()) {
                let arr = [];
                for (const e of msgidArr) arr.push(+e);
                await client.deleteMessages(delChatId, arr, { revoke: true });
            } else {
                //...
            }
        };
        HumanTG.push = async function (replyInfo) {
            return this.reply(replyInfo);
        };
        HumanTG.Bridge.editImage = async function (replyInfo) {
            if (Object.prototype.toString.call(replyInfo) === '[object Object]') {
                let sendID = +replyInfo.groupId || +replyInfo.userId;
                if (['image', 'video'].includes(replyInfo.type)) {
                    /* 编辑消息 */
                    try {
                        sendRes = await client.editMessage(sendID, {
                            message: +replyInfo.msgId,
                            text: replyInfo.msg,
                            file: replyInfo.path,
                            forceDocument: false,
                        });
                        return (sendRes && `${sendRes.id}`) || '';
                    } catch (e) {
                        console.log('编辑失败', e);
                        return;
                    }
                }
            }
        };
        HumanTG.Bridge.getReplyMsg = async (chatID, replyToMsgId) => {
            if (!chatID || !replyToMsgId) return {};
            try {
                return await client.getMessages(chatID, { ids: replyToMsgId });
            } catch (e) {
                // console.log('getReplyMsg', e);
                return {};
            }
        };
        HumanTG.Bridge.getReplySendInfo = async (chatID, replyToMsgId) => {
            if (!chatID || !replyToMsgId) return {};
            try {
                for await (const message of client.iterMessages(chatID, { ids: replyToMsgId })) {
                    // console.log(message.id)
                    return await message.getSender();
                    // console.log('messagemessage', message.sender);
                }
            } catch (e) {
                return {};
            }
        };
        HumanTG.Bridge.getUserMsgId = async function (chatID, userId, num) {
            if (!chatID || !num || !userId) return [];
            let arr = [],
                lastID = 0;
            try {
                const get = async (offsetId = 0) => {
                    for (const message of await client.getMessages(chatID, { limit: 100, offsetId })) {
                        message.fromId?.userId?.toString() === userId && arr.push(message.id);
                        if (arr.length === num) break;
                        lastID = message.id;
                    }
                    if (arr.length === num || lastID - 1 < 1) return arr;
                    return await get(lastID);
                };
                return await get();
            } catch {
                return [];
            }
        };
        HumanTG.Bridge.forwardMessages = async function (chatID, msgId, toChatId) {
            if (!chatID || !msgId || !toChatId) return false;
            try {
                await client.forwardMessages(chatID, { messages: msgId, fromPeer: toChatId });
                return true;
            } catch {
                return false;
            }
        };
        clearTimeout(timeoutID);
        resolve(HumanTG);
    });
};
