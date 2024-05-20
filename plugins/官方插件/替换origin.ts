/**
 * @author Aming
 * @name 替换origin
 * @team Bncr团队
 * @version 1.0.0
 * @description 替换Adapter plugins下所有文件的origin为team
 * @rule ^(升级文件到新版)$
 * @admin false
 * @priority 9999
 * @classification ["官方命令"]
 * @public true
 * @disable false
 */

import fs from 'fs';
import path from 'path';

module.exports = async (s: Sender) => {
  const directories = ['Adapter', 'plugins'].map(e => path.join(sysMethod.runWorkDir, e));

  directories.forEach(directory => {
    processDirectory(directory);
  });

  console.log('字符串替换完成。');
  s.reply('字符串替换完成。');
};

// 替换文件中的字符串
function replaceInFile(filePath: string) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`读取文件出错: ${filePath}`, err);
      return;
    }
    if (!filePath.includes('替换origin') && data.includes('@origin')) {
      const result = data.replace('@origin', '@team').replace('@public true', 'false');
      fs.writeFile(filePath, result, 'utf8', err => {
        if (err) {
          console.error(`写入文件出错: ${filePath}`, err);
        }
      });
    }
  });
}

// 递归遍历目录
function processDirectory(directory: string) {
  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error(`读取目录出错: ${directory}`, err);
      return;
    }
    files.forEach(file => {
      const filePath = path.join(directory, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`获取文件状态出错: ${filePath}`, err);
          return;
        }
        if (stats.isFile()) {
          replaceInFile(filePath);
        } else if (stats.isDirectory()) {
          processDirectory(filePath);
        }
      });
    });
  });
}
