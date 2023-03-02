module.exports = {
    /* 鉴权token */
    token: '',
    /* 系统日志开关  如果为false，则不显示例如插件匹配、运行等日志系统消息 */
    sysLogOpen: true,
    /* 控制台消息日志等级
    0 不显示任何收到消息的日志，1显示全部消息日志，2只显示未屏蔽的消息 */
    msgLogOpen: 1, 
    /* 开发者模式 默认true，会监听plugins目录实时重载插件,
    如果不调试插件请关闭该功能进一步节省内存(可能也就能释放几M吧) */
    developerMode: true,
    /* 内置qq机器人 */
    qqBot: {
        enable: false, 
        qqId: 1234, /* 作为机器人的qq号 */
        platform: 5, /* 登录设备，1:安卓手机 2:aPad 3:安卓手表 4:MacOS 5:iPad */
        /* 日志等级，"trace" | "debug" | "info" | "warn" | "error" | "fatal" | "mark" | "off"; */
        log_level: 'error', //只显示错误消息
    },
	/* 外置qq */
    qqBot_Outside: {   /* 和内置qq只能二选一，如果要共存，那么要修改某个new Adapter('qq'); 值，不懂勿动*/
        enable: false,
        mode: 'ws',  //ws或http 目前只支持ws反向链接和http模式
        sendUrl: 'http://192.168.31.192:9696'
        /* 如果是http模式，则需要设置 sendUrl，改地址为 远端qq机器人的监听地址:端口 */
        /* 接受消息地址为： http://bncrip:9090/api/bot/qqHttp */
    },
    /* HumanTG  Bncr内置的人行tg */
    HumanTG: {
        enable: false, 
        apiId: 51, /* 字面意思 */ 
        apiHash: '', /* 字面意思 */
        startLogOutChat: '', /* 启动日志输出群id 或 个人id ,不填不推送 */
        connectionRetries: 3, /* 链接超时重试次数 */
        /* Telegram代理配置  只支持 socks5 */
        proxyEnable: false, // 如果为true 下面的信息必须填写正确，否则报错, false则直连，需要主机器本身能连通tg
        proxy: {
            host: '', // 主机地址 域名或ip
            port: 9943, // 端口号
            socksType: 5, // 版本类型  不用改
            timeout: 5,  // 链接超时,
            username: '', //账号密码
            password: '',
        },
    },
    /* tgBot */
    tgBot: {
        enable: false, //开关
        token: '', //字面意思
        proxyEnable: false, /* 暂时不支持代理 ,不用填*/
        proxy: {
            host: '', // 主机地址 域名或ip
            port: 9943, // 端口号 改成你的
            socksType: 5, // 版本类型  不用改
            timeout: 5, // 链接超时,
            username: '', //账号密码
            password: '',
        },
    },
    /* 微信 */
    wxBot: {
        //可爱猫
        KeAImao: {
            enable: false, //开关
            /* 上报地址 （远端可爱猫的接受消息地址） */
            sendUrl: 'http://192.168.31.115:34567',  
        },
        //千寻 （暂不支持）
        Qianxun: {
            enable: false,
            receiveUrl: 'http://',
            sendUrl: 'http://',
        },
        //xyo（暂不支持）
        Xyo: {
            enable: false,
            receiveUrl: 'http://',
            sendUrl: 'http://',
        },
    },
    /* 关闭后不会加载任何通过页眉设置的定时任务 */
    cron: {
        enable: true,
    },
    /* 控制台调试消息功能，关闭后，控制台不能输入任何消息进行调试 */
    ssh: {
        enable: true,
    },
};
