/**
 * @author Aming
 * @name BncrPluginConfig-示例
 * @team Bncr团队
 * @version 1.0.0
 * @description BncrPluginConfig-示例
 * @rule ^(测试8)$
 * @admin true
 * @public true
 * @priority 9999
 * @disable false
 * @classification ["示例插件"]
 */
/* 2.x中 js文件中可以增加三斜指令来提供全局声明文件，提供代码提示，例如sysMethod.xxx 会有提示 */
/// <reference path="../../@types/Bncr.d.ts" />

/**
 * 在无界2.0中 ,不建议在让用户 用set方式设置配置 然后在插件中get读取
 * 在插件特别多的情况下,set 配置操作会异常麻烦,so...
 * 为了简化一系列的操作,特推出一个BncrPluginConfig全局构造函数规范所有配置文件
 */
/* 例如你本有以下一个config配置,
  在1.x中 你肯定需要用户挨个set他们的每个值 */
const defaultConfig = {
  /* 配置你的host (涉及string)*/
  host: 'http://127.0.0.1:9090',
  /* xx开关, 设置开.... */
  open: false,
  /* 撤回消息时间, 0为不撤回 (涉及number)*/
  delTime: 0,
  /* 其他设置, (涉及嵌套对象) */
  setOpt: {
    set1: '',
    set2: '3',
  },
  /* (涉及数组) */
  numberArr: [0, 1, 2],
};
/* 在2.x中,你需要通过BncrPluginConfig来传递一个jsonSchema
  q:什么是jsonSchema? a: 自行百度了解
  q:目的为何? a：通过 jsonSchema约束一个json,后续通过2.x自带的配置修改器来让客户统一修改
  */

/* 
  使用系统自带的BncrCreateSchema构造器:
  你可以手写一个jsonSchema，打印jsonSchema1你将会看到构造后的结构,照葫芦画瓢即可
  */
const jsonSchema1 = BncrCreateSchema.object({
  host: BncrCreateSchema.string().setTitle('设置host').setDescription(`配置你的host`).setDefault('http://127.0.0.1:9090'),
  open: BncrCreateSchema.boolean().setTitle('xx开关').setDescription(`当为true....`).setDefault(false),
  delTime: BncrCreateSchema.number().setTitle('设置1').setDescription(`设置1说明`).setDefault(0),
  setOpt: BncrCreateSchema.object({
    set3: BncrCreateSchema.string().setTitle('设置3').setDescription(`设置3说明`).setDefault('设置3的默认值'),
    set4: BncrCreateSchema.string().setTitle('设置4').setDescription(`设置4说明`).setDefault('设置4的默认值'),
  })
    .setTitle('设置2')
    .setDescription(`设置2说明`)
    .setDefault({}),
  numberArr: BncrCreateSchema.array(BncrCreateSchema.number()).setTitle('排除面板').setDescription(`默认排除0,1,2,代表排除前3个ck`).setDefault([0, 1, 2]),
  /* setEnum和setEnumNames只会对字符串和数字类型生效，setEnumNames是对setEnum中的值做详细解释，选择后的数据还是setEnum中的 */
  testSelect: BncrCreateSchema.string().setTitle('可选择的').setDescription('你爱她吗?').setEnum(['爱', '不爱']).setEnumNames(['爱-今晚1209', '不爱-让她狗带']),
});

/* 完成后new BncrPluginConfig传递该jsonSchema */
const ConfigDB = new BncrPluginConfig(jsonSchema1);
/**
 * 现在 你可以发送命令 '修改无界配置' ,或进入前端web界面配置修改界面 来进入系统菜单配置你的参数
 * 后续插件内运用见下方 ↓↓↓↓↓↓
 */

/**
 * 插件入口，插件被触发时将运行该function
 * 添加过三斜指令后，
 * 需要对module.exports导出的函数做JSDoc注解，
 * 表明sender是Sender接口，后续输入sender.会出现代码提示
 * @param {Sender} sender
 */
module.exports = async sender => {
  await ConfigDB.get();
  /* .get()首次运行时会读取数据库中存储的值，实例化时其实已经异步执行过，为确保在使用时get已经执行完毕，所以最好await一下该方法
    该操作有缓存机制，只有首次会读数据库，因此你不需要担心会影响性能
    即使你不用.get()去更新数据，ConfigDB.userConfig都是实时更新的
    但是要注意尽量避免 用一个新变量去接收这个值，否则接收后的不会是实时的，例如：
    const config = ConfigDB.userConfig
    这样做会config写死，即使ConfigDB.userConfig有更新，config中的数据都不会变化
  */
  /* 如果用户未配置过插件,userConfig为空对象{} */
  console.log('ConfigDB.userConfig', ConfigDB.userConfig);
  if (!Object.keys(ConfigDB.userConfig).length) {
    return await sender.reply('请先发送"修改无界配置",或者前往前端web"插件配置"来完成插件首次配置');
  }
  /* 说明配置 */
  console.log('ConfigDB.jsonSchema', JSON.stringify(ConfigDB.jsonSchema, null, 2));
  /* 用户配置 ，当用户没设置过插件配置时，该值为{}*/
  console.log('ConfigDB.userConfig', ConfigDB.userConfig);
  /* 插件内修改配置文件 ,轻易不要这么做, 建议完全让用户自行修改*/
  ConfigDB.userConfig['host'] = '测试host';
  /* 当在插件内部修改配置数据后，务必调用set来保存配置到数据库 */
  ConfigDB.set();
  console.log('ConfigDB.userConfig修改后:', ConfigDB.userConfig);
};
