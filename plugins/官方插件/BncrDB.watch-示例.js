/**
 * @author Aming
 * @name BncrDB.watch-示例
 * @team Bncr团队
 * @version 1.0.0
 * @description BncrDB.watch-示例
 * @rule ^(测试5)$
 * @admin true
 * @public false
 * @priority 9999
 * @disable false
 * @classification ["示例插件"]
 */

/// <reference path="../../@types/Bncr.d.ts" />

const systemDb = new BncrDB('system');
const watchSorage = {};
/* 建议给每一个触发器设置一个唯一id */
const watchTestTokenID = 'asdkjfaksda';
/**
 * 给 数据表system key:testToken 设置一个监听器（触发器），当用户触发以下条件时，会经过此触发器
 * 当用户set system testToken x 时
 * 当用户del system testToken 时
 */
systemDb.watch({
  /* 监听器id，后续取消监听器或覆盖监听器时需要用 */
  id: watchTestTokenID,
  /* 监听的数据库key*/
  key: 'testToken',
  /* 可选一个密码，当注册监听器时如果密码存在，
  则后续覆盖此监听器或取消监听器时，密码必须一致，
  否则拒绝访问 */
  password: '12341dasd',
  /* 注册回调 */
  callback: async method => {
    /** method对象说明
     * eventType：事件类型
     * newValue : 当eventType为set时，newValue为即将要设置的值
     * stop() ：终止操作
     * changeValue() : 当eventType为set时，可通过changeValue来篡改值
     */
    if (method.eventType === 'set') {
      console.log('用户尝试修改key:testToken value为:', method.newValue);
      /* 符合条件拦截用户set操作 */
      if (watchSorage?.testToken) {
        console.log('拦截操作');
        /* 拦截操作 */
        method.stop();
      } else {
        /* 如不做stop操作，set操作不会被终止，bncr会继续设置该值，无需在watch中重新set */
        console.log('允许修改');
        /* 不拦截则写你监听到新值之后的逻辑 */
        /* 例如 */
        watchSorage.testToken = method.newValue;
        /* 篡改需要设置的值 */
        method.changeValue(456456456);
      }
      /* 删除key */
    } else if (method.eventType === 'del') {
      console.log('用户尝试删除数据 表:system key:testToken');
      if (5 === 5) {
        /* 同理 */
        method.stop();
      } else {
        /* 同set分支 */
        //....
      }
    }
  },
});

let number = 0;
/**
 * @param {Sender} sender
 */
module.exports = async Sender => {
  console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
  systemDb.set('testToken', 123123123);

  if (number > 2) {
    systemDb.del('testToken'); /* 删除数据 */
    /* 取消监听 */
    systemDb.unWatch({
      id: watchTestTokenID,
      key: 'testToken',
      /* 错误密码(演示用) */
      password: '22222222',
    });
  }
  number++;

  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
  return;
};
