/*
    name: "学姐吧"
    cron: 30 0 9 * * *
    环境变量名: XUEJIEBA_COOKIE_LIST
    环境变量值: 填写cookie（gg_info=xxx; b2_token=xxx）
*/

const { installShim } = require('../_lib/airscriptShim');
installShim({
  taskName: 'xuejieba', configKey: 'XUEJIEBA_COOKIE_LIST',
  pushHeader: '【学姐吧】', primaryField: 'cookie',
  requiresAccount: true, line: 21
});

const logo = "ql_sign_script : https://github.com/unitaryhighs/ql_sign_script"
var sheetNameSubConfig = "xuejieba";
var pushHeader = "【学姐吧】";
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

// 结果处理函数
function resultHandle(resp, pos){
    posHttp += 1
    let messageSuccess = "";
    let messageFail = "";
    let messageName = "";
    if (messageNickname == 1) {
        messageName = Application.Range("C" + pos).Text;
        if(messageName == "") messageName = "单元格A" + pos + "";
    }
    posLabel = pos - 2;
    messageHeader[posLabel] = "🧑 " + messageName

    if (resp.status == 200) {
        resp = resp.json();
        console.log(resp)
        // 成功响应含 mission 对象：{credit:10, mission:{always:"2", my_credit:"39", ...}}
        if (resp && typeof resp === 'object' && resp.mission) {
            // 本次获得积分取顶层 credit，连续天数与总积分取自 mission
            let credit = resp.credit != null ? resp.credit : resp.mission.credit;
            let always = resp.mission.always;
            let myCredit = resp.mission.my_credit;
            content = "🎉 签到成功！积分+" + credit;
            if (always != null) content += "\n📅 连续签到" + always + "天";
            if (myCredit != null) content += "\n💰 当前积分：" + myCredit;
            messageSuccess += content;
        } else if (resp !== null && typeof resp !== 'object') {
            // B2 主题：今日已签到时返回裸数字/数字字符串（今日已得积分），视为已签到提示
            messageSuccess += "📢 今日已签到（今日积分+" + resp + "）";
        } else {
            // 其余情况取 error/message 字段（如未登录等错误）
            let msg = resp ? (resp.error || resp.message || "签到失败") : "签到失败";
            if (typeof msg != "string") msg = JSON.stringify(msg);
            msg = msg.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
            // 含"登录"算失败，其余（如"今天已签到"）算提示
            if (msg.indexOf("登录") != -1) {
                messageFail += "❌ " + msg;
            } else {
                messageSuccess += "📢 " + msg;
            }
        }
    } else {
        // 非 200：尝试解析 JSON 提取错误信息（如 WP REST 的 message 字段）
        let msg = "签到失败";
        let j = resp.json();
        if (j) {
            if (j.message) msg = j.message;
            else if (j.error) msg = j.error;
        }
        if (typeof msg != "string") msg = JSON.stringify(msg);
        msg = msg.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        messageFail += "❌ " + msg;
    }

    flagResultFinish = 1;
    if (messageOnlyError == 1) {
      messageArray[posLabel] = messageFail;
    } else {
      messageArray[posLabel] = messageFail != "" ? messageFail + " " + messageSuccess : messageSuccess;
    }
    return flagResultFinish
}

// 执行函数
function execHandle(cookie, pos) {
    posHttp = 0
    qlpushFlag -= 1
    messageSuccess = "";
    messageFail = "";

    var url = "https://xuejieba2026.com/wp-json/b2/v1/userMission";
    // 从 cookie 中提取 b2_token 构造 Bearer 鉴权头（B2 主题凭 cookie 里的 b2_token 鉴权）
    let tokenMatch = cookie.match(/b2_token=([^;]+)/);
    let token = tokenMatch ? tokenMatch[1] : "";
    headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      'Cookie': cookie,
      'Authorization': 'Bearer ' + token,
      'Origin': 'https://xuejieba2026.com',
      'Referer': 'https://xuejieba2026.com/bbs',
      'Accept': 'application/json, text/plain, */*',
    };
    // 签到接口无请求体，传 undefined 保持空 body（对应抓包 content-length: 0）
    resp = HTTP.post(url, undefined, { headers: headers });

    if(qlSwitch != 1){
        resultHandle(resp, pos)
    }
}

global.resultHandle = resultHandle;
global.execHandle = execHandle;
global.messageMerge = messageMerge;