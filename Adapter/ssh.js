/**
 * This file is part of the App project.
 * @author Aming
 * @name ssh
 * @team 官方
 * @version 1.0.3
 * @description ssh控制台适配器
 * @adapter true
 * @public false
 * @disable false
 * @priority 0
 * @Copyright ©2023 Aming and Anmours. All rights reserved
 * @classification ["官方适配器"]
 * Unauthorized copying of this file, via any medium is strictly prohibited
 */

module.exports = async () => {
  const { randomUUID } = require('crypto');
  const ssh = new Adapter('ssh');
  const sshDb = new BncrDB('ssh');
  const readline = require('readline');

  let userId = await sshDb.get('admin', '');
  if (!userId) {
    userId = randomUUID().split('-')[4];
    await sshDb.set('admin', userId);
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on('SIGINT', () => {
    console.log('Ctrl+C 主动退出');
    process.exit(1);
  });
  rl.on('line', async input => {
    if (!input) return;
    const msg = input.split(' ')[0];
    switch (msg) {
      case 'cls':
        console.clear();
        break;
      case 'bye':
        process.exit(0);
      default:
        ssh.receive({
          userId,
          userName: 'ssh@Admin',
          groupId: '0',
          groupName: '',
          msg: input,
          msgId: randomUUID().split('-')[4],
          type: 'ssh',
        });
        break;
    }
  });

  ssh.reply = function (msgInfo) {
    console.log(' ');
    console.log('ssh@Admin: ');
    console.log('', msgInfo.msg);
    console.log(' ');
  };
  ssh.push = function (msgInfo) {
    return this.reply(msgInfo);
  };
  return ssh;
};
