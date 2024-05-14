/**
 * @author Aming
 * @name 定时任务
 * @team Bncr团队
 * @version 1.0.0
 * @description 定时触发命令示例
 * @priority 5
 * @disable false
 * @service true
 * @public true
 * @classification ["定时任务","示例插件"]
 */

//例子 8点以系统管理员命令触发 重启
sysMethod.cron.newCron('0 0 8 * * *', () => {
    console.log('定时器运行了');
    // sysMethod.inline('重启');
});

//例子 20点以系统管理员命令触发 测试55
sysMethod.cron.newCron('0 0 20 * * *', () => {
    sysMethod.inline('测试55');
});

