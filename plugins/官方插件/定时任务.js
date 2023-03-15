/**
 * @author Aming
 * @name 定时任务
 * @origin 官方
 * @version 1.0.0
 * @description 定时触发命令示例
 * @public false
 * @priority 5
 * @disable false
 * @service true
 */

//例子 8点以系统管理员命令触发 重启
sysMethod.cron.newCron('0 0 8 * * *', () => {
    console.log('定时器运行了');
    // sysMethod.inline('重启');
});



//例子 20点以系统管理员命令触发 白嫖检索
sysMethod.cron.newCron('0 0 20 * * *', () => {
    sysMethod.inline('白嫖检索');
});
