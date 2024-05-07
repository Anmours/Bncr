/**
 * @author Merrick
 * @name wxWorkKF
 * @version 1.0.2
 * @description 微信客服适配器
 * @adapter true
 * @public false
 * @disable false
 * @priority 2
 * @Copyright ©2023 Merrick. All rights reserved
 */

/* 
v1.0.1 更换API为微信客服独立版，适配无界2.0 WEB界面
v1.0.2 修复bug，增加markdown、voice格式支持，在部分节点增加log输出，方便排查
*/

/* 配置构造器 */
const jsonSchema = BncrCreateSchema.object({
    enable: BncrCreateSchema.boolean().setTitle('是否开启适配器').setDescription(`设置为关则不加载该适配器`).setDefault(false),
    corpId: BncrCreateSchema.string().setTitle('企业ID').setDescription(`请填入“微信客服-开发配置”页面获取的企业ID`).setDefault(''),
    corpSecret: BncrCreateSchema.string().setTitle('Secret').setDescription(`请填入“微信客服-开发配置”页面获取的Secret`).setDefault(''),
    encodingAESKey: BncrCreateSchema.string().setTitle('encodingAESKey').setDescription(`请填入“微信客服-开发配置-回调配置”页面获取的的encodingAESKey`).setDefault('')
});
/* 配置管理器 */
const ConfigDB = new BncrPluginConfig(jsonSchema);
const got = require('got');
const { decrypt } = require('@wecom/crypto');
const xmlParse = require('xml2js').parseString;
const FormData = require('form-data');
const xmlparser = require('express-xml-bodyparser');

module.exports = async () => {
    /* 读取用户配置 */
    await ConfigDB.get();
    /* 如果用户未配置,userConfig则为空对象{} */
    if (!Object.keys(ConfigDB.userConfig).length) return sysMethod.startOutLogs('未启用wxWorkKF适配器，退出');
    if (!ConfigDB.userConfig.enable) return sysMethod.startOutLogs('未启用wxWorkKF适配器，退出');
    const encodingAESKey = ConfigDB.userConfig.encodingAESKey;
    if (!encodingAESKey) return console.log('未设置encodingAESKey');
    const corpId = ConfigDB.userConfig.corpId;
    if (!corpId) return console.log('未设置corpId');
    const corpSecret = ConfigDB.userConfig.corpSecret;
    if (!corpSecret) return console.log('未设置Secret');
    //这里new的名字将来会作为 sender.getFrom() 的返回值
    const wxWorkKF = new Adapter('wxWorkKF');
    const wxDB = new BncrDB('wxWorkKF');

    /**向/api/系统路由中添加路由 */
    router.use(xmlparser());
    router.get('/api/bot/wxWorkKF', (req, res) => {
        try {
            const params = req.query;
            const { message } = decrypt(encodingAESKey, params.echostr);
            return res.send(message);
        } catch (e) {
            console.error('对接模块出错', e);
            res.send({ msg: '这是Bncr wxWorkKF Api接口，你的get请求测试正常~，请用post交互数据' });
        }
    });

    router.post('/api/bot/wxWorkKF', async (req, res) => {
        try {
            // 接收到用户发送给客服的消息
            const body = req.body.xml;
            const xmlMsg = decrypt(encodingAESKey, body.encrypt[0]);
            const msgCursor = await wxDB.get('msgCursor', '');
            const botId = await wxDB.get('wxWorkKFBotId', ''); //自动设置，无需更改
            let msgJson = {};
            xmlParse (xmlMsg.message, function (err, result) { msgJson = result.xml });
            if (msgJson) res.send(''); 
            // 提取信息组成新的body发送给微信后台拉取消息的详细信息
            botID = msgJson.OpenKfId[0];
            reqBody = {
                "cursor": msgCursor,
                "token": msgJson.Token[0],
                "limit": 1000,
                "voice_format": 0,
                "open_kfid": botID
            };
            const resData = await getMsg(reqBody);
            if (!resData || resData.errcode !== 0) return console.log(resData);
            await wxDB.set('msgCursor', resData.next_cursor);
            const msgData = resData.msg_list.pop(); 
            if (!msgData) return;
            if (msgData && msgData.msgtype === 'event') return;
            let msgContent, msgId, usrId;
            if (msgData.msgtype === 'text') {
                msgContent = msgData.text.content;
                msgId = msgData.msgid;
                usrId = msgData.external_userid;
            }
            if (botId !== botID) await wxDB.set('wxWorkKFBotId', botID);
            console.log(`收到 ${usrId} 发送的微信客服消息 ${msgContent}`);
            let msgInfo = {
                userId: usrId || '',
                userName: '',
                groupId: '0',
                groupName: '',
                msg: msgContent || '',
                msgId: msgId || '',
                fromType: `Social`,
            }
            msgInfo && wxWorkKF.receive(msgInfo);         
        } catch (e) {
            console.error('接收消息模块出错', e);
            res.send('');
        }
    });

    wxWorkKF.reply = async function (replyInfo) {
        try {
            let body, mediaId;
            const botId = await wxDB.get('wxWorkKFBotId', '');
            switch (replyInfo.type) {
                case 'text':
                    body = {
                        "touser": replyInfo.userId,
                        "open_kfid": botId,
                        "msgtype": "text",
                        "text": {
                            "content": replyInfo.msg
                        }
                    };
                    break;
                case 'image':
                    mediaId = await getMediaID(replyInfo.path, 'image');
                    body = {
                        "touser": replyInfo.userId,
                        "msgtype": "image",
                        "open_kfid": botId,
                        "image": {
                            "media_id": mediaId
                        }
                    };
                    break;
                case 'video':
                    mediaId = await getMediaID(replyInfo.path, 'video');
                    body = {
                        "touser": replyInfo.userId,
                        "msgtype": "video",
                        "open_kfid": botId,
                        "video": {
                            "media_id": mediaId
                        }
                    };
                    break;
                case 'voice':
                    mediaId = await getMediaID(replyInfo.path, 'voice');
                    body = {
                        "touser": replyInfo.userId,
                        "msgtype": "voice",
                        "open_kfid": botId,
                        "voice": {
                            "media_id": mediaId
                        }
                    };
                    break;
                default:
                    return;
            }
            if (body) {
                let msgId = await sendMsg(body);
                // console.log(body, msgId);
                return msgId; //reply中的return 最终会返回到调用者
            }
        } catch (e) {
            console.error('回复消息模块出错', e);
            res.send('');
        }
    }
    /* 推送消息方法 */
    wxWorkKF.push = async function (replyInfo) {
        return this.reply(replyInfo);
    }

    /* 撤回消息方法 */
    wxWorkKF.delMsg = async function (msgId) {
        try {
            await getAccessToken();
            let accessToken = await wxDB.get('wxWorkKFToken', ''),
                url = `https://qyapi.weixin.qq.com/cgi-bin/kf/recall_msg?access_token=${accessToken}`,
                body = JSON.stringify({ "msgid": msgId[1], "open_kfid": botId});
            if (msgId) await got.post({url, body:body});
            return true;
        } catch (e) {
            console.error('撤回消息模块出错', e);
            return false;
        }
    }

    return wxWorkKF;

    async function getMsg(body) {
        const accessToken = await getAccessToken();
        try {
            const url = `https://qyapi.weixin.qq.com/cgi-bin/kf/sync_msg?access_token=${accessToken}`;
            let hasMore = 1,
                resJson = [];
            while (hasMore === 1) {
                resJson = await got.post({url, json:body}).json();
                hasMore = resJson.has_more;
            }
            return resJson;
        } catch (e) {
            console.error(`获取消息函数出错`, JSON.stringify(resJson));
        }
        
    }

    async function sendMsg(body) {
        const accessToken = await getAccessToken();
        try {
            const url = `https://qyapi.weixin.qq.com/cgi-bin/kf/send_msg?access_token=${accessToken}`;
            const resJson = await got.post({url, json:body}).json();
            if (resJson['errcode'] === 0) {
                return resJson.msgid;
            } else {
                console.log(`发送消息函数出错`, JSON.stringify(resJson));
            }
        } catch (e) {
            console.error(`发送消息函数出错`, e);
        }
    }

    async function getMediaID(mediaPath, mediaType) {
        try {
            // 获取Token生成上传url
            const accessToken = await getAccessToken();
            const url = `https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token=${accessToken}&type=${mediaType}`;
            // 获取网络图片文件流并上传到微信服务器
            const response = await got.get(mediaPath, { responseType: 'buffer' });
            const form = new FormData();
            form.append('media', response.body, { filename: 'media' }); // 设置文件名
            const formData = form.getBuffer(); // 获取表单数据
            const formHeaders = form.getHeaders(); // 获取表单头部
            const options = {
                body: formData,
                headers: {
                    ...formHeaders,
                    'Content-Length': formData.length // 必须设置 Content-Length
                },
                responseType: 'json' // 响应类型为 JSON
            };
            const resJson = await got.post(url, options);
            if (resJson.body.media_id) {
                return resJson.body.media_id;
            } else {
                console.log(`上传文件函数出错`, JSON.stringify(resJson.body));
            }
        } catch (e) {
            console.error(`上传文件函数出错`, e);
        }
    }

    async function getAccessToken () {
        const wxTokenExp = await wxDB.get('wxTokenExp', '');
        if (!wxTokenExp || wxTokenExp < Date.now()) {
            const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${corpSecret}`;
            try {
                const tkJson = await got.get(url).json();
                if (tkJson['access_token']) {
                    const expTime = Date.now() + (1.5 * 60 * 60 * 1000);
                    await wxDB.set('wxWorkKFToken', tkJson['access_token']);
                    await wxDB.set('wxTokenExp', expTime);
                    return tkJson.access_token;
                } else {
                    console.log(`获取Token函数出错`, JSON.stringify(tkJson));
                }
            } catch (e) {
                console.error(`获取Token函数出错`, e);
            }
        } else {
            const accessToken = await wxDB.get('wxWorkKFToken', '');
            return accessToken
        }
    }
}