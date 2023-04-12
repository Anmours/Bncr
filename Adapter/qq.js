/**
 * This file is part of the App project.
 * @author Aming
 * @name qq
 * @origin Bncr团队
 * @version 1.0.0
 * @description qq机器人适配器
 * @adapter true
 * @public false
 * @disable false
 * @priority 100
 * @Copyright ©2023 Aming and Anmours. All rights reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 */

module.exports = async () => {
    if (!sysMethod.config.qqBot.enable) return sysMethod.startOutLogs('未启用qqBot 退出.');
    const path = require('path');

    /** 定时器 */
    let timeoutID = setTimeout(() => {
        throw new Error('qq登录超时,放弃加载该适配器');
    }, 2 * 1000 * 60);
    let qq = new Adapter('qq');
    /* 补全依赖 */
    await sysMethod.testModule(['oicq'], { install: true });
    const { createClient } = require('oicq');
    const account = sysMethod.config.qqBot.qqId;
    const client = createClient(account, {
        data_dir: path.join(process.cwd(), 'BncrData/db/qqdata'),
        //"trace" | "debug" | "info" | "warn" | "error" | "fatal" | "mark" | "off";
        log_level: sysMethod.config.qqBot.log_level,
        //1:安卓手机 2:aPad 3:安卓手表 4:MacOS 5:iPad
        platform: sysMethod.config.qqBot.platform,
    });

    /* 注入发送消息方法 */
    qq.reply = async function (replyInfo, sendRes = '') {
        try {
            if (replyInfo.type === 'text') {
                if (+replyInfo.groupId) {
                    sendRes = await client.sendGroupMsg(+replyInfo.groupId, replyInfo.msg);
                } else if (+replyInfo.userId) {
                    sendRes = await client.sendPrivateMsg(+replyInfo.userId, replyInfo.msg);
                }
            } else if (replyInfo.type === 'image') {
                /* 图片发送消息待完善 */
            } else if (replyInfo.type === 'video') {
                /* 视频发送消息待完善 */
            }
            return sendRes ? sendRes.message_id : '0';
        } catch (e) {
            console.error('qq:发送消息失败', e);
        }
    };
    qq.push = async function (replyInfo, send = '') {
        //待完善
    };

    /* 注入删除消息方法 */
    qq.delMsg = async function (argsArr) {
        try {
            argsArr.forEach(e => {
                if (typeof e === 'string' || typeof e === 'number') {
                    console.log('撤销:', e);
                    client.deleteMsg(e);
                }
            });
            return true;
        } catch (e) {
            console.log('qq撤回消息异常', e);
            return false;
        }
    };

    client.on('system.online', () => {
        sysMethod.startOutLogs('qqBot登录成功...');
    });

    client.on('message', async req => {
        try {
            // console.log('req: ', req);
            let msgInfo = {
                userId: req.sender['user_id'] + '' || '',
                userName: req.sender['nickname'] || '',
                groupId: req.group_id ? req.group_id + '' : '0',
                groupName: req.group_name || '',
                msg: req['raw_message'] || '',
                msgId: req.message_id || '',
            };
            // console.log('最终消息：', msgInfo);
            qq.receive(msgInfo);
        } catch (e) {
            console.log('qq接收器报错:', e);
        }
    });
    //扫码登录
    client.on('system.login.qrcode', function (e) {
        //扫码后按回车登录
        sysMethod.startOutLogs(`使用${account}扫码后按回车登录`);
        sysMethod.startOutLogs(`如需关闭qq适配器请输入bye退出程序,修改config.js中qqbot.enable为false后重新启动`);
        process.stdin.once('data', () => {
            this.login();
        });
    });
    //处理设备锁验证
    client.on('system.login.slider', function (e) {
        console.log('输入ticket：\n输入后回车确认');
        process.stdin.once('data', ticket => this.submitSlider(String(ticket).trim()));
    });

    client.login();

    clearTimeout(timeoutID);
    return qq;
};
