/*
    name: "词霸每日一句"
    cron: 0 25 11 * * *
    脚本兼容: 青龙
    环境变量名: CIBA_LIST
    备注: 获取词霸每日一句，无需账号
*/

const { installShim } = require('../_lib/airscriptShim');

// ---- 安装干净版 shim（替换原混淆块）----
installShim({
  taskName: 'ciba',
  configKey: 'CIBA_LIST',
  pushHeader: '【词霸每日一句】',
  primaryField: 'cookie',
  extraFields: ['cn', 'en'],
  requiresAccount: false,
  line: 21
});

// =================业务代码===================
// 以下代码保持与原脚本一致，仅删除了混淆 QL 适配块
// push 相关函数（bark/pushplus 等）在 QL 模式下不执行，已省略

const logo = "ql_sign_script : https://github.com/unitaryhighs/ql_sign_script"
var sheetNameSubConfig = "ciba";
var pushHeader = "【词霸每日一句】";
var sheetNameConfig = "CONFIG";
var sheetNamePush = "PUSH";
var sheetNameEmail = "EMAIL";
var flagSubConfig = 0;
var flagConfig = 0;
var flagPush = 0;
var line = 21;
var message = "";
var messageArray = [];
var messageOnlyError = 0;
var messageNickname = 0;
var messageHeader = [];
var messagePushHeader = pushHeader;
var version = 1;
var separator = "##########MOKU##########";
var maxMessageLength = 400;
var messageDistance = 100;

var jsonPush = [
  { name: "bark", key: "xxxxxx", flag: "0" },
  { name: "pushplus", key: "xxxxxx", flag: "0" },
  { name: "ServerChan", key: "xxxxxx", flag: "0" },
  { name: "email", key: "xxxxxx", flag: "0" },
  { name: "dingtalk", key: "xxxxxx", flag: "0" },
  { name: "discord", key: "xxxxxx", flag: "0" },
];
var jsonEmail = {
  server: "",
  port: "",
  sender: "",
  authorizationCode: "",
};

// ---- airscript 版本检测 ----
function checkVesion(){
  try{
    let temp = Application.Range("A1").Text;
    Application.Range("A1").Value = temp
    console.log("😶‍🌫️ 检测到当前airscript版本为1.0")
  }catch{
    console.log("😶‍🌫️ 检测到当前airscript版本为2.0")
    version = 2
  }
}

function getDate(){
  let d = new Date();
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}

// ---- 邮箱配置 ----
function emailConfig() {
  console.log("🍳 开始读取邮箱配置");
  let length = jsonPush.length;
  for (let i = 0; i < length; i++) {
    if (jsonPush[i].name == "email" && jsonPush[i].flag == 1) {
      let flag = ActivateSheet(sheetNameEmail);
      if (flag == 1) {
        for (let i = 2; i <= 2; i++) {
          jsonEmail.server = Application.Range("A" + i).Text;
          jsonEmail.port = Application.Range("B" + i).Text;
          jsonEmail.sender = Application.Range("C" + i).Text;
          jsonEmail.authorizationCode = Application.Range("D" + i).Text;
          if (Application.Range("A" + i).Text == "") break;
        }
      }
      break;
    }
  }
}

// =================共用开始===================
  checkVesion()

  flagConfig = ActivateSheet(sheetNameConfig);
  if (flagConfig == 1) {
    console.log("🍳 开始读取主配置表");
    let name, onlyError, nickname;
    for (let i = 2; i <= 100; i++) {
      name = Application.Range("A" + i).Text;
      onlyError = Application.Range("C" + i).Text;
      nickname = Application.Range("D" + i).Text;
      if (name == "") break;
      if (name == sheetNameSubConfig) {
        if (onlyError == "是") { messageOnlyError = 1; console.log("🍳 只推送错误消息"); }
        if (nickname == "是") { messageNickname = 1; console.log("🍳 单元格用昵称替代"); }
        break;
      }
    }
  }

  flagPush = ActivateSheet(sheetNamePush);
  if (flagPush == 1) {
    console.log("🍳 开始读取推送工作表");
    let pushName, pushKey, pushFlag;
    for (let i = 2; i <= line; i++) {
      pushName = Application.Range("A" + i).Text;
      pushKey = Application.Range("B" + i).Text;
      pushFlag = Application.Range("C" + i).Text;
      if (pushName == "") break;
      jsonPushHandle(pushName, pushFlag, pushKey);
    }
  }

  emailConfig();

  flagSubConfig = ActivateSheet(sheetNameSubConfig);
  if (flagSubConfig == 1) {
    console.log("🍳 开始读取分配置表");
    if(qlSwitch != 1){  // 金山文档
      for (let i = 2; i <= line; i++) {
        var cookie = Application.Range("A" + i).Text;
        var exec = Application.Range("B" + i).Text;
        if (cookie == "") break;
        if (exec == "是") execHandle(cookie, i);
      }
      message = messageMerge()
    } else {  // 青龙
      for (let i = 2; i <= line; i++) {
        var cookie = Application.Range("A" + i).Text;
        var exec = Application.Range("B" + i).Text;
        if (cookie == "") break;
        if (exec == "是") {
          console.log("🧑 开始执行用户：1")
          execHandle(cookie, i);
          break;  // 只取一个，其余由 shim 异步链驱动
        }
      }
    }
  }

// 激活工作表函数
function ActivateSheet(sheetName) {
    let flag = 0;
    try {
      let sheet = Application.Sheets.Item(sheetName);
      sheet.Activate();
      console.log("🥚 激活工作表：" + sheet.Name);
      flag = 1;
    } catch {
      flag = 0;
      console.log("🍳 无法激活工作表，工作表可能不存在");
    }
    return flag;
}

function jsonPushHandle(pushName, pushFlag, pushKey) {
  let length = jsonPush.length;
  for (let i = 0; i < length; i++) {
    if (jsonPush[i].name == pushName) {
      if (pushFlag == "是") {
        jsonPush[i].flag = 1;
        jsonPush[i].key = pushKey;
      }
    }
  }
}

function messageMerge(){
    let message = ""
  for(i=0; i<messageArray.length; i++){
    if(messageArray[i] != "" && messageArray[i] != null) {
      message += "\n" + messageHeader[i] + messageArray[i] + "";
    }
  }
  if(message != "") {
    console.log("✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨")
    console.log(message + "\n")
    console.log("✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨")
  }
  return message
}

function sleep(d) {
  for (var t = Date.now(); Date.now() - t <= d; );
}

function getsign(data) {
    var sign = Crypto.createHash("md5")
        .update(data, "utf8")
        .digest("hex")
        .toString();
    return sign;
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
    messageHeader[posLabel] = ""

    if (resp.status == 200) {
        resp = resp.json();
        respnote = resp["note"]
        respcontent = resp["content"]

        cn = Application.Range("D" + pos).Text;
        en = Application.Range("E" + pos).Text;
        if(cn == "是"){
          content = respnote + "\n"
          messageSuccess += content;
        }
        if(en == "是"){
          content = respcontent + "\n"
          messageSuccess += content;
        }
    } else {
        content = "❌ 词霸每日一句" + "\n"
        messageFail += content;
    }

    flagResultFinish = 1;

    if (messageOnlyError == 1) {
      messageArray[posLabel] = messageFail;
    } else {
      if(messageFail != ""){
        messageArray[posLabel] = messageFail + " " + messageSuccess;
      }else{
        messageArray[posLabel] = messageSuccess;
      }
    }

    return flagResultFinish
}

// 具体的执行函数
function execHandle(cookie, pos) {
    posHttp = 0
    qlpushFlag -= 1
    messageSuccess = "";
    messageFail = "";

    let url = "https://open.iciba.com/dsapi/";
    headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.70",
    }
    data = {}

    if(qlSwitch != 1){  // 金山文档
      resp = HTTP.get(url, {headers: headers});
      resultHandle(resp, pos)
    } else {  // 青龙
      option = "get"
      resp = HTTP.post(url, data, { headers: headers }, option);
    }
}

// ---- 注册回调：让 shim 的异步链能调用业务函数 ----
global.resultHandle = resultHandle;
global.execHandle = execHandle;
global.messageMerge = messageMerge;
