# ql_sign_script

青龙面板签到脚本合集 / Qinglong panel sign-in & info scripts

## 简介

本项目将各类签到青龙面板可用的 Node.js 脚本。
采用干净的适配层（shim），零外部依赖，开箱即用。

- **零依赖**：使用 Node.js 内置 `http`/`https`/`crypto` 模块，无需 `npm install`
- **统一配置**：所有账号通过一个 `config.json` 集中管理
- **多账号支持**：自动链式执行多个账号，结果合并推送
- **推送集成**：对接青龙自带 `sendNotify`，支持 Bark / PushPlus / Server酱 / 钉钉 / Discord 等

## 已支持脚本

### sign/ - 签到类（需要 cookie）

| 脚本 | 名称 | 配置键 | 状态 |
|------|------|--------|------|
| ciba.js | 词霸每日一句 | CIBA_LIST | ✅ |
| smzdm.js | 什么值得买抽奖 | SMZDM_COOKIE_LIST | ✅ |
| kanxue.js | 看雪论坛签到 | KANXUE_COOKIE_LIST | ✅ |
| wnflb.js | 万能福利吧签到 | WNFLB_COOKIE_LIST | ✅ |
| kfzy.js | 夸父资源社签到 | KFZY_COOKIE_LIST | ✅ |
| dahai.js | 大海资源站签到 | DAHAI_COOKIE_LIST | ✅ |
| znzmo.js | 知末签到 | ZNZMO_COOKIE_LIST | ✅ |
| xuejieba.js | 学姐吧签到 | XUEJIEBA_COOKIE_LIST | ✅ |
| caigamer.js | 菜玩社区签到 | CAIGAMER_COOKIE_LIST | ✅ |

### hot/ - 资讯类（无需账号）

| 脚本 | 名称 | 配置键 | 状态 |
|------|------|--------|------|
| day60s.js | 每天60秒读懂世界 | DAY60S_LIST | ✅ |
| todayhistory.js | 历史上的今天 | TODAYHISTORY_LIST | ✅ |
| bdhot.js | 百度热搜榜 | BDHOT_LIST | ✅ |
| zaoan.js | 早安问候语 | ZAOAN_LIST | ✅ |

### img/ - 图片类（无需账号）

> 规划中，待迁移

### tool/ - 工具类（需要 API KEY）

> 规划中，待迁移


## 部署方式

### 方式一：青龙面板部署（推荐）

1. **添加仓库**
   - 进入青龙面板 -> 订阅管理 -> 新建订阅
   - 填入仓库地址：`https://github.com/unitaryhighs/ql_sign_script`
   - 定时任务自动拉取

2. **创建配置文件**
   - 将 `config.sample.json` 复制为 `/ql/data/config/ql_sign_config.json`
   - 填入你的 cookie 和账号信息

   也可以通过环境变量指定路径：`QL_SIGN_CONFIG_PATH=/your/path/config.json`

3. **添加定时任务**
   - 进入青龙面板 -> 定时任务 -> 新建任务
   - 名称随意，命令填脚本路径，如 `node sign/smzdm.js`
   - 设置 cron 表达式，如 `0 15 * * *`（每天 15 点执行）

   示例任务：
   ```
   node sign/smzdm.js      # 什么值得买抽奖
   node sign/kanxue.js     # 看雪论坛签到
   node sign/wnflb.js     # 万能福利吧签到
   node sign/kfzy.js     # 夸父资源社签到
   node sign/dahai.js     # 大海资源站签到
   node sign/znzmo.js     # 知末签到
   node sign/xuejieba.js  # 学姐吧签到
   node sign/caigamer.js  # 菜玩社区签到
   node hot/day60s.js      # 每天60秒读懂世界
   node hot/bdhot.js       # 百度热搜榜
   ```

4. **配置推送**（可选）
   - 青龙面板自带 `sendNotify`，在青龙的环境变量中配置推送参数即可
   - 支持 Bark / PushPlus / Server酱 / 钉钉 / Discord / 邮件等

### 方式二：本地运行

```bash
git clone https://github.com/unitaryhighs/ql_sign_script.git
cd ql_sign_script
cp config.sample.json config.json
# 编辑 config.json，填入你的账号信息
node sign/ciba.js
``+
> 无需 `npm install`，脚本使用 Node.js 内置模块，零依赖。
> 需要 Node.js >= 14。

## 配置格式

所有配置集中在一个 JSON 文件中，按键名区分不同脚本：

```json
{
  "CIBA_LIST": [
    { "cn": "是", "en": "是" }
  ],
  "DAY60S_LIST": [{}],
  "BDHOT_LIST": [{}],
  "ZAOAN_LIST": [{}],
  "SMZDM_COOKIE_LIST": [
    { "cookie": "session=xxx; smzdm_id=xxx", "remark": "主号" },
    { "cookie": "session=yyy; smzdm_id=yyy", "remark": "小号" }
  ],
  "KANXUE_COOKIE_LIST": [
    { "cookie": "your_cookie_here" }
  ],
  "WNFLB_COOKIE_LIST": [
    { "cookie": "your_cookie_here", "remark": "主号" }
  ],
  "KFZY_COOKIE_LIST": [
    { "cookie": "your_cookie_here", "remark": "主号" }
  ],
  "DAHAI_COOKIE_LIST": [
    { "cookie": "your_cookie_here", "remark": "主号" }
  ],
  "ZNZMO_COOKIE_LIST": [
    { "cookie": "your_cookie_here", "remark": "主号" }
  ],
  "XUEJIEBA_COOKIE_LIST": [
    { "cookie": "your_cookie_here", "remark": "主号" }
  ],
  "CAIGAMER_COOKIE_LIST": [
    { "cookie": "your_cookie_here", "remark": "主号" }
  ]
}
```

**字段说明：**

- `cookie`：账号凭据（签到类必填）
- `remark`：账号备注名（可选，用于推送消息中区分账号）
- 无账号脚本（资讯类）只需提供一个空对象 `{}` 即可触发执行

**配置文件查找顺序：**
1. 环境变量 `QL_SIGN_CONFIG_PATH` 指定的路径
2. `/ql/data/config/ql_sign_config.json`（青龙容器默认）
3. `<仓库根目录>/config.json`（本地调试）

## 目录结构

```
ql_sign_script/
├── _lib/
│   ├── airscriptShim.js   # 适配层：HTTP/Application/Crypto mock + 异步链
│   ├── config.js          # 配置加载器
│   └── sendNotify.js      # 本地测试用推送 stub（不入库）
├── sign/                   # 签到类脚本
├── hot/                    # 资讯类脚本
├── img/                    # 图片类脚本（待迁移）
├── tool/                   # 工具类脚本（待迁移）
├── config.sample.json      # 配置示例
├── MIGRATION_PLAN.md       # 迁移计划
└── package.json
```

## 架构说明

每个脚本由两部分组成：

1. **适配层**（`_lib/airscriptShim.js`）：提供 `HTTP`/`Application`/`Crypto` mock，
   通过 fetch 异步链驱动多账号执行：`execHandle -> HTTP请求 -> resultHandle -> 下一个账号 -> 推送`

2. **业务代码**：每个脚本保留原始的 `execHandle`（发请求）和 `resultHandle`（处理响应），
   顶部调用 `installShim()` 安装适配层，末尾注册回调函数。

## 添加新脚本

1. 复制 `sign/ciba.js` 或 `hot/day60s.js` 作为模板
2. 修改 `installShim()` 参数（taskName、configKey、pushHeader 等）
3. 替换 `execHandle` 和 `resultHandle` 为目标脚本的业务逻辑
4. 在 `config.sample.json` 中添加对应的配置键
5. 测试：`node sign/xxx.js`


## 致谢

本项目基于 [imoki/sign_script](https://github.com/imoki/sign_script) 的 Airscript 脚本移植，
感谢原作者及所有贡献者。

## License

MIT
