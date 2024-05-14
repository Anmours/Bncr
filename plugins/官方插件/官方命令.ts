/**
 * @author Aming
 * @name 官方命令
 * @team Bncr团队
 * @version 3.0.0
 * @description 官方命令
 * @rule ^(重启|bncr版本|bncr状态|启动时间|机器码)$
 * @rule ^(编辑测试|撤销测试|推送消息测试|来个图片|来个视频|推送图片测试|推送管理员测试)$
 * @rule ^(监听该群|屏蔽该群|回复该群|不回复该群|拉黑这个b|拉出小黑屋)$
 * @rule ^(eval) ([^\n]+)$
 * @rule ^(name|time|我的id|群id)$
 * @rule ^(等待) ([^ \n]+)$
 * @rule ^(get|del) ([^ \n]+) ([^ \n]+)$
 * @rule ^(set) ([^ \n]+) ([^ \n]+) ([\s\S]+)$
 * @rule ^(npm i) ([^\n]+)$
 * @admin false
 * @priority 9999
 * @classification ["官方命令"]
 * @public true
 * @disable false
 */

import fs from 'fs';
import path from 'path';

module.exports = async (s: Sender) => {
  let sysDB = new BncrDB('system'),
    param1 = s.param(1),
    param2 = s.param(2),
    param3 = s.param(3),
    param4 = s.param(4),
    param5 = s.param(5),
    userId = s.getUserId(),
    groupId = s.getGroupId(),
    from = s.getFrom();
  switch (param1) {
    case 'npm i':
      if (!(await s.isAdmin())) return;
      await s.reply(`去安装模块:\n${s.param(2)}\n\n安装中......`);
      let resStr = await sysMethod.npmInstall(s.param(2) as string);
      s.reply(`命令:\n${s.getMsg()}\n安装日志:\n${resStr.data}`);
      break;
    case '监听该群':
      if (!(await s.isAdmin())) return;
      if (!groupId || groupId === '0') return s.reply('非群组禁用');
      //异步设置
      new BncrDB('groupWhitelist').set(`${from}:${groupId}`, true);
      return s.reply('ok');
      break;
    case '屏蔽该群':
      if (!(await s.isAdmin())) return;
      if (!groupId || groupId === '0') return s.reply('非群组禁用');
      //异步设置
      new BncrDB('groupWhitelist').del(`${from}:${groupId}`);
      return s.reply('ok');
      break;
    case '不回复该群':
      if (!(await s.isAdmin())) return;
      if (!groupId || groupId === '0') return s.reply('非群组禁用');
      //同步设置
      const tempValue = await new BncrDB('noReplylist').set<boolean>(`${from}:${groupId}`, true);
      return s.reply(tempValue ? 'ok' : '失败');
      break;
    case '回复该群':
      if (!(await s.isAdmin())) return;
      if (!+groupId) return s.reply('非群组禁用');
      const tempValues = await new BncrDB('noReplylist').set<boolean>(`${from}:${groupId}`, false);
      return s.reply(tempValues ? 'ok' : '失败');
      break;
    case '拉黑这个b':
      if (!(await s.isAdmin())) return;
      if (from !== 'HumanTG') return s.reply('非HumanTG禁用');
      if (!+s?.msgInfo?.friendId!) return s.reply('未读取到好友id');
      if (+groupId) return s.reply('群组禁用，该功能只能对私聊使用');
      return s.reply((await new BncrDB('userBlacklist').set(`${from}:${s.msgInfo.friendId}`, true)) ? '已拉黑这个b' : '拉黑失败');
      break;
    case '拉出小黑屋':
      if (!(await s.isAdmin())) return;
      if (from !== 'HumanTG') return s.reply('非HumanTG禁用');
      if (!+s?.msgInfo?.friendId!) return s.reply('未读取到好友id');
      return s.reply((await new BncrDB('userBlacklist').set(`${from}:${s.msgInfo.friendId}`, false)) ? '已拉出小黑屋' : '拉出小黑屋失败');
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
      if (s.getFrom() === 'tgBot') await sysMethod.sleep(1);
      process.exit(300);
      break;
    case '启动时间':
      if (!(await s.isAdmin())) return;
      await s.reply((await sysDB.get<string>('startTime')) as string);
      break;
    case 'bncr版本':
      if (!(await s.isAdmin())) return;
      await s.reply(`bncr版本:${await sysDB.get('Version')}`);
      break;
    case 'time':
      await s.reply(sysMethod.getTime('yyyy-MM-dd hh:mm:ss') as string);
      break;
    case 'name':
      if (!(await s.isAdmin())) return;
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
      // console.log(await s.isAdmin());
      if (!(await s.isAdmin())) return;
      try {
        if (!param2 || !param3) return;
        let val = await new BncrDB(param2).get(param3);
        console.log('val', val);
        typeof val === 'object' ? ((val = JSON.stringify(val)) as string) : val;
        await s.reply(val ? val.toString() : '空值');
      } catch (e) {
        await s.reply((e as Error)?.message || '未知错误');
      }
      break;
    case 'set':
      if (!(await s.isAdmin())) return;
      if (!param2 || !param3 || !param4) return;
      if (param4 === 'false') param4 = false as any;
      else if (param4 === 'true') param4 = true as any;
      let db = new BncrDB(param2);
      let nowVal = await db.get(param3, '');
      await s.reply((await db.set(param3, param4)) ? '设置成功，你可以在30秒内“撤销”操作！' : '设置失败');
      let input = await s.waitInput(() => {}, 30);
      if (!input) return;
      else if (input.getMsg() === '撤销') input.reply((await db.set(param3, nowVal)) ? '已撤销' : '撤销失败');
      else s.inlineSugar(input.getMsg()); //代替用户发送消息至框架内部，

      break;
    case 'del':
      if (!(await s.isAdmin())) return;
      if (!param2 || !param3) return;
      await s.reply(`确认删除[${param2} ${param3}]?\n确认回复y,其他任意值取消`);
      let YoN = await s.waitInput(() => {}, 60);
      if (YoN && YoN.getMsg() === 'y') return await s.reply((await new BncrDB(param2).del(param3)) ? '成功' : '失败');
      return s.reply('已取消');
      break;
    case 'eval':
      if (!(await s.isAdmin())) return;
      try {
        let res = await eval(param2 as string);
        await s.reply('Eval 结果:' + res);
        console.log(res);
      } catch (e) {
        console.log(e);
      }
      break;
    case '等待':
      if (!(await s.isAdmin())) return;
      console.log('等待:', param2, '秒');
      await sysMethod.sleep(param2 as any);
      console.log('等待结束');
      break;
    case '编辑测试':
      if (!(await s.isAdmin())) return;
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
      if (!(await s.isAdmin())) return;
      let sendid = await s.reply('即将删除该消息');
      console.log('sendid', sendid);
      //异步删除消息 挂到后台等待设定的时间，不会阻塞当前进程
      // console.log('s.getMsgId()',s.getMsgId());
      s.delMsg(s.getMsgId(), sendid, { wait: 5 });
      break;
    case '来个图片':
      if (!(await s.isAdmin())) return;
      let jpgURL: string;
      /* 处理本地文件 */
      /* 发送本地文件 : qqwx 支持本机url地址发送，tgBot和人行必须要文件绝对路径*/
      if (s.getFrom() === 'tgBot' || s.getFrom() === 'HumanTG') jpgURL = path.join(process.cwd(), `BncrData/public/OIP-C.jpg`);
      else jpgURL = `http://192.168.31.192:9090/public/OIP-C.jpg`;

      await s.reply({
        type: 'image',
        /* 发送网络图片 */
        path: 'https://pic3.zhimg.com/v2-58d652598269710fa67ec8d1c88d8f03_r.jpg',
        msg: '图来啦~',
        // msg: jpgURL,
      });

      break;
    case '来个视频':
      if (!(await s.isAdmin())) return;
      console.log(
        await s.reply({
          type: 'video',
          /* 发送网络视频 */
          path: 'https://txmov2.a.yximgs.com/upic/2020/02/21/10/BMjAyMDAyMjExMDUwNDFfMzc0ODkwODM4XzIzODI0NzAzNjIxXzFfMw==_b_Bfa350be2d39dac0304141571e8ab92ed.mp4',
          msg: '视频来啦~',
        })
      );
      break;
    case '推送消息测试':
      if (!(await s.isAdmin())) return;

      //推送消息
      console.log(
        await sysMethod.push({
          platform: 'tgBot',
          groupId: `0`,
          userId: `1629887728`,
          msg: '这是一条推送消息',
        })
      );
      break;
    case '推送图片测试':
      if (!(await s.isAdmin())) return;

      //推送消息
      console.log(
        await sysMethod.push({
          platform: 'tgBot',
          groupId: `0`,
          userId: `1629887728`,
          msg: '这是一条推送的图片消息',
          path: 'https://pic3.zhimg.com/v2-58d652598269710fa67ec8d1c88d8f03_r.jpg?source=1940ef5c',
          type: 'image',
        })
      );
      break;
    case '推送管理员测试':
      if (!(await s.isAdmin())) return;

      sysMethod.pushAdmin({
        platform: [],
        msg: `这是通知管理员的消息`,
      });
      break;
    case 'bncr状态':
      if (!(await s.isAdmin())) return;
      let logs = ``,
        bncrMem = process.memoryUsage(),
        a = ``,
        startTimes = (await sysDB.get('startTime')) as string;
      for (const e of fs.readdirSync(path.join(process.cwd(), 'BncrData/db'))) {
        if (e.search(/\.(ts|js)/) !== -1) continue;
        const dbPath = path.join(process.cwd(), `BncrData/db/${e}`);
        const dbStat = fs.statSync(dbPath);
        if (e.search(/\.db/) !== -1) {
          a += `${e}: ${Math.floor((dbStat.size / 1024 / 1024) * 100) / 100}MB\n`;
        } else if (dbStat.isDirectory()) {
          a += `${e}: ${Math.floor((getFolderSize(dbPath) / 1024 / 1024) * 100) / 100}MB\n`;
        }
      }
      logs += `Bncr版本: ${await sysDB.get('Version')}

占用内存: ${Math.floor((bncrMem.rss / 1024 / 1024) * 100) / 100}MB

数据库:
${a || '无数据库信息\n'}
启动时间: ${startTimes}
运行时长: ${intervalTime(new Date(startTimes).getTime())}
`;
      s.delMsg(await s.reply(logs), { wait: 15 });
      break;
    default:
      break;
  }
};

//计算两个时间之间的时间差 多少天时分秒
function intervalTime(startTime: number, endTime = new Date().getTime()) {
  let date = endTime - startTime, //时间差的毫秒数
    //计算出相差天数
    days = Math.floor(date / (24 * 3600 * 1000)),
    //计算出小时数
    leave1 = date % (24 * 3600 * 1000),
    //计算天数后剩余的毫秒数
    hours = Math.floor(leave1 / (3600 * 1000)),
    //计算相差分钟数
    leave2 = leave1 % (3600 * 1000),
    //计算小时数后剩余的毫秒数
    minutes = Math.floor(leave2 / (60 * 1000)),
    //计算相差秒数
    leave3 = leave2 % (60 * 1000),
    //计算分钟数后剩余的毫秒数
    seconds = Math.round(leave3 / 1000),
    logs = ``;
  days && (logs += `${days}天`);
  hours && (logs += `${hours}时`);
  minutes && (logs += `${minutes}分`);
  seconds && (logs += `${seconds}秒`);
  return logs;
}

// 递归计算文件夹大小的函数
function getFolderSize(folderPath: string) {
  let totalSize = 0;

  // 同步读取文件夹内容
  const files = fs.readdirSync(folderPath);

  // 遍历文件夹中的每个文件/子文件夹
  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);

    // 如果是子文件夹，则递归计算其大小
    if (stats.isDirectory()) {
      totalSize += getFolderSize(filePath);
    } else {
      // 如果是文件，则累加文件大小
      totalSize += stats.size;
    }
  });

  return totalSize;
}
