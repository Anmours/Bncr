/**
 * @author Aming
 * @name 迁移Nedb数据至Level
 * @team 官方
 * @version 1.0.1
 * @description 迁移1.x Nedb数据库至Level 2.x及以后无需迁移
 * @rule ^(迁移Nedb数据至Level|qysj)$
 * @admin true
 * @public true
 * @priority 9999
 * @disable false
 * @classification []
 */
import NeDB from 'nedb';
const path = require('path');

module.exports = async (sender: Sender) => {
  /* 迁移速度视数据库大小而定 */
  /* userdb实例 载入1.x数据库 */
  const userDB = new NeDB({
    autoload: true,
    timestampData: true,
    onload: (e: Error | null) => {
      e && console.log(e);
    },
    filename: path.join(process.cwd(), `BncrData/db/user.db`),
  });
  /* 设定30分钟压缩一次数据库 */
  userDB.persistence.setAutocompactionInterval(30 * 1000 * 60);
  /* 使用包装 数据库 */
  let nedb = new BncrDB('x', {
    /*registerName 注册到全局数据库的名称，第一次注册数据库，会把整个对象缓存到全局的DatabaseInstantiationObject对象中
    下次第二参直接DatabaseInstantiationObject[nedbDB_uesr.db]
     */
    registerName: 'nedbDB_uesr.db',
    /* useMiddlewarePath 使用哪个中间件处理该数据库 */
    useMiddlewarePath: 'db/Nedb.ts',
    /* db可选一个实例，如果不传递该字段，则使用中间件中的默认数据库 */
    db: userDB,
  });

  /* 读取旧库中所有表 */
  const nedbAllForm = await nedb.getAllForm();
  /* 创建空的存储器 */
  const res: { [key: string]: any[] } = {};
  /* 遍历表 */
  for (const form of nedbAllForm) {
    /* 获取key */
    const formDB = new BncrDB(
      form,
      /* 开发者应该充分考虑DatabaseInstantiationObject缓存中是否已有实例，应优先使用缓存实例，否则过渡重复加载数据库会影响性能 */
      global.DatabaseInstantiationObject?.['nedbDB_uesr.db'] || {
        /* 注册到全局数据库的名称 */
        registerName: 'nedbDB_uesr.db',
        /* 使用的数据库中间件 */
        useMiddlewarePath: 'db/Nedb.ts',
        /* db可选参数，传递一个实例，如果不传递，则默认用中间件中的默认数据库 */
        db: userDB,
      }
    );
    const oneArr = [];
    for (const key of await formDB.keys()) {
      const val = await formDB.get(key, undefined);
      oneArr.push({ key, val });
      /* 显示迁移数据 */
      // console.log(`form:${form},key:${key},val:${val}`);
    }
    res[form] = oneArr;
  }
  console.log('需要迁移的数据'.green, res);
  /* 设置进新的数据库 */
  for (const form of Object.keys(res)) {
    /* 不传递可选参数默认使用2.0自带数据库Level，中间件源码详见db/Level.ts */
    const formDB = new BncrDB(form);
    for (const x of res[form]) {
      try {
        await formDB.set(x.key, x.val);
      } catch (error) {
        console.log(error);
      }
    }
  }
  await sender.reply('迁移完成~');
};
