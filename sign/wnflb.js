/*
    name: "万能福利吧"
    cron: 0 45 11 * * *
    环境变量名: WNFLB_COOKIE_LIST
    环境变量值: 填写cookie
    备注: 需要cookie。F12 -> "Network"(网络) -> 按Ctrl+R -> www.wnflb2023.com -> cookie
          万能福利吧网址：https://www.wnflb2023.com
    多步签到说明: 原脚本在一个账号内顺序发起3次GET(取formhash -> 签到 -> 取结果)，
                 适配为 execHandle(步骤1) + 多步 resultHandle 链式回调。
                 QL 异步模式下，resultHandle 步骤1/2 返回0(不推进账号)，
                 步骤3 返回1(本账号完成，推进到下一账号)。
*/

const { installShim } = require('../_lib/airscriptShim');
installShim({
  taskName: 'wnflb', configKey: 'WNFLB_COOKIE_LIST',
  pushHeader: '【万能福利吧】', primaryField: 'cookie',
  requiresAccount: true, line: 21
});

const logo = "ql_sign_script : https://github.com/unitaryhighs/ql_sign_script"
var sheetNameSubConfig = "wnflb";
var pushHeader = "【万能福利吧】";
var sheetNameConfig = "CONFIG", sheetNamePush = "PUSH", sheetNameEmail = "EMAIL";
var flagSubConfig = 0, flagConfig = 0, flagPush = 0;
var line = 21;
var message = "", messageArray = [], messageOnlyError = 0, messageNickname = 0;
var messageHeader = [], messagePushHeader = pushHeader;
var version = 1;
var separator = "##########MOKU##########";
var jsonPush = [
  { name: "bark", key: "xxxxxx", flag: "0" },
  { name: "pushplus", key: "xxxxxx", flag: "0" },
  { name: "ServerChan", key: "xxxxxx", flag: "0" },
  { name: "email", key: "xxxxxx", flag: "0" },
  { name: "dingtalk", key: "xxxxxx", flag: "0" },
  { name: "discord", key: "xxxxxx", flag: "0" },
];
var jsonEmail = { server: "", port: "", sender: "", authorizationCode: "" };

// =================万能福利吧业务变量（须在主流程前声明赋值）===================
// 注意: var 仅提升声明、不提升赋值；主流程在文件中部执行，会先于后面的赋值语句
//       调用 execHandle，故 url1 等变量必须在这里赋值，否则运行时为 undefined。
var wnflbCookie = '';        // 当前账号 cookie
var wnflbFormhash = '';      // 步骤1提取的 formhash
var wnflbMsgSuccess = '';    // 累积成功消息
var wnflbMsgFail = '';       // 累积失败消息
var url1 = 'https://www.wnflb2023.com/plugin.php?id=fx_checkin:list'; // 取formhash/积分/签到结果
var url2Base = 'https://www.wnflb2023.com/plugin.php?id=fx_checkin%3Acheckin&infloat=yes&handlekey=fx_checkin&inajax=1&ajaxtarget=fwin_content_fx_checkin'; // 签到

function checkVesion(){
  try{ let t = Application.Range("A1").Text; Application.Range("A1").Value = t; version = 1; }
  catch{ version = 2; }
}
function emailConfig() {
  for (let i = 0; i < jsonPush.length; i++) {
    if (jsonPush[i].name == "email" && jsonPush[i].flag == 1) {
      let flag = ActivateSheet(sheetNameEmail);
      if (flag == 1) {
        jsonEmail.server = Application.Range("A2").Text;
        jsonEmail.port = Application.Range("B2").Text;
        jsonEmail.sender = Application.Range("C2").Text;
        jsonEmail.authorizationCode = Application.Range("D2").Text;
      }
      break;
    }
  }
}

// =================共用开始===================
  checkVesion()
  flagConfig = ActivateSheet(sheetNameConfig);
  if (flagConfig == 1) {
    for (let i = 2; i <= 100; i++) {
      let name = Application.Range("A" + i).Text;
      if (name == "") break;
      if (name == sheetNameSubConfig) {
        if (Application.Range("C" + i).Text == "是") messageOnlyError = 1;
        if (Application.Range("D" + i).Text == "是") messageNickname = 1;
        break;
      }
    }
  }
  flagPush = ActivateSheet(sheetNamePush);
  if (flagPush == 1) {
    for (let i = 2; i <= line; i++) {
      let pushName = Application.Range("A" + i).Text;
      if (pushName == "") break;
      jsonPushHandle(pushName, Application.Range("C" + i).Text, Application.Range("B" + i).Text);
    }
  }
  emailConfig();
  flagSubConfig = ActivateSheet(sheetNameSubConfig);
  if (flagSubConfig == 1) {
    if(qlSwitch != 1){
      for (let i = 2; i <= line; i++) {
        var cookie = Application.Range("A" + i).Text;
        if (cookie == "") break;
        if (Application.Range("B" + i).Text == "是") execHandle(cookie, i);
      }
      message = messageMerge()
    } else {
      for (let i = 2; i <= line; i++) {
        var cookie = Application.Range("A" + i).Text;
        if (cookie == "") break;
        if (Application.Range("B" + i).Text == "是") {
          console.log("🧑 开始执行用户：" + "1")
          execHandle(cookie, i);
          break;
        }
      }
    }
  }

function ActivateSheet(sheetName) {
    let flag = 0;
    try { let sheet = Application.Sheets.Item(sheetName); sheet.Activate(); flag = 1; }
    catch { flag = 0; }
    return flag;
}
function jsonPushHandle(pushName, pushFlag, pushKey) {
  for (let i = 0; i < jsonPush.length; i++) {
    if (jsonPush[i].name == pushName && pushFlag == "是") { jsonPush[i].flag = 1; jsonPush[i].key = pushKey; }
  }
}
function messageMerge(){
    let msg = ""
  for(i=0; i<messageArray.length; i++){
    if(messageArray[i] != "" && messageArray[i] != null) msg += "\n" + messageHeader[i] + messageArray[i];
  }
  if(msg != "") { console.log(msg + "\n") }
  return msg
}
function sleep(d) { for (var t = Date.now(); Date.now() - t <= d; ); }
function getsign(data) {
    return Crypto.createHash("md5").update(data, "utf8").digest("hex").toString();
}
// =================共用结束===================

// =================万能福利吧业务开始===================
// 结果处理函数（多步链式回调）
// posHttp==1: 解析 formhash + 签到前积分 -> 发起签到请求(步骤2) -> return 0
// posHttp==2: 签到响应(原脚本未解析) -> 发起结果查询(步骤3) -> return 0
// posHttp==3: 解析签到天数 + 当前积分 -> 填充 messageArray -> return 1
function resultHandle(resp, pos){
    posHttp += 1
    let messageName = "";
    if (messageNickname == 1) {
        messageName = Application.Range("C" + pos).Text;
        if(messageName == "") messageName = "单元格A" + pos + "";
    }
    posLabel = pos - 2;
    messageHeader[posLabel] = "👨‍🚀 " + messageName

    // ---- 步骤1：获取 formhash + 签到前积分 ----
    if (posHttp == 1) {
        let html = resp.text();
        let Reg = [
            /formhash=["']?([a-f0-9]{8})["']?/i,  // 收紧：原脚本用 (.+?)& 会把后面 JS 一起捕获，只取 8 位 hex formhash
            /showmenu">积分: (.+?)<\/a>/i,
        ];
        let valueName = ["formhash", "签到前积分"];
        for (let i = 0; i < Reg.length; i++) {
            if (Reg[i].test(html)) {
                let result = Reg[i].exec(html)[1];
                if (i == 1) {
                    let content = "🎉 " + valueName[i] + ":" + result + " ";
                    wnflbMsgSuccess += content;
                    console.log(content);
                } else {
                    wnflbFormhash = result;
                    console.log("🍳 formhash:" + result + " ");
                }
            } else {
                wnflbMsgFail += "❌ " + "formhash获取失败 ";
            }
        }

        // 发起签到请求（步骤2）
        let headers = {
            "Host": "www.wnflb2023.com",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "X-Requested-With": "XMLHttpRequest",
            "Cookie": wnflbCookie,
            "Referer": "https://www.wnflb2023.com/",
            "DNT": 1,
        };
        let url2 = url2Base + "&formhash=" + wnflbFormhash + "&" + wnflbFormhash;
        HTTP.get(url2, { headers: headers });
        return 0;  // 不推进到下一账号，等待步骤2响应
    }

    // ---- 步骤2：签到响应（原脚本未解析），发起结果查询 ----
    if (posHttp == 2) {
        let headers = {
            "Host": "www.wnflb2023.com",
            "Cookie": wnflbCookie,
        };
        HTTP.get(url1, { headers: headers });
        return 0;  // 不推进，等待步骤3响应
    }

    // ---- 步骤3：解析签到天数 + 当前积分 ----
    if (posHttp == 3) {
        let html = resp.text();
        let Reg = [
            /累计签到:<i>(.+?)<\/i>天/i,
            /已连续签到:<i>(.+?)<\/i>天/i,
            /showmenu">积分: (.+?)<\/a>/i,
        ];
        let valueName = ["累计签天数", "已连签天数", "当前积分"];
        for (let i = 0; i < Reg.length; i++) {
            if (Reg[i].test(html)) {
                let result = Reg[i].exec(html)[1];
                if (result == "{days}" || result == "{constant}") {
                    // 占位符，跳过
                } else {
                    let content = "🎉 " + valueName[i] + ":" + result + " ";
                    wnflbMsgSuccess += content;
                    console.log(content);
                }
            } else {
                wnflbMsgFail += "❌ " + "签到数据获取失败 ";
            }
        }

        // 汇总当前账号消息
        if (messageOnlyError == 1) {
            messageArray[posLabel] = wnflbMsgFail;
        } else {
            messageArray[posLabel] = wnflbMsgFail != "" ? wnflbMsgFail + " " + wnflbMsgSuccess : wnflbMsgSuccess;
        }
        if (messageArray[posLabel] != "") console.log(messageArray[posLabel]);
        return 1;  // 本账号完成，推进到下一账号
    }

    return 1;  // 兜底
}

// 执行函数：发起步骤1请求（获取 formhash）
function execHandle(cookie, pos) {
    posHttp = 0
    qlpushFlag -= 1
    // 重置当前账号的中间状态
    wnflbCookie = cookie;
    wnflbFormhash = '';
    wnflbMsgSuccess = '';
    wnflbMsgFail = '';

    let headers = {
        "Host": "www.wnflb2023.com",
        "Cookie": cookie,
    };

    // 步骤1：获取 formhash + 签到前积分
    resp = HTTP.get(url1, { headers: headers });

    // QL 模式(qlSwitch==1)下由 shim 异步链驱动步骤2/3；
    // 金山文档同步模式不支持多步链，仅做单步兼容。
    if (qlSwitch != 1) {
        resultHandle(resp, pos)
    }
}

global.resultHandle = resultHandle;
global.execHandle = execHandle;
global.messageMerge = messageMerge;
// =================万能福利吧业务结束===================