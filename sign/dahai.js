/*
    name: "大海资源站"
    cron: 45 0 9 * * *
    环境变量名: DAHAI_COOKIE_LIST
    环境变量值: 填写 cookie
    备注: 大海资源站每日签到，需登录 cookie（WordPress 站点）
*/

const { installShim } = require('../_lib/airscriptShim');
installShim({
  taskName: 'dahai', configKey: 'DAHAI_COOKIE_LIST',
  pushHeader: '【大海资源站】', primaryField: 'cookie',
  requiresAccount: true, line: 21
});

const logo = "ql_sign_script : https://github.com/unitaryhighs/ql_sign_script"
var sheetNameSubConfig = "dahai";
var pushHeader = "【大海资源站】";
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
        // 大海资源站返回 error 字段：false 为签到成功
        let error = resp["error"]
        // 清理 msg 中的 HTML 标签，方便推送展示 / strip HTML tags for cleaner push
        let msg = (resp["msg"] || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()

        if (error == false) {
            // 签到成功，msg 形如：签到成功！ 积分+10 经验值+30
            content = "🎉 " + msg
            // 连续签到天数
            let continuousDay = resp["continuous_day"]
            if (continuousDay != null) {
              content += "\n📅 连续签到" + continuousDay + "天"
            }
            messageSuccess += content;
        } else {
            // 签到失败 / 已签到 / 未登录等，按消息内容区分
            if (msg.indexOf("登录") != -1) {
              content = "❌ " + msg
              messageFail += content;
            } else {
              // 例如"今天已签到"等非致命提示
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

    var url = "https://vip.lzzcc.cn/wp-admin/admin-ajax.php";
    headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      'Cookie': cookie,
      // shim 用精确匹配判断表单格式，此处必须写 application/x-www-form-urlencoded
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': 'https://vip.lzzcc.cn',
      'Referer': 'https://vip.lzzcc.cn/',
    };
    // 传对象而非字符串，shim 按 Content-Type 自动转为表单格式 action=user_checkin
    data = { "action": "user_checkin" };

    resp = HTTP.post(url, data, { headers: headers });

    if(qlSwitch != 1){
        resultHandle(resp, pos)
    }
}

global.resultHandle = resultHandle;
global.execHandle = execHandle;
global.messageMerge = messageMerge;