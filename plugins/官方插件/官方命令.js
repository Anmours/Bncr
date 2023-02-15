/**
 * @author Aming
 * @name 官方命令
 * @version 1.0.5
 * @description 官方命令
 * @platform tgBot qq ssh HumanTG wxQianxun
 * @rule ^(重启|bncr版本|启动时间|机器码)$
 * @rule ^(编辑测试|撤销测试|推送消息测试|来个图片)$
 * @rule ^(监听该群|屏蔽该群|回复该群|不回复该群)$
 * @rule ^(eval) ([^\n]+)
 * @rule ^(name|time|我的id|群id)$
 * @rule ^(等待) ([^ \n]+)
 * @rule ^(get|del) ([^ \n]+) ([^ \n]+)
 * @rule ^(set) ([^ \n]+) ([^ \n]+) ([^ \n]+)
 * @admin true
 * @public false
 * @priority 9999
 * @disable false
 */


module.exports = async sender => {
    /* HideStart */
    const path = require('path');
    let s = sender;
    let sysDB = new BncrDB('system');
    let param1 = s.param(1),
        param2 = s.param(2),
        param3 = s.param(3),
        param4 = s.param(4),
        param5 = s.param(5),
        userId = s.getUserId(),
        groupId = s.getGroupId(),
        from = s.getFrom();
    // console.log('插件执行了');
    // console.log('插件执行了');
    /* HideEnd */
    switch (param1) {
        case '监听该群':
            if (!groupId || groupId === '0') return s.reply('非群组禁用');
            //异步设置
            new BncrDB('groupWhitelist').set(`${from}:${groupId}`, true);
            return s.reply('ok');
            break;
        case '屏蔽该群':
            if (!groupId || groupId === '0') return s.reply('非群组禁用');
            //异步设置
            new BncrDB('groupWhitelist').del(`${from}:${groupId}`);
            return s.reply('ok');
            break;
        case '不回复该群':
            if (!groupId || groupId === '0') return s.reply('非群组禁用');
            //同步设置
            return s.reply(await new BncrDB('noReplylist').set(`${from}:${groupId}`, true, { def: 'ok' }));
            break;
        case '回复该群':
            if (!groupId || groupId === '0') return s.reply('非群组禁用');
            return s.reply(await new BncrDB('noReplylist').del(`${from}:${groupId}`, 'ok'));
            break;
        case '重启':
            if (!(await s.isAdmin())) return;
            console.log('重启中....');
            await sysDB.set('restartInfo', {
                platform: s.getFrom(),
                msg: '重启完成', //重启完成回复语
                userId: s.getUserId(),
                groupId: s.getGroupId(),
                toMsgId: s.getMsgId(),
            });
            if (s.getFrom() === 'tgBot') await sysMethod.sleep(2);
            process.exit(300);
            break;
        case '启动时间':
            if (!(await s.isAdmin())) return;
            await s.reply(await sysDB.get('startTime'));
            break;
        case 'bncr版本':
            if (!(await s.isAdmin())) return;
            await s.reply(await sysDB.get('Version'));
            break;
        case 'time':
            await s.reply(sysMethod.getTime('yyyy-MM-dd hh:mm:ss'));
            break;
        case 'name':
            await s.reply(await sysDB.get('name', '空值'));
            break;
        case '机器码':
            if (!(await s.isAdmin())) return;
            await s.reply(await sysDB.get('machineId', '空值'));
            break;
        case '我的id':
            await s.reply(userId);
            break;
        case '群id':
            await s.reply(groupId);
            break;
        case 'get':
            if (!(await s.isAdmin())) return;
            try {
                if (!param2 || !param3) return;
                let val = await new BncrDB(param2).get(param3, '空值');
                typeof val === 'object' ? (val = JSON.stringify(val)) : val;
                await s.reply(val);
            } catch (e) {
                await s.reply(e.toString());
            }
            break;
        case 'set':
            if (!(await s.isAdmin())) return;
            if (!param2 || !param3 || !param4) return;
            if (param4 === 'false') param4 = false;
            else if (param4 === 'true') param4 = true;
            let db = new BncrDB(param2);
            let nowVal = await db.get(param3, '');
            await s.reply(await db.set(param3, param4, { def: '设置成功，你可以在30秒内“撤销”操作！' }));
            let input = await s.waitInput(() => { }, 30);
            input && input.getMsg() === '撤销'
                ? input.reply(await db.set(param3, nowVal, { def: '已撤销' }))
                : s.reply('已保存');
            break;
        case 'del':
            if (!(await s.isAdmin())) return;
            if (!param2 || !param3) return;
            await s.reply(`确认删除[${param2} ${param3}]?\n确认回复y,其他任意值取消`);
            let YoN = await s.waitInput(() => { }, 60);
            if (YoN && YoN.getMsg() === 'y') return await s.reply(await new BncrDB(param2).del(param3, '成功'));
            return s.reply('已取消');
            break;
        case 'eval':
            if (!(await s.isAdmin())) return;
            try {
                let res = await eval(param2);
                await s.reply('Eval 结果:' + res);
                console.log(res);
            } catch (e) {
                console.log(e);
            }
            break;
        case '等待':
            console.log('等待:', param2, '秒');
            await sysMethod.sleep(param2);
            console.log('等待结束');
            break;
        case '编辑测试':
            if (s.getFrom() === 'HumanTG') {
                let log = `编辑中\n`;
                let logs = ``;
                for (let i = 0; i < 5; i++) {
                    if (i === 4) log = `编辑完成\n`;
                    logs += `第${i + 1}条消息\n`;
                    await s.reply(log + logs);
                    await sysMethod.sleep(1);
                }
                //等待2秒
                await sysMethod.sleep(2);
                await s.reply(log + logs + '\n即将删除该消息');
                //同步删除消息
                await s.delMsg(s.getMsgId(), { wait: 2 });
            }
            break;
        case '撤销测试':
            if (s.getFrom() === 'HumanTG') {
                await s.reply('即将删除该消息');
                //异步删除消息 挂到后台等待设定的时间，不会阻塞当前进程
                s.delMsg(s.getMsgId(), { wait: 2 });
            }
            break;
        case '来个图片':
            await s.reply({
                type: 'image',
                // msg: 'https://pic3.zhimg.com/v2-58d652598269710fa67ec8d1c88d8f03_r.jpg?source=1940ef5c',
                msg: 'http://192.168.31.192:9090/public/OIP-C.jpg',
            });
            break;
        case '推送消息测试':
            //推送消息
            await sysMethod.push({
                platform: 'tgBot',
                groupId: `-1001704263871`,
                userId: `1629887728`,
                msg: '这是一条推送消息',
            });
            break;
        default:
            break;
    }
};
