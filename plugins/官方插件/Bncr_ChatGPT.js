/**
 * @author Aming
 * @name Bncr_ChatGPT
 * @origin Bncr团队
 * @version 1.0.0
 * @description ChatGpt聊天 accessToken 版本
 * @rule ^ai ([\s\S]+)$
 * @admin false
 * @public false
 * @priority 9999
 * @disable false
 */

/* 
输入'ai ?'进行与ChatGPT互动。
脚本为每个用户创建单独的会话，可以保持上下文进行调教
ai 清空上下文将清空会话,重新创建新的会话
初次使用请 npm i chatgpt 安装依赖
初次使用 在ChatGPT官网登陆完成后，打开F12查看https://chat.openai.com/api/auth/session请求返回的accessToken
并使用命令'set ChatGPT Token ?'设置accessToken

本插件基于https://www.npmjs.com/package/chatgpt npm包实现，可以参考官方文档二改
*/

let api = {};

module.exports = async s => {
    const chatGPTStorage = new BncrDB('ChatGPT');
    const accessToken = await chatGPTStorage.get('Token');
    if (!accessToken) return s.reply("请使用命令'set ChatGPT Token ?,设置ChatGPT的accessToken");
    if (!api?.sendMessage) {
        const { ChatGPTUnofficialProxyAPI } = await import('chatgpt');
        api = new ChatGPTUnofficialProxyAPI({ accessToken });
        console.log('初始化ChatGPT...');
    }
    let platform = s.getFrom(),
        userId = s.getUserId();
    if (s.param(1) === '清空上下文') {
        await chatGPTStorage.del(`${platform}:${userId}`);
        return s.reply('清空上下文成功...');
    }
    let opt = {
        timeoutMs: 2 * 60 * 1000,
    };
    /* 获取上下文 */
    const getUesrInfo = await chatGPTStorage.get(`${platform}:${userId}`);
    if (getUesrInfo) {
        opt['conversationId'] = getUesrInfo.conversationId;
        opt['parentMessageId'] = getUesrInfo.parentMessageId;
        console.log('读取会话...');
    } else {
        console.log('创建新的会话...');
    }
    let res = {},
        maxNum = 5,
        logs = ``;

    do {
        try {
            res = await api.sendMessage(s.param(1), opt);
            if (!res?.text) {
                logs += `未获取到消息,去重试...\n`;
                continue;
            }
            logs += `回复:\n${res.text}\n`;
            break;
        } catch (e) {
            opt = {
                timeoutMs: 2 * 60 * 1000,
            };
            logs += '会话出现错误,尝试重新创建会话...\n';
            if (maxNum === 1) logs += '如果持续出现错误,请考虑accessToken是否过期,或者在控制台查看错误!\n';
            console.log('ChatGPT.js:', e);
            await sysMethod.sleep(1);
        }
    } while (maxNum-- > 1);
    if (!logs) return;
    await s.reply(`触发消息:${s.getMsg()}\n\n${logs}`);
    console.log('res', res);
    if (!res?.parentMessageId && !res?.conversationId) return;
    /* 存储上下文 */
    await chatGPTStorage.set(`${platform}:${userId}`, {
        parentMessageId: res.parentMessageId,
        conversationId: res.conversationId,
    });
};
