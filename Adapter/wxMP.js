/**
 * @author Merrick
 * @name wxMP
 * @version 1.0.3
 * @description 微信公众号适配器
 * @adapter true
 * @public false
 * @disable false
 * @priority 2
 * @Copyright ©2023 Merrick. All rights reserved
 */

/* 
v1.0.0 实现未认证订阅号的基本功能，可以回复文本、图片、视频、语音
v1.0.1 1.修复回复视频出错的问题
       2.修复回复文本格式错乱的问题（未测）
       3.添加“拉取消息”功能，机器人回复多条消息时，发送“拉取消息”可以获取后面回复的消息
v1.0.2 优化消息拉取方式，提高响应，减少错漏
v1.0.3 1.添加关注公众号推送欢迎消息的功能，消息可以自定义
       2.优化控制台里的错误信息显示

注意：1.适配器只提供基本功能，可以用无界的官方命令测试，其他各种插件的问题请@插件作者适配
      2.服务号消息连续回复、自定义菜单等附件功能超出了个人订阅号的权限，因无法测试暂不添加
*/

/* 配置构造器 */
const jsonSchema = BncrCreateSchema.object({
    enable: BncrCreateSchema.boolean().setTitle('是否开启适配器').setDescription(`设置为关则不加载该适配器`).setDefault(false),
    appID: BncrCreateSchema.string().setTitle('AppID').setDescription(`请填入“设置与开发-基本配置”页面设置获取的AppID`).setDefault(''),
    appSecret: BncrCreateSchema.string().setTitle('AppSecret').setDescription(`请填入“设置与开发-基本配置”页面设置获取的AppSecret`).setDefault(''),
    mpToken: BncrCreateSchema.string().setTitle('Token').setDescription(`请填入“设置与开发-基本配置”页面设置的Token`).setDefault(''),
    encodingAESKey: BncrCreateSchema.string().setTitle('EncodingAESKey').setDescription(`请填入“设置与开发-基本配置”页面获取的的EncodingAESKey`).setDefault(''),
    pullMsgKeyword: BncrCreateSchema.string().setTitle('拉取消息指令').setDescription(`自定义填写拉取消息的指令，可以获取机器人回复的多条消息`).setDefault('拉取消息'),
    welcomText: BncrCreateSchema.string().setTitle('欢迎信息').setDescription(`设置用户第一次关注公众号时发送的欢迎信息`).setDefault('欢迎！')
});
/* 配置管理器 */
const ConfigDB = new BncrPluginConfig(jsonSchema);
const got = require('got');
const crypto = require('crypto');
const FormData = require('form-data');
const xmlparser = require('express-xml-bodyparser');
let msgQueue = [];

module.exports = async () => {
    /* 读取用户配置 */
    await ConfigDB.get();
    /* 如果用户未配置,userConfig则为空对象{} */
    if (!Object.keys(ConfigDB.userConfig).length) return sysMethod.startOutLogs('未配置wxMP适配器，退出');
    if (!ConfigDB.userConfig.enable) return sysMethod.startOutLogs('未启用wxMP适配器，退出');
    const encodingAESKey = ConfigDB.userConfig.encodingAESKey;
    if (!encodingAESKey) return console.log('未设置encodingAESKey');
    const mpToken = ConfigDB.userConfig.mpToken;
    if (!mpToken) return console.log('未设置Token');
    const appID = ConfigDB.userConfig.appID;
    if (!appID) return console.log('未设置AppID');
    const appSecret = ConfigDB.userConfig.appSecret;
    if (!appSecret) return console.log('未设置AppSecret');
    const pullMsgKeyword = ConfigDB.userConfig.pullMsgKeyword;
    const welcomText = ConfigDB.userConfig.welcomText;
    //这里new的名字将来会作为 sender.getFrom() 的返回值
    const wxMP = new Adapter('wxMP');
    const wxDB = new BncrDB('wxMP');
    let botId = await wxDB.get('wxMPBotId', '');

    /**向/api/系统路由中添加路由 */
    router.use(xmlparser());
    router.get('/api/bot/wxMP', (req, res) => {
        try {
            const data = req.query;
            if (Object.keys(data).length === 0) return res.send('这是Bncr wxMP Api接口，你的get请求测试正常~，请用post交互数据');
            const { signature, timestamp, nonce, echostr } = data;
            const token = mpToken;
            const list = [token, timestamp, nonce];
            list.sort();
            const sha1 = crypto.createHash('sha1');
            sha1.update(list.join(''));
            const hashcode = sha1.digest('hex');
            // console.log("handle/GET func: hashcode, signature: ", hashcode, signature);
            if (hashcode === signature) {
                return res.send(echostr);
            } else {
                return res.send('');
            }
        } catch (e) {
            console.error('对接模块出错', e);
            res.send('这是Bncr wxMP Api接口，你的get请求测试正常~，请用post交互数据');
        }
    });

    router.post('/api/bot/wxMP', async (req, res) => {
        try {
            const body = req.body.xml;
            const {
                tousername: [mpId],
                fromusername: [usrId],
                msgtype: [msgType]
            } = body;
            const msgContent = body?.content?.[0];
            const event = body?.event?.[0];
            const msgId = body?.msgid?.[0];
            if (botId !== mpId) await wxDB.set('wxMPBotId', mpId);
            if (msgContent) console.log(`收到 ${usrId} 发送的公众号消息 ${msgContent}`);
            if (msgType === 'event' && event === 'subscribe') {
                const welcomMsg = `<xml>
                    <ToUserName><![CDATA[${usrId}]]></ToUserName>
                    <FromUserName><![CDATA[${botId}]]></FromUserName>
                    <CreateTime>${Date.now()}</CreateTime>
                    <MsgType><![CDATA[text]]></MsgType>
                    <Content><![CDATA[${welcomText}]]></Content>
                </xml>`;
                res.send(welcomMsg);
                return;
            } else if (msgType !== 'text') {
                res.send('success');
                return;
            }
            if (msgContent === pullMsgKeyword) {
                const dbmsg = getReply();
                if (dbmsg) return res.send(dbmsg);
            }
            msgQueue = [];
            let msgInfo = {
                userId: usrId || '',
                userName: '',
                groupId: '0',
                groupName: '',
                msg: msgContent || '',
                msgId: msgId || '',
                fromType: `Social`,
            };
            msgInfo && wxMP.receive(msgInfo);
            let replyMsg;
            for (let i=0; i<8; i++ ) {
                replyMsg = msgQueue.shift();
                if (replyMsg) break;
                await sysMethod.sleep(0.5);
            }
            if (replyMsg) {
                res.send(replyMsg);
            } else {
                res.send('success');
            }
            return;
        } catch (e) {
            console.error('接收消息模块出错', e);
            res.send('');
        }
    });

    wxMP.reply = async function (replyInfo) {
        try {
            let body, mediaId;
            const usrId = replyInfo.userId;
            botId = await wxDB.get('wxMPBotId', '');
            switch (replyInfo.type) {
                case 'text':
                    // replyInfo.msg = replyInfo.msg.replace(/\n/g, '\r');
                    body = `<xml>
                        <ToUserName><![CDATA[${usrId}]]></ToUserName>
                        <FromUserName><![CDATA[${botId}]]></FromUserName>
                        <CreateTime>${Date.now()}</CreateTime>
                        <MsgType><![CDATA[text]]></MsgType>
                        <Content><![CDATA[${replyInfo.msg}]]></Content>
                    </xml>`;
                    break;
                case 'image':
                    mediaId = await getMediaID(replyInfo.path, 'image');
                    body = `<xml>
                        <ToUserName><![CDATA[${usrId}]]></ToUserName>
                        <FromUserName><![CDATA[${botId}]]></FromUserName>
                        <CreateTime>${Date.now()}</CreateTime>
                        <MsgType><![CDATA[image]]></MsgType>
                        <Image><MediaId><![CDATA[${mediaId}]]></MediaId></Image>
                    </xml>`;
                    break;
                case 'video':
                    mediaId = await getMediaID(replyInfo.path, 'video');
                    body = `<xml>
                        <ToUserName><![CDATA[${usrId}]]></ToUserName>
                        <FromUserName><![CDATA[${botId}]]></FromUserName>
                        <CreateTime>${Date.now()}</CreateTime>
                        <MsgType><![CDATA[video]]></MsgType>
                        <Video><MediaId><![CDATA[${mediaId}]]></MediaId></Video>
                    </xml>`;
                    break;
                case 'voice':
                    mediaId = await getMediaID(replyInfo.path, 'voice');
                    body = `<xml>
                        <ToUserName><![CDATA[${usrId}]]></ToUserName>
                        <FromUserName><![CDATA[${botId}]]></FromUserName>
                        <CreateTime>${Date.now()}</CreateTime>
                        <MsgType><![CDATA[voice]]></MsgType>
                        <Voice><MediaId><![CDATA[${mediaId}]]></MediaId></Voice>
                    </xml>`;
                    break;
                default:
                    return;
            }
            if (body) {
                msgQueue.push(body);
                return;
                // return msgId; //reply中的return 最终会返回到调用者
            }
        } catch (e) {
            console.error('回复消息模块出错', e);
            res.send('');
        }
    }

    /* 推送消息方法 */
    wxMP.push = () => {};

    wxMP.delMsg = () => {};

    return wxMP;

    function getReply() {
        const arr = [msgQueue.shift(), msgQueue.length];
        if (arr[0]) {
            const keyStr = '<Content><![CDATA[';
            const insertIndex = arr[0].indexOf(keyStr) + keyStr.length;
            const insertStr = `获取到新消息，剩余消息${arr[1]}条\n\n`;
            const reStr = arr[0].substring(0, insertIndex) + insertStr + arr[0].substring(insertIndex);
            return reStr;
        }
    }

    async function getMediaID(mediaPath, mediaType) {
        try {
            // 获取Token生成上传url
            const accessToken = await getAccessToken();
            const url = `https://api.weixin.qq.com/cgi-bin/media/upload?access_token=${accessToken}&type=${mediaType}`;
            // 获取网络图片文件流并上传到微信服务器
            let ext = 'jpg';
            const match = mediaPath.match(/\.[^./?#]+$/);
            if (match) ext = match[0].substring(1);
            const response = await got.get(mediaPath, { responseType: 'buffer' });
            const form = new FormData();
            form.append('media', response.body, { filename: `media.${ext}` }); // 设置文件名
            const formData = form.getBuffer(); // 获取表单数据
            const formHeaders = form.getHeaders(); // 获取表单头部
            const options = {
                body: formData,
                headers: formHeaders,
                // responseType: 'json' // 响应类型为 JSON
            };
            const resJson = await got.post(url, options).json();
            if (resJson?.media_id) {
                return resJson.media_id;
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
            const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appID}&secret=${appSecret}`;
            try {
                const tkJson = await got.get(url).json();
                if (tkJson?.access_token) {
                    const expTime = Date.now() + (1.5 * 60 * 60 * 1000);
                    await wxDB.set('wxMPToken', tkJson['access_token']);
                    await wxDB.set('wxTokenExp', expTime);
                    return tkJson.access_token;
                } else {
                    console.log(`获取Token函数出错`, JSON.stringify(tkJson));
                }
            } catch (e) {
                console.error(`获取Token函数出错`,e);
            }
        } else {
            const accessToken = await wxDB.get('wxMPToken', '');
            return accessToken
        }
    }
}