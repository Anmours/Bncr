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
 * @priority 200
 */

module.exports = async () => {
    if (!sysMethod.config?.pgm?.enable) return sysMethod.startOutLogs('未启用pgm 退出.');
    const pgmDB = new BncrDB('pgm');
    const pgm = new Adapter('pgm');
    const events = require('events');
    const eventS = new events.EventEmitter();
    const { randomUUID } = require('crypto');
    const listArr = [];
    router.ws('/api/bot/pgmws', ws => {
        ws.on('message', async msg => {
            // console.log("msg"+msg)
            let body = JSON.parse(msg);
            let chat_id = body.chat.id;
            let msg_id = body.id;
            if (body.echo) {
                for (const e of listArr) {
                    if (body.echo !== e.uuid) continue;
                    if (body.status === 'ok')
                        return e.eventS.emit(e.uuid, msg_id + ":" + chat_id);
                    else return e.eventS.emit(e.uuid, '');
                }
            }
            // 忽略编辑的消息
            if (body.edit_date) {
                return;
            }

            let reply_to = body.id;
            let reply_to_sender_id = 0;
            let sender_id = body.from_user?.id || 0;
            let user_name = "";
            let chat_name = body.chat.title || "";
            let botId = body.bot_id || "0";
            let isGroup = body.is_group || "";
            let msgText = body.text || '';
            user_name = body.from_user?.first_name || "";
            user_name += body.from_user?.last_name || "";

            if (body?.reply_to_message_id)
                reply_to = body.reply_to_message_id
            if (body?.reply_to_message)
                reply_to = body.reply_to_message.id
            if (body?.reply_to_message?.text) {
                let ignoreWords = await pgmDB.get("ignoreWords");
                if (!(ignoreWords?.split("&") || [",id", ",re"]).includes(msgText)) {
                    msgText += body?.reply_to_message?.text;
                }
            }
            if (body?.reply_to_message?.from_user)
                reply_to_sender_id = body.reply_to_message.from_user.id
            let msgInfo = {
                userId: sender_id.toString() || '',
                userName: user_name || '',
                groupId: isGroup === 'True' ? chat_id.toString() : '0',
                groupName: chat_name || '',
                msg: msgText,
                msgId: msg_id + ":" + chat_id,
                isGroup: isGroup || "",
                replyTo: reply_to || "",
                replyToSenderId: reply_to_sender_id,
                botId: botId.toString(),
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
                body.params.chat_id = +replyInfo.groupId || +this?.msgInfo?.friendId || +replyInfo.userId;
                if (replyInfo.msgId)
                    body.params.reply_to_message_id = parseInt(replyInfo.msgId.split(":")[0]);
                else
                    body.params.reply_to_message_id = parseInt(replyInfo.toMsgId.split(":")[0]);
                body.params.message = replyInfo.msg;
                if (!replyInfo.type || replyInfo.type === "text") {
                    body.params.type = "text";
                    // console.log("msgInfo: " + JSON.stringify(this.msgInfo))
                    body.params.do_edit = replyInfo.msgId && replyInfo?.botId === replyInfo.userId ?
                        !replyInfo.dontEdit : false;
                } else if (replyInfo.type === "image" || replyInfo.type === "video" || replyInfo.type === "audio") {
                    body.params.path = replyInfo.path;
                    body.params.type = replyInfo.type;
                } else {
                    body.params.type = replyInfo.type;
                    body.params.do_edit = replyInfo.msgId && replyInfo?.botId === replyInfo.userId ?
                        !replyInfo.dontEdit : false;
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
                    if (!isNaN(msgId) && !isNaN(chatId)) {
                        ws.send(
                            JSON.stringify({
                                action: 'delete_msg',
                                params: { message_id: parseInt(msgId), chat_id: parseInt(chatId)},
                            })
                        );
                    } else {
                        console.log("pgm撤回消息异常", e);
                    }
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
