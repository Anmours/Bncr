/**
 * This file is part of the App project.
 * @author Aming
 * @name qqOutside
 * @version 1.0.0
 * @description 外置qq机器人适配器
 * @adapter true
 * @public false
 * @disable false
 * @priority 100
 * @Copyright ©2023 Aming and Anmours. All rights reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 */

module.exports = async () => {
    if (!sysMethod.config.qqBot_Outside.enable) return sysMethod.startOutLogs('未启用外置qq 退出.');
    let qq = new Adapter('qq');
    if (sysMethod.config.qqBot_Outside.mode === 'ws') await ws(qq);
    else if (sysMethod.config.qqBot_Outside.mode === 'http') await http(qq);
    return qq;
};

async function ws(qq) {
    const events = require('events');
    const eventS = new events.EventEmitter();
    const { randomUUID } = require('crypto');
    const listArr = [];
    /* ws监听地址  ws://192.168.31.192:9090/api/qq/ws */
    router.ws('/qq/ws', ws => {
        ws.on('message', msg => {
            const body = JSON.parse(msg);
            /* 拒绝心跳链接消息 */
            if (body.post_type === 'meta_event') return;
            // console.log('收到ws请求', body);
            if (body.echo) {
                for (const e of listArr) {
                    if (body.echo !== e.uuid) continue;
                    if (body.status && body.status === 'ok')
                        return e.eventS.emit(e.uuid, body.data.message_id.toString());
                    else return e.eventS.emit(e.uuid, '');
                }
            }
            /* 不是消息退出 */
            if (!body.post_type || body.post_type !== 'message') return;
            let msgInfo = {
                userId: body.sender.user_id + '' || '',
                userName: body.sender.nickname || '',
                groupId: body.group_id ? body.group_id + '' : '0',
                groupName: body.group_name || '',
                msg: body.raw_message || '',
                msgId: body.message_id + '' || '',
            };
            // console.log('最终消息：', msgInfo);
            qq.receive(msgInfo);
        });

        /* 发送消息方法 */
        qq.reply = async function (replyInfo) {
            try {
                let uuid = randomUUID();
                let body = {
                    action: 'send_msg',
                    params: {},
                    echo: uuid,
                };
                +replyInfo.groupId
                    ? (body.params.group_id = replyInfo.groupId)
                    : (body.params.user_id = replyInfo.userId);
                if (replyInfo.type === 'text') {
                    body.params.message = replyInfo.msg;
                } else if (replyInfo.type === 'image') {
                    body.params.message = `[CQ:image,file=${replyInfo.msg}]`;
                } else if (replyInfo.type === 'video') {
                    body.params.message = `[CQ:video,file=${replyInfo.msg}]`;
                }
                ws.send(JSON.stringify(body));
                return new Promise((resolve, reject) => {
                    console.log('发送消息了');
                    listArr.push({ uuid, eventS });
                    let timeoutID = setTimeout(() => {
                        delListens(uuid);
                        eventS.emit(uuid, '');
                    }, 60 * 1000);
                    eventS.once(uuid, res => {
                        try {
                            delListens(uuid);
                            clearTimeout(timeoutID);
                            resolve(res || '');
                        } catch (e) {
                            console.error(e);
                        }
                    });
                });
            } catch (e) {
                console.error('qq:发送消息失败', e);
            }
        };

        /* 推送消息 */
        qq.push = async function (replyInfo) {
            return await this.reply(replyInfo);
        };

        /* 注入删除消息方法 */
        qq.delMsg = async function (argsArr) {
            try {
                argsArr.forEach(e => {
                    if (typeof e !== 'string' && typeof e !== 'number') return false;
                    ws.send(
                        JSON.stringify({
                            action: 'delete_msg',
                            params: { message_id: e },
                        })
                    );
                });
                return true;
            } catch (e) {
                console.log('qq撤回消息异常', e);
                return false;
            }
        };
    });
    
    /**向/api/系统路由中添加路由 */
    router.get('/qq/ws', (req, res) =>
        res.send({ msg: '这是Bncr 外置qq Api接口，你的get请求测试正常~，请用ws交互数据' })
    );
    router.post('/qq/ws', async (req, res) =>
        res.send({ msg: '这是Bncr 外置qq Api接口，你的post请求测试正常~，请用ws交互数据' })
    );

    function delListens(id) {
        listArr.forEach((e, i) => e.uuid === id && listArr.splice(i, 1));
    }
}

async function http(qq) {
    const request = require('util').promisify(require('request'));
    /* 上报地址（gocq监听地址） */
    let senderUrl = sysMethod.config.qqBot_Outside.sendUrl;
    if (!senderUrl) {
        console.log('可爱猫:配置文件未设置sendUrl');
        qq = null;
        return;
    }

    /* 接受消息地址为： http://bncrip:9090/api/bot/qqHttp */
    router.post('/bot/qqHttp', async (req, res) => {
        res.send('ok');
        const body = req.body;
        // console.log('req', req.body);
        /* 心跳消息退出 */
        if (body.post_type === 'meta_event') return;
        // console.log('收到qqHttp请求', body);
        /* 不是消息退出 */
        if (!body.post_type || body.post_type !== 'message') return;
        let msgInfo = {
            userId: body.sender['user_id'] + '' || '',
            userName: body.sender['nickname'] || '',
            groupId: body.group_id ? body.group_id + '' : '0',
            groupName: body.group_name || '',
            msg: body['raw_message'] || '',
            msgId: body.message_id + '' || '',
        };
        qq.receive(msgInfo);
    });

    /**向/api/系统路由中添加路由 */
    router.get('/bot/qqHttp', (req, res) =>
        res.send({ msg: '这是Bncr 外置qq Api接口，你的get请求测试正常~，请用ws交互数据' })
    );
    router.post('/bot/qqHttp', async (req, res) =>
        res.send({ msg: '这是Bncr 外置qq Api接口，你的post请求测试正常~，请用ws交互数据' })
    );

    /* 回复 */
    qq.reply = async function (replyInfo) {
        try {
            let action = '/send_msg',
                body = {};
            +replyInfo.groupId ? (body['group_id'] = replyInfo.groupId) : (body['user_id'] = replyInfo.userId);
            if (replyInfo.type === 'text') {
                body.message = replyInfo.msg;
            } else if (replyInfo.type === 'image') {
                body.message = `[CQ:image,file=${replyInfo.msg}]`;
            } else if (replyInfo.type === 'video') {
                body.message = `[CQ:video,file=${replyInfo.msg}]`;
            }
            let sendRes = await requestPost(action, body);
            return sendRes ? sendRes.message_id : '0';
        } catch (e) {
            console.error('qq:发送消息失败', e);
        }
    };
    /* 推送消息 */
    qq.push = async function (replyInfo) {
        return await this.reply(replyInfo);
    };

    /* 注入删除消息方法 */
    qq.delMsg = async function (argsArr) {
        try {
            argsArr.forEach(e => {
                if (typeof e === 'string' || typeof e === 'number') {
                    requestPost('/delete_msg', { message_id: e });
                }
            });
            return true;
        } catch (e) {
            console.log('qq撤回消息异常', e);
            return false;
        }
    };

    /* 请求 */
    async function requestPost(action, body) {
        return (
            await request({
                url: senderUrl + action,
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: body,
                json: true,
            })
        ).body;
    }
}
