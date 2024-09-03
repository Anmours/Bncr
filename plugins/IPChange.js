/**
 * @author dinding
 * @name IPChange
 * @team dinding
 * @version 1.0.2
 * @rule ^IP变化通知$
 * @description IP变化通知，变化后自动执行代理“更换白名单”命令
 * @admin true
 * @public false
 * @priority 1000
 * @cron 0 *\/3 * * * *
 * @classification ["Server"]
 */
const log4js = require("log4js");
const log = log4js.getLogger("IPChange.js");
log.level = "info";

const urls = ["https://4.ipw.cn/", "https://ip.3322.net/", "https://cdid.c-ctrip.com/model-poc2/h"]; //多个api避免某一个失效导致脚本失败
const got = require("got");

module.exports = async (s) => {
    let sL = [];
    const djunDB = new BncrDB("djunDB");
    let ip = await djunDB.get("local_ip");
    let newip;
    for (let url of urls) {
        try {
            const req = await got.get(url);
            //todo: if json/multiLine
            const ipPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
            newip = req.body.match(ipPattern)[0];
        } catch (e) {
            log.error("api:" + url + "failed, try next one");
        }
        if (newip) break;
    }
    if (!newip) log.error(`failed to fetch ipv4 on all sites`);
    if (newip.split(".").length != 4) {
        return;
    }
    if (ip) {
        if (newip && newip != ip) {
            console.log(newip);
            await djunDB.set("local_ip", newip);
            await sysMethod.pushAdmin({
                platform: ["tgBot", "qq","wxKv"],
                type: "text",
                msg: "【IP变更通知】\n上次IP：" + ip + "\n当前IP：" + newip + "\n开始执行【更换白名单】命令",
            });
            //await sysMethod.inline("更换白名单"); //Doraemon的
            await sysMethod.inline("chwlst"); //我的
        } else {
            await djunDB.set("local_ip", newip);
        }
    }
};