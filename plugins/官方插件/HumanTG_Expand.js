/**
 * @author Aming
 * @name HumanTG_Expand
 * @team Bncr团队
 * @version v1.0.0
 * @description 拓展人行tg功能
 * @create_at 2034-10-29 19:27:24
 * @rule ^(\.id|\.re)
 * @rule ^(\.de) ([0-9]+)$
 * @priority 100000000
 * @admin true
 * @public true
 * @disable false
 * @classification []
 */

/* 
.id命令
读取所在会话中的id信息,回复某条消息则附加回复的id详情

.re命令
直接发.re转发自己最后发的一条消息
回复某消息发.re,则转发该条消息

.de命令
.de 5 删除自己在该会话中的最后5条发言

*/

module.exports = async s => {
    if (s.getFrom() !== 'HumanTG' || !(await s.isAdmin())) return;
    //群ID
    const from = s.getFrom(),
        userId = +s.getUserId(),
        userName = s.getUserName(),
        groupId = +s.getGroupId(),
        groupName = s.getGroupName(),
        msgId = +s.getMsgId(),
        friendId = +s.msgInfo.friendId,
        replyToMsgId = +s.msgInfo.replyToMsgId,
        ChatID = +groupId || +friendId || +userId,
        adminID = await new BncrDB('HumanTG').get('admin');
    switch (s.param(1)) {
        case '.id':
            let logs = `> 该条ID详细信息:\n`;
            friendId && (logs += `好友id:  \`${friendId}\`\n`);
            userId && (logs += `用户id:  \`${userId}\`\n`);
            userName && (logs += `用户名:  \`${userName}\`\n`);
            groupName && (logs += `群聊名:  \`${groupName}\`\n`);
            groupId && (logs += `群id:  \`${groupId}\`\n`);
            msgId && (logs += `消息id:  \`${msgId}\`\n`);
            if (replyToMsgId) {
                let info = await s.Bridge.getReplySendInfo(ChatID, replyToMsgId);
                logs += `\n> 被回复的消息ID详细信息:\n`;
                info?.bot && (logs += `是否bot: ${info?.bot}\n`);
                info?.id && (logs += `用户id:  \`${info?.id.toString()}\`\n`);
                info?.username && (logs += `用户名:  \`${info?.username}\`\n`);
                replyToMsgId && (logs += `消息id:  \`${replyToMsgId}\`\n`);
            }
            s.delMsg(await s.reply(logs), { wait: 10 });
            return;
        case '.de':
            let num = +s.param(2),
                info = await s.Bridge.getUserMsgId(ChatID, adminID, num + 1);
            info.length && s.delMsg(...info), s.delMsg(await s.reply(`已删除${info.length - 1}/${num}`), { wait: 3 });
            return;
        case '.re':
            s.delMsg(msgId);
            const toMsgid = replyToMsgId || (await s.Bridge.getUserMsgId(ChatID, adminID, 1))[0];
            toMsgid && s.Bridge.forwardMessages(ChatID, toMsgid, ChatID);
            return;
        default:
            break;
    }
};
