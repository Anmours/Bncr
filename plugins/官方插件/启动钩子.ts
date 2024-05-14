/**
 * @author Aming
 * @name 启动钩子
 * @description 向系统启动完成后执行方法中添加钩子函数
 * @team Bncr团队
 * @version v1.0.0
 * @priority 100
 * @disable false
 * @service true
 * @public true
 * @classification []
 *
 */

/**
 * createStartupCompletionHook为2.0新增的系统方法，
 * 它可以向系统重启完成后执行列表中增加执行函数
 * 现在有了这个钩子，你可以为所欲为的控制启动完成后的行为
 *
 * 示例：
 * 第一个参数为注册名，必须为字符串且请勿重复，否则不会被添加到列表中
 * 第二个参数为函数，当系统启动完成后，会并发执行所有钩子的第二个参数的函数，它可以是异步的
 *
 * 注意：
 * 系统启动完成后，是并行(并发)执行所有的启动完成钩子，并不是依次执行，
 * 所以不要在不同的钩子中做数据交互，这并不可行
 */

/* 示例一，启动完成后向控制台输出文本 */
sysMethod.createStartupCompletionHook('outStartOK', async () => {
  console.log('-来自启动钩子: 无界启动完成啦~');
});

/* 示例二。启动完成后检查是否有用户发送重启，有则像发送者回复重启完成消息，该功能需要与官方命令中的重启分支做匹配改写 */
sysMethod.createStartupCompletionHook('sendRestartMessage', async () => {
  /* 获取重启信息 */
  const sysDB = new BncrDB('system');
  let restartInfo = await sysDB.get<{
    platform: string;
    msg: '重启完成'; //重启完成回复语
    userId: string;
    groupId: string;
    toMsgId: string;
  }>('restartInfo');
  if (!restartInfo) return;
  /* 如果是qq或web平台，则增加重试次数，因为系统启动完成后，ws可能还未链接成功 */
  if (['qq', 'web'].includes(restartInfo?.platform)) {
    /* 重试20次 */
    let i = 0;
    do {
      await sysMethod.sleep(5);
      if (await sysMethod.push(restartInfo)) break;
      continue;
    } while (i++ < 20);
  } else {
    /* 否则直接推送重启完成消息 */
    /* 你也可以改成所有平台均重试20次 */
    sysMethod.push(restartInfo);
  }
  /* 删除重启信息 */
  sysDB.del('restartInfo');
});
