/**
 * @author dinding
 * @name SudailiSign
 * @team dinding
 * @version 1.0.0
 * @description 速代理签到插件
 * @rule ^(速代理签到)$
 * @admin true
 * @public false
 * @priority 9999
 * @disable false
 * @classification ["签到插件"]
 * @cron 0 26 16 * * *
 */

const jsonSchema = BncrCreateSchema.object({
  accounts: BncrCreateSchema.array(
    BncrCreateSchema.object({
      username: BncrCreateSchema.string().setTitle('用户名').setDescription('速代理账号用户名').setDefault(''),
      password: BncrCreateSchema.string().setTitle('密码').setDescription('速代理账号密码').setDefault(''),
      appkey: BncrCreateSchema.string().setTitle('AppKey').setDescription('速代理API的AppKey').setDefault(''),
    })
  ).setTitle('账户信息').setDescription('速代理账户信息数组').setDefault([]),
});

/* 完成后new BncrPluginConfig传递该jsonSchema */
const ConfigDB = new BncrPluginConfig(jsonSchema);

const axios = require('axios');

/**
 * 插件入口
 * @param {Sender} sender
 */
module.exports = async sender => {
  await ConfigDB.get();
  if (!Object.keys(ConfigDB.userConfig).length) {
    return await sender.reply('请先发送"修改无界配置",或者前往前端web"插件配置"来完成插件首次配置');
  }

  const accounts = ConfigDB.userConfig.accounts;

  if (!accounts.length) {
    return await sender.reply('请先配置速代理账户信息');
  }

  const combinedMessages = [];

  for (const account of accounts) {
    const { username, password, appkey } = account;

    const signResult = await sign(username, password);

    if (signResult) {
      const userData = await queryUserData(appkey);
      if (userData && 'data' in userData) {
        const userInfo = userData.data;
        const phone = userInfo.phoneNo || '未知手机号';
        const lastIp = userInfo.lastLoginIpAndPort || '未知上次IP';
        const loginIp = userInfo.registerIpAndPort || '未知登录IP';
        const score = Math.round(userInfo.currentScore || 0); // 四舍五入积分

        const userMessage = `
手机: ${phone}
上次IP: ${lastIp}
登录IP: ${loginIp}
积分: ${score}
        `.trim(); // 去除多余的空白字符

        const combinedMessage = `${signResult}\n${userMessage}`;
        combinedMessages.push(combinedMessage);
      } else {
        combinedMessages.push(`${signResult}\n用户信息获取失败`);
      }
    } else {
      combinedMessages.push(`用户 ${username}: 签到失败，未获取到相关用户信息`);
    }

    // 等待 20 秒，以防止请求过快
    await new Promise(resolve => setTimeout(resolve, 20000));
  }

  const finalMessage = combinedMessages.join('\n\n');
  if (finalMessage) {
    await sysMethod.pushAdmin({
                platform: ["qq","wxKv"],
                type: "text",
                msg: "速代理签到\n" + finalMessage,
            });
  } else {
    await sender.reply('推送内容为空！');
  }
};

const sign = async (username, password) => {
  const session = axios.create({
    maxRedirects: 5, // 启用重定向
  });

  const url = "http://www.sudaili.com/login.html";
  const res = await session.get(url, {
    validateStatus: false,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    }
  });

  console.log(`请求登录页面，状态码: ${res.status}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);
  
  if (!res.headers['set-cookie'] || !res.headers['set-cookie'][0]) {
    console.error(`未能获取到cookie，账号: ${username}`);
    return null;
  }

  const PHPSESSID = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
  const match = res.data.match(/name="__login_token__"\s+value="([a-f0-9]+)"/);
  if (!match) {
    console.error(`未能找到登录令牌，账号: ${username}`);
    return null;
  }
  const login_token = match[1];
  const login_form_data = new URLSearchParams({
    'account': username,
    'password': password,
    '__login_token__': login_token
  });

  const login_headers = {
    'Accept': '*/*',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Cookie': `PHPSESSID=${PHPSESSID};`,
    'User-Agent': 'Mozilla/5.0'
  };

  const login_response = await session.post(url, login_form_data, { headers: login_headers, validateStatus: false });
  console.log(`登录请求，状态码: ${login_response.status}`);
  console.log(`登录响应头: ${JSON.stringify(login_response.headers)}`);
  
  const token = login_response.headers['set-cookie'] ? login_response.headers['set-cookie'][0].split(';')[0].split('=')[1] : '';

  if (!token) {
    console.error(`登录失败，账号: ${username}`);
    return null;
  }

  const sign_url = "http://www.sudaili.com/index/user/signin.html";
  const sign_headers = {
    'Cookie': `PHPSESSID=${PHPSESSID}; token=${token};`,
    'User-Agent': 'Mozilla/5.0'
  };

  const sign_response = await session.get(sign_url, { headers: sign_headers, validateStatus: false });
  console.log(`签到请求，状态码: ${sign_response.status}`);
  
  if (sign_response.status === 500) {
    return `用户 ${username}: 你已经签过了❗`;
  } else if (sign_response.status === 200) {
    return `用户 ${username}: 签到成功✅`;
  } else {
    return `用户 ${username}: 签到失败，状态码: ${sign_response.status}⚠️`;
  }
};

const queryUserData = async (appkey) => {
  const url = `http://119.23.215.249:8081/userapi?appkey=${appkey}`;
  console.log(`请求用户数据，URL: ${url}`);
  const response = await axios.get(url, { validateStatus: false });
  if (response.status === 200) {
    console.log("用户数据请求成功");
    return response.data;
  } else {
    console.error(`请求接口失败，状态码: ${response.status}`);
    return null;
  }
};