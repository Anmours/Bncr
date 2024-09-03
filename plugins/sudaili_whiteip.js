/**
 * @author dinding
 * @name sudaili_whiteip
 * @team dinding
 * @version 1.1.0
 * @rule ^chwlst$
 * @description 速代理白名单
 * @admin true
 * @public false
 * @priority 1000
 */
const suKey = ""; // 速代理key
const request = require("util").promisify(require("request"));
const got = require("got");
const DB = new BncrDB("djunDB");

module.exports = async (s) => {
    try {
        let newip = await DB.get("local_ip");
        console.log("Retrieved new IP:", newip);

        if (newip) {
            console.log("Starting to update white lists...");

            const [suResult, xiequResult] = await Promise.all([
                su(newip),
                xiequ(newip)
            ]);

            const adminNotice = suResult + xiequResult;
            console.log("Final admin notice:", adminNotice);
            
            sysMethod.pushAdmin({
                platform: ["wxKv"],
                type: "text",
                msg: "更换白名单结果：\n" + adminNotice,
            });
        } else {
            console.error("Failed to retrieve new IP address.");
        }
    } catch (error) {
        console.error("An error occurred:", error);
    }
//速代理
    async function su(newip) {
        let adminNotice = "";
        try {
            console.log("Starting su function");

            const suApi = "http://sudaili.com/whiteIP?op=list&appkey=" + suKey;
            let suWhiteList = await got(suApi).json();
            console.log("suWhiteList:", suWhiteList);

            for (const suWhiteIp of suWhiteList.data.list) {
                await request({
                    url: "http://sudaili.com/whiteIP?op=del&appkey=" + suKey + "&whiteip=" + suWhiteIp,
                    method: "get",
                });
                console.log("Deleted suWhiteIp:", suWhiteIp);
            }
            console.log("删除速代理旧ip成功");

            let sudata = await request({
                url: "http://sudaili.com/whiteIP?op=add&appkey=" + suKey + "&whiteip=" + newip,
                method: "get",
            });
            console.log("速代理添加新ip成功:", newip);
            adminNotice += `${newip} 速代理已添加\n`;
        } catch (error) {
            console.error("Error in su function:", error);
            adminNotice += `速代理白名单更新时发生错误：${error.message}\n`;
        }
        return adminNotice;
    }
//携趣代理
    async function xiequ(newip) {
        let adminNotice = "";
        try {
            console.log("Starting xiequ function");

            const xiequApi = "http://op.xiequ.cn/IpWhiteList.aspx?uid=85165&ukey=A1463668AC3D9E4BB0E9A4952176CA93&act=get";
            let xiequResponse = await got(xiequApi).text();
            console.log("xiequResponse:", xiequResponse);

            // 检查响应是否为单个 IP 地址
            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(xiequResponse.trim())) {
                console.log("xiequResponse is a single IP address");

                // 删除单个 IP 地址
                await request({
                    url: `http://op.xiequ.cn/IpWhiteList.aspx?uid=85165&ukey=A1463668AC3D9E4BB0E9A4952176CA93&act=del&ip=${xiequResponse.trim()}`,
                    method: "get",
                });
                console.log("Deleted xiequWhiteIp:", xiequResponse.trim());

                // 添加新 IP 地址
                let xiequdata = await request({
                    url: `http://op.xiequ.cn/IpWhiteList.aspx?uid=85165&ukey=A1463668AC3D9E4BB0E9A4952176CA93&act=add&ip=${newip}`,
                    method: "get",
                });
                console.log("携趣添加新ip成功:", newip);
                adminNotice += `${newip} 携趣已添加\n`;
            } else {
                // 尝试解析为 JSON
                let xiequWhiteList;
                try {
                    xiequWhiteList = JSON.parse(xiequResponse);
                    console.log("xiequWhiteList:", xiequWhiteList);

                    if (xiequWhiteList && xiequWhiteList.data && xiequWhiteList.data.length > 0) {
                        for (const xiequWhiteIp of xiequWhiteList.data) {
                            await request({
                                url: `http://op.xiequ.cn/IpWhiteList.aspx?uid=85165&ukey=A1463668AC3D9E4BB0E9A4952176CA93&act=del&ip=${xiequWhiteIp}`,
                                method: "get",
                            });
                            console.log("Deleted xiequWhiteIp:", xiequWhiteIp);
                        }
                        console.log("删除携趣旧ip成功");
                    } else {
                        console.log("No IPs to delete in xiequ white list or list is empty.");
                    }

                    let xiequdata = await request({
                        url: `http://op.xiequ.cn/IpWhiteList.aspx?uid=85165&ukey=A1463668AC3D9E4BB0E9A4952176CA93&act=add&ip=${newip}`,
                        method: "get",
                    });
                    console.log("携趣添加新ip成功:", newip);
                    adminNotice += `${newip} 携趣已添加\n`;
                } catch (parseError) {
                    throw new Error(`Failed to parse xiequ response: ${parseError.message}`);
                }
            }
        } catch (error) {
            console.error("Error in xiequ function:", error);
            adminNotice += `携趣白名单更新时发生错误：${error.message}\n`;
        }
        return adminNotice;
    }
};