/*
    name: "菜玩社区"
    cron: 30 0 9 * * *
    环境变量名: CAIGAMER_COOKIE_LIST
    环境变量值: 填写cookie（bbs_sid=xxx; bbs_token=xxx）
*/

const { installShim } = require('../_lib/airscriptShim');
installShim({
  taskName: 'caigamer', configKey: 'CAIGAMER_COOKIE_LIST',
  pushHeader: '【菜玩社区】', primaryField: 'cookie',
  requiresAccount: true, line: 21
});

const logo = "ql_sign_script : https://github.com/unitaryhighs/ql_sign_script"
var sheetNameSubConfig = "caigamer";
var pushHeader = "【菜玩社区】";
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
        code = resp["code"]
        // 保留换行，便于推送展示签到名次与连签奖励 / keep newlines for readable push
        msg = (resp["message"] || "").replace(/<br\s*\/?>/gi, "\n").trim()

        // 菜玩社区成功时 code 为字符串 "0"，用 == 兼容字符串与数字
        if(code == 0) {
            content = "🎉 " + msg
            messageSuccess += content;
        } else {
            if(msg.indexOf("登录") != -1){
                content = "❌ " + msg
                messageFail += content;
            } else {
                content = "📢 " + msg
                messageSuccess += content;
            }
        }
    } else {
        content = "❌ 签到失败"
        messageFail += content;
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

    var url = "https://caigamer.cn/my-sign.htm";
    headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      'Cookie': cookie,
      'Origin': 'https://caigamer.cn',
      'Referer': 'https://caigamer.cn/',
      'Accept': 'text/plain, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    };
    // 签到接口无需请求体，传 undefined 保持空 body（对应抓包的 content-length: 0）
    resp = HTTP.post(url, undefined, { headers: headers });

    if(qlSwitch != 1){
        resultHandle(resp, pos)
    }
}

global.resultHandle = resultHandle;
global.execHandle = execHandle;
global.messageMerge = messageMerge;