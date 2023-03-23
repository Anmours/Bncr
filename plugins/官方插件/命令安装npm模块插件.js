/**
 * @author Aming
 * @name 命令安装npm模块插件
 * @origin 官方
 * @version 1.0.0
 * @description 命令安装npm模块插件
 * @platform qq ssh HumanTG tgBot wxQianxun wxKeAImao wxXyo
 * @rule ^(npm i|安装模块) ([^\n]+)$
 * @admin true
 * @public false
 * @priority 9999
 * @disable false
 */

/* 
命令安装npm模块,支持连续安装,空格隔开
安装模块 axios request got@11.8.5 crypto-js
或
npm i axios request got@11.8.5 crypto-js
*/


/** Code Encryption Block[419fd178b7a37c9eae7b7426c4a04203cac9f66e25bccd965b7e3e4ad5b8d994b42803fa499c884e3392602909fe045fa14be0fce90c695538717705d73a50d8799500f9d07e729f8bc091661cc907b51fcd2399d53811adc87018b787f79496ddf05c47d1146b66e99b55640cc1be2854c78bb3a79f132c46b08f168547984407d5ce326a9819655d0704d04464d351a579c85a05d5faec5594dcaae2d7567f9ec61637beb9ee73af1f6f340d21445ae9fe7ca636b4689d1e0884b2d4208ba5884186f2f44c1b087b7261997c1e00a4707086faf5bf23f67096e188df0c0793fc4d4c362c7452ada45cbc2e32739ea6f8b743562741b8dc34b8a6b314df0ac08c41228c4c83dd3cf6d56d7633be05eb9055e8775a0895dd6ece4ec8bf46f09bc37c43cb7473ca4a2b9fb3fc6b5aeb434a736b6519ef49cf88df73af50c3f5a0ef4d01118fb0618c6b0f75319a1dff00ed370a1a50c85818002aaed66835ac958741c74ad70d3cbeef597bea98068cb939751b1326c9ba68685927c3409fda329f34a0d19228e5b9dc49fe716cf9eb511e8fe975d29e256340780197dc02233255e92eaea3fdec7bed3bd1b6e949d5b23db086b8c054dde2e75cde87f6abae9abe7075ead82d4b3d59c5a5f0b62f18be] */