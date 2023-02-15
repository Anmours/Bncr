/**
 * @author Aming
 * @name 服务插件
 * @version 1.0.0
 * @description 测试
 * @public false
 * @priority 5
 * @disable false
 * @service true
 */

//例子 8点以管理员命令触发 重启
sysMethod.cron.newCron('0 0 8 * * *', () => {
    console.log('定时器运行了');
    // sysMethod.inline('重启');
});
