/**
 * This file is part of the App project.
 * @author 小寒寒
 * @name wechaty
 * @origin Bncr团队
 * @version 1.0.5
 * @description wx机器人内置适配器，微信需要实名
 * @adapter true
 * @public false
 * @disable false
 * @priority 100
 * @Copyright ©2024 Aming and Anmours. All rights reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 */

/* 配置构造器 */
const jsonSchema = BncrCreateSchema.object({
    basic: BncrCreateSchema.object({
        enable: BncrCreateSchema.boolean().setTitle('是否开启适配器').setDescription(`设置为关则不加载该适配器`).setDefault(false),
        name: BncrCreateSchema.string().setTitle('机器人标识').setDescription(`设置后后续自动登录，更换微信时请更换标识`).setDefault('wechaty')
    }).setTitle('基本设置').setDefault({}),
    friend: BncrCreateSchema.object({
        accept: BncrCreateSchema.boolean().setTitle('自动同意好友申请').setDescription(`设置后自动同意微信好友申请`).setDefault(true),
        hello: BncrCreateSchema.string().setTitle('好友验证消息').setDescription(`设置后需要验证消息后才会自动同意好友`).setDefault(''),
        autoReply: BncrCreateSchema.string().setTitle('通过好友后自动发送的消息').setDescription(`留空则不回复`).setDefault(''),
    }).setTitle('好友相关').setDefault({}),
    room: BncrCreateSchema.object({
        joinList: BncrCreateSchema.string().setTitle('进群监控').setDescription(`当有人进群后触发消息监控的群，多个用,隔开`).setDefault(""),
        joinTips: BncrCreateSchema.string().setTitle('进群提示').setDescription(`当有人进群后触发消息`).setDefault("欢迎加入大家庭~")
    }).setTitle('群聊相关').setDefault({})
});

/* 配置管理器 */
const ConfigDB = new BncrPluginConfig(jsonSchema);
module.exports = async () => {
    /* 读取用户配置 */
    await ConfigDB.get();
    /* 如果用户未配置,userConfig则为空对象{} */
    if (!Object.keys(ConfigDB.userConfig).length) {
        sysMethod.startOutLogs('未配置wechaty适配器,退出.');
        return;
    }
    if (!ConfigDB.userConfig.basic?.enable) return sysMethod.startOutLogs('未启用wechaty 退出.');
    const robotName = ConfigDB.userConfig.basic.name || 'wechaty';
    const accept = ConfigDB.userConfig.friend.accept;
    const hello = ConfigDB.userConfig.friend.hello || '';
    const autoReply = ConfigDB.userConfig.friend.autoReply || '';

    const joinList = ConfigDB.userConfig.room.joinList?.split(",") || [];
    const joinTips = ConfigDB.userConfig.room.joinTips || '欢迎加入大家庭~';

    /** 定时器 */
    let timeoutID = setTimeout(() => {
        throw new Error('wechaty登录超时,放弃加载该适配器');
    }, 2 * 1000 * 60);
    let wx = new Adapter('wechaty');
    /* 补全依赖 */
    await sysMethod.testModule(['wechaty', 'wechaty-plugin-contrib'], { install: true });
    const { WechatyBuilder, types, log } = require('wechaty');
    log.level('error')
    const { QRCodeTerminal } = require('wechaty-plugin-contrib');
    const { FileBox } = require('file-box')
    const bot = WechatyBuilder.build({
        name: robotName
    });

    // /* 注入发送消息方法 */
    wx.reply = async function (replyInfo, sendRes = '') {
        try {
            const contact = await bot.Contact.find({ name: Buffer.from(replyInfo.userId, 'hex').toString('utf-8') });
            const room = replyInfo.groupId != "0" ? await bot.Room.find({ topic: Buffer.from(replyInfo.groupId, 'hex').toString('utf-8') }) : null;
            if (replyInfo.type === 'text') {
                if (room) {
                    sendRes = contact ? await room.say("\n" + replyInfo.msg, contact) : await room.say(replyInfo.msg)
                }
                else {
                    sendRes = await contact.say(replyInfo.msg);
                }
            }
            else if (['image', 'video'].includes(replyInfo.type)) {
                const file = FileBox.fromUrl(replyInfo.path);
                file['_name'] += replyInfo.type == 'image' ? '.png' : '.mp4';
                sendRes = room ? await room.say(file) : await contact.say(file);
            }
            return sendRes ? sendRes.id : '0';
        } catch (e) {
            log.error('wechaty：发送消息失败', e);
        }
    };
    wx.push = async function (replyInfo, send = '') {
        return this.reply(replyInfo);
    };

    bot.on('scan', (qrcode, status) => {
        sysMethod.startOutLogs(`wechaty: 正在登录，${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`);
    });

    bot.on('login', (user) => {
        sysMethod.startOutLogs(`wechaty：${user} 登录成功`);
    });

    bot.on('logout', (user) => {
        sysMethod.startOutLogs(`wechaty：${user} 下线了`);
    });

    bot.on("room-join", async (room, inviteeList, invite) => {
        log.warn(`wechaty：收到群员进群事件`);
        await room.sync();
        const topic = await room.topic();
        const roomId = Buffer.from(topic, 'utf-8').toString('hex');
        if (joinList.includes(roomId) && joinTips) {
            await room.say(joinTips);
        }
    });

    // 邀请进群
    bot.on("room-invite", async (roomInvitation) => {
        log.warn(`wechaty：收到邀请机器人进群事件`);
    })

    bot.on("room-topic", async (room, newTopic, oldTopic, changer) => {
        log.warn(`wechaty：收到群聊名称修改事件`);
        await room.sync();
        //todo：同步修改监听或回复的群id
    });

    bot.on('friendship', async friendship => {
        log.warn("wechaty：收到微信好友申请事件");
        try {
            if (friendship.type() === types.Friendship.Receive && (friendship.hello() === hello || hello == "") && accept) {
                await friendship.accept();
                const contact = friendship.contact();
                await contact.sync();
                await new Promise((resolve) => setTimeout(resolve, 1000));
                autoReply && await contact.say(autoReply);
            }
        }
        catch (e) { }
    });

    // 心跳，防止掉线
    // bot.on('heartbeat', async data => {
    //     try {
    //         const contact = await bot.Contact.find({ name: "文件传输助手" });
    //         await contact.say("[爱心]")
    //     }
    //     catch (e) { }
    // });

    bot.on('error', async (error) => {
        if (error.message.includes('Network error')) {
            sysMethod.startOutLogs('wechaty：网络连接错误，尝试重启');
            await bot.stop();
            await new Promise((resolve) => setTimeout(resolve, 5000));
            await bot.start();
        }
    });

    bot.on('message', async message => {
        try {
            const contact = message.talker();
            // const type = message.type();
            if (contact.self()) return; // 屏蔽自己的消息或非文本消息
            const room = message.room();
            let topic = ''
            if (room) {
                !room.payload.topic && await room.sync();
                topic = await room.topic();
            }
            const msg = message.text();
            const name = contact.name();
            let msgInfo = {
                userId: Buffer.from(name, 'utf-8').toString('hex') || '',
                userName: name || '',
                groupId: topic ? Buffer.from(topic, 'utf-8').toString('hex') : '0',
                groupName: topic,
                msg: msg || '',
                msgId: message.payload.id || '',
            };
            // console.log(msgInfo);
            wx.receive(msgInfo);
        } catch (e) {
            log.error('wechaty接收器报错:', e);
        }
    });

    bot.use(QRCodeTerminal({ small: true }))
    bot.start().catch(e => console.log(e));

    clearTimeout(timeoutID);
    return wx;
};
