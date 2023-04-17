/**
 * This file is part of the App project.
 * @author YuanKK
 * @name pgm
 * @origin 空中楼阁
 * @version 1.0.0
 * @description pgm适配器
 * @adapter true
 * @public false
 * @disable false
 * @priority 3
 */

module.exports = async () => {
    if (!sysMethod.config.pgm || !sysMethod.config.pgm.enable) return sysMethod.startOutLogs('未启用pgm 退出.');
    const pgm = new Adapter('pgm');
    const events = require('events');
    const eventS = new events.EventEmitter();
    const { randomUUID } = require('crypto');
    const listArr = [];
    router.ws('/api/bot/pgmws', ws => {
        ws.on('message', msg => {
            // console.log("msg"+msg)
            let body = JSON.parse(msg);
            let chat_id = body.chat.id;
            let msg_id = body.id;
            // 忽略编辑的消息
            if (body.edit_date) {
                return;
            }
            if (body.echo) {
                for (const e of listArr) {
                    if (body.echo !== e.uuid) continue;
                    if (body.status && body.status === 'ok')
                        return e.eventS.emit(e.uuid, msg_id + ":" + chat_id);
                    else return e.eventS.emit(e.uuid, '');
                }
            }

            let reply_to = body.id;
            let reply_to_sender_id = 0;
            let sender_id = 0;
            let user_name = "";
            let chat_name = body.chat.title || "";
            let botId = body.bot_id || "0";
            let isGroup = body.is_group || "";
            if (body.from_user) {
                user_name = body.from_user.first_name;
                sender_id = body.from_user.id;
                if ("last_name" in body.from_user && body.from_user.last_name) {
                    user_name += "" + body.from_user.last_name;
                }
            }
            reply = body.reply_to_message;
            if (reply) {
                reply_to = reply.id
                if ("from_user" in reply && reply.from_user)
                    reply_to_sender_id = reply.from_user.id
            }
            if ("reply_to_message_id" in body && body.reply_to_message_id)
                reply_to = body.reply_to_message_id
            if ("reply_to_message" in body && body.reply_to_message)
                reply_to = body.reply_to_message.id
            if ("reply_to_message" in body && body.reply_to_message.from_user)
                reply_to_sender_id = body.reply_to_message.from_user.id
            let msgInfo = {
                userId: sender_id.toString() || '',
                userName: user_name || '',
                groupId: isGroup === 'True' ? chat_id.toString() : '0',
                groupName: chat_name || '',
                msg: body.text || '',
                msgId: msg_id + ":" + chat_id,
                isGroup: isGroup || "",
                replyTo: reply_to || "",
                replyToSenderId: reply_to_sender_id,
                botId:botId.toString(),
                friendId: chat_id.toString(),
            };
            // console.log(msgInfo);
            pgm.receive(msgInfo);
        });
        ws.on("connection", ws => {
            console.log("客户端链接成功: " + ws._ultron.id)
        });

        /* 发送消息方法 */
        pgm.reply = async function (replyInfo){
            try {
                let uuid = randomUUID();
                let body = {
                    action: 'send_msg',
                    params: {},
                    echo: uuid,
                };
                +replyInfo.groupId
                    ? (body.params.chat_id = parseInt(replyInfo.groupId))
                    : (body.params.chat_id = parseInt(replyInfo.friendId));
                if (replyInfo.msgId)
                    body.params.reply_to_message_id = parseInt(replyInfo.msgId.split(":")[0]);
                else
                    body.params.reply_to_message_id = parseInt(replyInfo.toMsgId.split(":")[0]);
                body.params.message = replyInfo.msg;
                if (!replyInfo.type || replyInfo.type === "text") {
                    body.params.type = "text";
                    // console.log("msgInfo: " + JSON.stringify(this.msgInfo))
                    body.params.do_edit = replyInfo.msgId && replyInfo.botId && replyInfo.botId === replyInfo.userId ?
                        !replyInfo.dontEdit : false;
                }
                else {
                    body.params.path = replyInfo.path;
                    body.params.type = replyInfo.type;
                }

                // console.log('推送消息运行了', body);
                ws.send(JSON.stringify(body));
                return new Promise((resolve, reject) => {
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
                console.error('pgm:发送消息失败', e, replyInfo);
            }
        };

        /* 推送消息 */
        pgm.push = async function (replyInfo) {
            return await this.reply(replyInfo);
        };

        /* 删除消息 */
        pgm.delMsg = async function (argsArr) {
            try {
                argsArr.forEach(e => {
                    if (!e && typeof e !== 'string' && typeof e !== 'number') return false;
                    let [msgId, chatId] = e.split(":")
                    ws.send(
                        JSON.stringify({
                            action: 'delete_msg',
                            params: { message_id: parseInt(msgId), chat_id: parseInt(chatId)},
                        })
                    );
                });
                return true;
            } catch (e) {
                console.log('pgm撤回消息异常', e);
                return false;
            }
        };

        pgm.Bridge= {
            editMsgMedia: async function (replyInfo, msgInfo) {
                if (Object.prototype.toString.call(replyInfo) === '[object Object]') {
                    let [msgId, chatId] = replyInfo.msgId.split(":");
                    if (msgInfo.botId === msgInfo.userId) {
                        ws.send(
                            JSON.stringify({
                                action: 'edit_message_media',
                                params: {
                                    message_id: parseInt(msgId),
                                    chat_id: parseInt(chatId),
                                    type: replyInfo.type,
                                    path: replyInfo.path,
                                    message: replyInfo.msg
                                },
                            })
                        );
                    } else console.log("没有权限编辑！！！")
                }
                return replyInfo.msgId;
            }
        };

        function delListens(id) {
            listArr.forEach((e, i) => e.uuid === id && listArr.splice(i, 1));
        }
    });
    return pgm;
};
