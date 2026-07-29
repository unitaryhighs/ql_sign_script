/**
 * config.js —— 集中式配置加载器 / Central config loader
 *
 * 加载顺序 / Load order:
 *   1) 环境变量 QL_SIGN_CONFIG_PATH（用户自定义路径）
 *   2) /ql/data/config/ql_sign_config.json（青龙容器默认路径）
 *   3) <repo_root>/config.json（本地调试）
 *
 * 字段风格 / Field style:
 *   {
 *     "SMZDM_COOKIE_LIST": [ { "cookie": "...", "remark": "主号" } ],
 *     "KANXUE_COOKIE_LIST": [ { "cookie": "..." } ],
 *     "HFWEATHER_LIST": [ { "city": "hangzhou", "key": "..." } ]
 *   }
 *
 * 对外 API / Public API:
 *   const { loadConfig, getList, resolveConfigKey } = require('../_lib/config');
 */

'use strict';

const fs = require('fs');
const path = require('path');

// 缓存已加载的配置对象 / Cache the loaded config once
let cachedConfig = null;
let cachedFrom = null;

// 依据任务名推导默认的配置键 / Derive default config key from task name
function resolveConfigKey(taskName, opts) {
  if (opts && opts.configKey) return opts.configKey;
  const upper = String(taskName || '').toUpperCase();
  // 大多数账号驱动脚本走 <TASK>_COOKIE_LIST；无账号脚本走 <TASK>_LIST。
  // 允许调用方在 shim.run 里显式传 configKey 覆盖。
  return upper + '_COOKIE_LIST';
}

function candidatePaths() {
  const list = [];
  if (process.env.QL_SIGN_CONFIG_PATH) {
    list.push(process.env.QL_SIGN_CONFIG_PATH);
  }
  list.push('/ql/data/config/ql_sign_config.json');
  // <repo_root>/config.json，_lib 上一层即为仓库根
  list.push(path.join(__dirname, '..', 'config.json'));
  return list;
}

function readJsonSafe(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    // 文件存在但解析失败：直接抛，避免默默忽略用户的配置
    err.message = '解析配置文件失败 / Failed to parse ' + file + ': ' + err.message;
    throw err;
  }
}

function loadConfig() {
  if (cachedConfig) return cachedConfig;
  const tried = [];
  for (const p of candidatePaths()) {
    tried.push(p);
    const cfg = readJsonSafe(p);
    if (cfg && typeof cfg === 'object') {
      cachedConfig = cfg;
      cachedFrom = p;
      console.log('♻️  已加载配置 / Config loaded from: ' + p);
      return cachedConfig;
    }
  }
  console.log('❌ 未找到 config.json / config.json not found. Tried:');
  tried.forEach((p) => console.log('   - ' + p));
  console.log('👉 请把 config.sample.json 复制为下列任一路径 / Please copy config.sample.json to one of:');
  console.log('   - /ql/data/config/ql_sign_config.json (青龙推荐 / recommended in Qinglong)');
  console.log('   - <repo>/config.json (本地调试 / local debug)');
  console.log('   - 或设置 QL_SIGN_CONFIG_PATH 指向自定义位置 / Or set QL_SIGN_CONFIG_PATH');
  process.exit(1);
}

// 拿到一个数组字段；缺失或非数组则返回 [] / Return array field, [] when missing
function getList(cfg, key) {
  if (!cfg) return [];
  const value = cfg[key];
  if (Array.isArray(value)) return value;
  return [];
}

function configPath() {
  return cachedFrom;
}

module.exports = {
  loadConfig,
  getList,
  resolveConfigKey,
  configPath,
};
