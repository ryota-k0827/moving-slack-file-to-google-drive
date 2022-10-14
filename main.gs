// DriveAppの権限取得のため、一度実行する
function Test(){
  DriveApp.getRootFolder().getFiles();
}

// Glitchから呼ばれる
function doPost(e){
  const params = JSON.parse(e.postData.getDataAsString());

  switch (params.func){
    case "authorization":
      return authorization(params.user_id, params.token);
    case "deauthorization":
      return deauthorization(params.user_id);
    case "checkAuthorization":
      return checkAuthorization(params.user_id);
    case "getUserToken":
      return getUserToken(params.user_id);
    case "transferFile":
      return transferFile(params.user_id, params.file_info);
  }
}

// 認可
function authorization(userId, token){
  PropertiesService.getUserProperties().setProperty('TOKEN'+userId, token);
  return ContentService.createTextOutput('{"result": true}');
}

// 認可解除
function deauthorization(user_id) {
  const userProperties = PropertiesService.getUserProperties();
  const token = userProperties.getProperty('TOKEN' + user_id);
  // Slackのユーザトークンの無効化
  try{
    const options = {
      method: 'GET',
      payload: {
        token: token
      }
    }
    UrlFetchApp.fetch('https://slack.com/api/auth.revoke', options);
  } catch (e) {
    return ContentService.createTextOutput('{"result": false}');
  }
  userProperties.deleteProperty('TOKEN' + user_id);      
  return ContentService.createTextOutput('{"result": true}');
}

// ユーザのトークンがあるかどうか
function checkAuthorization(user_id) {
  const userProperties = PropertiesService.getUserProperties();
  const token = userProperties.getProperty('TOKEN'+ user_id);
  const result = (token != null);
  return ContentService.createTextOutput('{"result":'+ result +'}');
}

// ユーザトークンの取得
function getUserToken(user_id) {
  const userProperties = PropertiesService.getUserProperties();
  const token = userProperties.getProperty('TOKEN' + user_id);
  if (token == null) {
    return ContentService.createTextOutput('{"user_token": undefined}');
  }
  return ContentService.createTextOutput('{"user_token": "' + token + '"}');
}

// ファイル転送
function transferFile (userId, fileInfo) {
  // google driveのリンクなら無視
  if(fileInfo.external_type == 'gdrive'){
    return ContentService.createTextOutput('{"isTransfered": false}');
  }

  const userProperties = PropertiesService.getUserProperties();
  const scriptProperties = PropertiesService.getScriptProperties();

  const token = userProperties.getProperty('TOKEN' + userId);
  if (token == null) {
    return ContentService.createTextOutput('{"isTransfered": false}');
  }

  // ファイルをslackから取得
  const params = {
    method:"GET",
    headers: {
      "Authorization" : "Bearer " + token
    }
  };
  const dlData = UrlFetchApp.fetch(fileInfo.url, params).getBlob();

  // アップロード先のフォルダIDを取得
  const rootFolderId = scriptProperties.getProperty("FOLDER_ID");
  // ファイルをGoogleDriveにアップロード
  const result = uploadFile(rootFolderId, fileInfo.user_name, dlData, fileInfo.mimetype, fileInfo.file_name, token, fileInfo.id, fileInfo.filetype);

  return ContentService.createTextOutput(result);
}

function uploadFile(rootFolderId, userName, dlData, contentType, fileName, token, fileId, filetype){
  // file botに飲み込ませたくないファイルを指定
  const notCopyFileType = ["txt", "text", "applescript", "binary", "space", "c", "csharp", "cpp", "css", "csv", "clojure", "coffeescript", "dart", "d", "erlang", "fsharp", "fortran", "go", "groovy", "handlebars", "haskell", "haxe", "java", "javascript", "kotlin", "latex", "lisp", "lua", "markdown", "ocaml", "xml", "yaml", "pascal", "perl", "powershell", "verilog", "swift", "rtf", "ruby", "rust", "sql", "scala", "post", "php", "python", "vbscript"];
  // txtなどは除外
  for(i in notCopyFileType) {
    if(filetype == notCopyFileType[i]){
      return '{isTransfered: false}';
    }
  }

  // アップロードしたユーザごとにフォルダ分けする
  let folderTarget = DriveApp.getFolderById(rootFolderId);
  const folderID = folderTarget.getFoldersByName(userName +"_slackItems");
  if(!folderID.hasNext()){
    folderTarget = folderTarget.createFolder(userName +"_slackItems");
  } else {
    folderTarget = DriveApp.getFolderById(folderID.next().getId());
  }

  // file名の文字化け対策として、名前をセットし直す
  dlData.setName(fileName);

  // ContentTypeによっては、slackのプレビューで再生できないので、修正を入れる
  if (contentType == "audio/vnd.wave"){
    dlData.setContentType("audio/wav");
  }

  try {
    // ファイルアップロード
    const driveFile = folderTarget.createFile(dlData);

    // 共有設定
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 削除
    deleteFile(token, fileId);

    // おまじない
    Utilities.sleep(100);  

    return '{"isTransfered": true, "url":"' + driveFile.getUrl() + '"}';  
  }catch(e){
    // おまじない
    Utilities.sleep(100);

    if (driveFile == undefined) return '{"isTransfered": false}';

    return '{"isTransfered": true, "url":"' + driveFile.getUrl() + '"}';
  }
}

// slackからファイル削除
function deleteFile(token, fileId){
  const options = {
    method: 'POST',
    payload: {
      token: token,
      file : fileId
    }
  };
  // 元ファイルの削除  
  const res = UrlFetchApp.fetch('https://slack.com/api/files.delete',options);
}