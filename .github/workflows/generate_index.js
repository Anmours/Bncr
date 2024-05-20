const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const PluginCloudStorage = {};

const directories = ['./Adapter', './plugins'];

directories.forEach(dir => {
  function readDirRecursive(currentDir) {
    const files = fs.readdirSync(currentDir);
    files.forEach(file => {
      const fullPath = path.join(currentDir, file);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        readDirRecursive(fullPath);
      } else if (!file.startsWith('.') && !file.endsWith('.json')) {
        const code = fs.readFileSync(fullPath, 'utf8');
        const isPublic = execParam(code, 'public');
        isPublic === 'true' && RecordIndexInformation(code, fullPath);
      }
    });
  }

  readDirRecursive(dir);
});

writeJson();

function RecordIndexInformation(code, dir) {
  const senderPluginsInfos = {
    type: 'github',
    name: path.basename(dir, path.extname(dir)),
    author: execParam(code, 'author'),
    team: execParam(code, 'team'),
    version: execParam(code, 'version'),
    description: execParam(code, 'description'),
    classification: execParam(code, 'classification'),
    filename: path.basename(dir),
    fileDir: '/' + dir.replace(/\\/g, '/'),
    systemVersionRange: execParam(code, 'systemVersionRange'),
    isCron: execParam(code, 'cron') === 'true',
    isAdapter: execParam(code, 'adapter') === 'true',
    isMod: execParam(code, 'module') === 'true',
    isService: execParam(code, 'service') === 'true',
    isAuthentication: false,
    isEncPlugin: code.includes('/** Code Encryption Block'),
    id: '后续生成',
  };
  senderPluginsInfos.id = GetPluginsID(`${senderPluginsInfos.author}:${senderPluginsInfos.team}:${senderPluginsInfos.fileDir}`);

  for (const key of Object.keys(senderPluginsInfos)) {
    if (['systemVersionRange'].includes(key)) {
      continue;
    }
    const val = senderPluginsInfos[key];
    if (typeof val === 'string' && !val) {
      console.log('空值跳过!', key);
      return;
    }
  }

  if ([senderPluginsInfos.isAdapter, senderPluginsInfos.isMod, senderPluginsInfos.isService].includes(true)) {
    senderPluginsInfos.isChatPlugin = false;
  } else {
    senderPluginsInfos.isChatPlugin = true;
  }

  try {
    senderPluginsInfos.classification = JSON.parse(senderPluginsInfos.classification);
    if (!Array.isArray(senderPluginsInfos.classification)) {
      console.log('不是数组跳过!', senderPluginsInfos.classification);
      return;
    }
  } catch (error) {
    console.log('error', error);
    return;
  }
  PluginCloudStorage[senderPluginsInfos.id] = senderPluginsInfos;
}

function execParam(pluginStr, param) {
  const regex = new RegExp(`(?<=@${param} )[^\r\n]+`, 'g');
  const tempVal = pluginStr.match(regex);
  return tempVal ? tempVal[0] : '';
}

function GetPluginsID(str) {
  return crypto.createHmac('sha1', 'GetPluginsID').update(str).digest('base64');
}

function writeJson() {
  fs.writeFile(
    './publicFileIndex.json',
    JSON.stringify(
      {
        annotation: '该文件由系统自动生成. 用于插件市场索引,请勿编辑该文件中的任何内容',
        ...PluginCloudStorage,
      },
      null,
      2
    ),
    'utf8',
    err => {
      if (err) {
        console.log(err);
      } else {
        console.log('JSON 索引文件已生成');
      }
    }
  );
}
