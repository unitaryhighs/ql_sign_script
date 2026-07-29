/**
 * airscriptShim.js -- 干净版青龙适配层 / Clean Qinglong adapter
 *
 * 替换原项目中的混淆 QL 适配块。
 * 提供 HTTP / Application / Crypto mock，并通过 fetch 异步链驱动多账号执行。
 *
 * 用法 / Usage:
 *   const { installShim } = require('../_lib/airscriptShim');
 *   installShim({ taskName: 'ciba', pushHeader: '【词霸每日一句】', ... });
 *   // ... 业务代码 ...
 *   global.resultHandle = resultHandle;
 *   global.execHandle = execHandle;
 *   global.messageMerge = messageMerge;
 */

'use strict';

const https = require('https');
const http = require('http');
const nodeCrypto = require('crypto');
const { loadConfig, getList, resolveConfigKey } = require('./config');

// ---- fetch 兼容层：用 Node 内置 http/https 模块实现 ----
// 避免依赖 node-fetch，兼容 Node 14+
function fetchPolyfill(reqUrl, opts) {
  opts = opts || {};
  return new Promise(function(resolve, reject) {
    const parsed = new URL(reqUrl);
    const lib = parsed.protocol === 'https:' ? https : http;
    const reqOpts = {
      method: (opts.method || 'GET').toUpperCase(),
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers: opts.headers || {}
    };
    if (opts.body) {
      reqOpts.headers['Content-Length'] = Buffer.byteLength(opts.body);
    }
    const req = lib.request(reqOpts, function(res) {
      let body = '';
      // 自动处理 gzip/deflate（Node http 模块不自动解压）
      const encoding = res.headers['content-encoding'];
      if (encoding === 'gzip' || encoding === 'deflate') {
        const zlib = require('zlib');
        const unzip = encoding === 'gzip' ? zlib.gunzipSync : zlib.inflateSync;
        const chunks = [];
        res.on('data', function(chunk) { chunks.push(chunk); });
        res.on('end', function() {
          try { body = unzip(Buffer.concat(chunks)).toString(); }
          catch(e) { body = Buffer.concat(chunks).toString(); }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            text: function() { return Promise.resolve(body); }
          });
        });
      } else {
        res.on('data', function(chunk) { body += chunk; });
        res.on('end', function() {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            text: function() { return Promise.resolve(body); }
          });
        });
      }
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function installShim(opts) {
  const taskName = opts.taskName;
  const configKey = opts.configKey || resolveConfigKey(taskName, opts);
  const pushHeader = opts.pushHeader || ('【' + taskName + '】');
  const primaryField = opts.primaryField || 'cookie';
  const extraFields = opts.extraFields || [];
  const requiresAccount = opts.requiresAccount !== false;
  const line = opts.line || 21;

  // ---- 读取配置 ----
  const cfg = loadConfig();
  let accounts = getList(cfg, configKey);

  // 无账号脚本：自动注入一个占位行，extraFields 默认 "是"
  if (!requiresAccount && accounts.length === 0) {
    const placeholder = {};
    extraFields.forEach(function(f) { placeholder[f] = '是'; });
    placeholder[primaryField] = 'placeholder';  // 业务代码检查 cookie=="" 会 break，需要非空
    accounts = [placeholder];
  }

  if (requiresAccount && accounts.length === 0) {
    console.log('⚠️  ' + configKey + ' 未配置账号，跳过 / no account configured, skip');
    process.exit(0);
  }

  // ---- 构建虚拟 SUBCONFIG 表 ----
  // row 0 = 表头，row 1..N = 账号
  const userContent = [];
  userContent.push([primaryField, '是否执行(是/否)', '账号名称(不可填写)'].concat(extraFields));
  accounts.forEach(function(acc, idx) {
    let primary = acc[primaryField] || '';
    // 无账号脚本：primary 可能为空，填占位值避免业务代码 cookie=="" break
    if (!requiresAccount && primary === '') primary = 'placeholder';
    const remark = acc.remark || ('昵称' + (idx + 1));
    const extras = extraFields.map(function(f) {
      return acc[f] != null ? String(acc[f]) : '';
    });
    userContent.push([primary, '是', remark].concat(extras));
  });

  // ---- 构建虚拟 CONFIG 表（主配置表）----
  const configContent = [
    ['工作表的名称', '备注', '只推送失败消息（是/否）', '推送昵称（是/否）'],
    [taskName, pushHeader, '否', '是']
  ];

  // ---- 虚拟表集合 ----
  const qlConfig = {
    CONFIG: configContent,
    SUBCONFIG: userContent,
    PUSH: [['推送类型', '推送key', '是否推送']],
    EMAIL: [['server', 'port', 'sender', 'authorizationCode']]
  };

  const colNum = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
  let activeSheet = userContent;

  // ---- Application mock ----
  const Application = {
    Range: function(addr) {
      const col = addr.substring(0, 1);
      const row = parseInt(addr.substring(1), 10);
      let colIdx = colNum.indexOf(col);
      if (colIdx < 0) colIdx = 0;
      let value = '';
      try {
        const rowData = activeSheet[row - 1];
        if (rowData && rowData[colIdx] != null) value = String(rowData[colIdx]);
      } catch (e) { /* 越界返回空字符串 */ }
      return { Text: value, Value: value, Value2: value };
    },
    Sheets: {
      Item: function(name) {
        return {
          Name: name,
          Activate: function() {
            if (qlConfig[name]) {
              activeSheet = qlConfig[name];
            } else {
              activeSheet = qlConfig.SUBCONFIG;
            }
            console.log('🥚 激活工作表：' + name);
            return 1;
          }
        };
      }
    }
  };

  // ---- 全局状态（业务代码和 shim 共享）----
  global.userContent = userContent;
  global.qlpushFlag = accounts.length;  // 倒计时，初始 = 账号数；每次 execHandle 减 1
  global.posHttp = 0;
  global.flagFinish = 0;
  global.flagResultFinish = 0;
  global.qlSwitch = 1;
  global.line = line;

  // ---- 辅助：对象转表单格式 ----
  function dataToFormdata(obj) {
    let result = '';
    const keys = Object.keys(obj);
    const values = Object.values(obj);
    for (let i = 0; i < keys.length; i++) {
      result += keys[i] + '=' + values[i] + '&';
    }
    return result.substring(0, result.length - 1);
  }

  // ---- 核心：fetch 异步链 ----
  // fetch 完成后：调 resultHandle -> 找下一个账号 -> execHandle -> 全部完成则 sendNotify
  function orchestrate(url, method, headers, body) {
    const pos = global.userContent.length - global.qlpushFlag;
    const fetchOpts = { method: method, headers: headers || {} };
    if (method === 'post' && body != null) {
      fetchOpts.body = body;
    }

    fetchPolyfill(url, fetchOpts)
      .then(function(res) {
        return res.text().then(function(text) {
          let jsonData = null;
          try { jsonData = JSON.parse(text); } catch (e) { /* 非JSON */ }
          return {
            status: res.status,
            headers: res.headers,
            text: function() { return text; },
            json: function() { return jsonData; },
            response: res,
            pos: pos
          };
        });
      })
      .then(function(resp) {
        // 调用业务代码的 resultHandle
        global.flagResultFinish = global.resultHandle(resp, pos);

        // 找下一个账号并执行
        if (global.flagResultFinish == 1) {
          for (let i = pos + 1; i <= global.line; i++) {
            const nextCookie = Application.Range('A' + i).Text;
            const nextExec = Application.Range('B' + i).Text;
            if (nextCookie === '') break;
            if (nextExec === '是') {
              console.log('🧑 开始执行用户：' + (i - 1));
              global.flagResultFinish = 0;
              global.execHandle(nextCookie, i);
              break;
            }
          }
        }

        // 检查是否全部完成
        if (pos === global.userContent.length && global.flagResultFinish == 1) {
          global.flagFinish = 1;
        }
        if (global.qlpushFlag <= 0 && global.flagFinish === 1) {
          console.log('🚀 青龙发起推送');
          const msg = global.messageMerge();
          // 尝试加载 sendNotify：优先青龙自带（scripts 根目录），其次本地测试 stub
          // Try to load sendNotify: QingLong built-in first, then local stub
          const notifyCandidates = [
            '../../sendNotify',  // 青龙自带 /ql/data/scripts/sendNotify
            './sendNotify',      // 本地测试 stub
          ];
          let notifyFn = null;
          for (const cp of notifyCandidates) {
            try {
              const mod = require(cp);
              // 兼容两种导出：module.exports = fn 或 { sendNotify: fn }
              notifyFn = (typeof mod === 'function') ? mod : mod.sendNotify;
              if (typeof notifyFn === 'function') break;
            } catch (e) { /* 继续尝试下一个候选 / try next candidate */ }
          }
          if (typeof notifyFn === 'function') {
            notifyFn(pushHeader, msg);
          } else {
            console.log('⚠️ sendNotify 未找到，打印消息 / sendNotify not found:');
            console.log(msg);
          }
          global.qlpushFlag = -100;
        }
      })
      .catch(function(err) {
        console.error('Fetch error:', err);
      });
  }

  // ---- HTTP mock ----
  const HTTP = {
    get: function(url, opts) {
      const headers = (opts && opts.headers) || {};
      orchestrate(url, 'get', headers, null);
    },

    post: function(url, data, opts, option) {
      const headers = (opts && opts.headers) || {};
      const contentType = headers['Content-Type'] || headers['content-type'] || '';

      // option == "get" 时用 GET 方式
      if (option === 'get' || option === 'GET') {
        orchestrate(url, 'get', headers, null);
        return;
      }

      // 格式化请求体
      let body = '';
      if (contentType === 'application/x-www-form-urlencoded') {
        console.log('🍳 检测到发送请求体为: 表单格式');
        body = dataToFormdata(data);
      } else {
        try {
          console.log('🍳 检测到发送请求体为: JSON格式');
          body = JSON.stringify(data);
        } catch (e) {
          console.log('🍳 检测到发送请求体为: 表单格式');
          body = data;
        }
      }

      orchestrate(url, 'post', headers, body);
    },

    fetch: function(url, opts) {
      const method = (opts && opts.method) || 'get';
      const headers = (opts && opts.headers) || {};
      orchestrate(url, method, headers, null);
    }
  };

  // ---- Crypto mock ----
  // 支持 createHash("md5").update(data, "utf8").digest("hex").toString() 链式调用
  const Crypto = {
    createHash: function(algo) {
      return {
        update: function(data, encoding) {
          return {
            digest: function(type) {
              return {
                toString: function() {
                  if (algo === 'md5') return nodeCrypto.createHash('md5').update(data).digest('hex');
                  return '';
                },
                toUpperCase: function() {
                  return {
                    toString: function() {
                      if (algo === 'md5') return nodeCrypto.createHash('md5').update(data).digest('hex').toUpperCase();
                      return '';
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };

  // ---- 注入全局 ----
  global.HTTP = HTTP;
  global.Application = Application;
  global.Crypto = Crypto;
  // SMTP stub（QL 模式下邮件推送由 sendNotify 处理，不会走到这里）
  global.SMTP = {
    login: function() {
      return {
        send: function() {
          console.log('⚠️ SMTP 在青龙模式下不可用，请通过 sendNotify 配置邮件推送');
        }
      };
    }
  };

  console.log('♻️ 当前环境为青龙');
  console.log('♻️ 开始适配青龙环境，执行青龙代码');
  console.log('✨ ql_sign_script : https://github.com/unitaryhighs/ql_sign_script');
  console.log('💗 Welcome to use ql_sign_script');
}

module.exports = { installShim };
