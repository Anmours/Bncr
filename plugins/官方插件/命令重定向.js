/**
 * @author Aming
 * @name 命令重定向
 * @origin Bncr团队
 * @version 1.0.0
 * @description 命令重定向
 * @rule ^(重启无界|重新启动无界|bncr重定向列表)
 * @admin true
 * @public false
 * @priority 9999
 * @disable false
 */

/* 
下面提供了简单的示例,自己定义
 */

module.exports = async s => {
    const rule = s.param(1);
    const setInfo = {
        重启无界: '重启',
        重新启动无界: '重启',
    };
    if (rule === 'bncr重定向列表') {
        let logs = `重定向列表:\n`;
        for (const e of Object.keys(setInfo)) {
            logs += `${e}=>${setInfo[e]}\n`;
        }
        s.delMsg(await s.reply(logs), { wait: 10 });
        return;
    }
    setInfo?.[rule] && s.inlineSugar(s.getMsg().replace(rule, setInfo[rule]));
};
