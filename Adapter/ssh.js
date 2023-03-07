/**
 * This file is part of the App project.
 * @author Aming
 * @name ssh
 * @origin 官方
 * @version 1.0.0
 * @description ssh控制台适配器
 * @adapter true
 * @public false
 * @disable false
 * @priority 0
 * @Copyright ©2023 Aming and Anmours. All rights reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 */

module.exports = () => {
    if (!sysMethod.config.ssh.enable) return sysMethod.startOutLogs('未启用ssh 退出.');
    const { randomUUID } = require('crypto');
    const ssh = new Adapter('ssh');
    const sshDb = new BncrDB('ssh');
    (async () => {
        let userId = await sshDb.get('admin', '');
        if (!userId) {
            userId = randomUUID().split('-')[4];
            await sshDb.set('admin', userId);
        }
        process.stdin
            .on('data', async input => {
                input = input.toString().trim();
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
            })
            .on('error', () => {});
    })();

    ssh.reply = function (msgInfo) {
        console.log(' ');
        console.log('ssh@Admin: ');
        console.log('>', msgInfo.msg);
        console.log(' ');
    };
    ssh.push = function (msgInfo) {
        return this.reply(msgInfo)
    };
    return ssh;
};
