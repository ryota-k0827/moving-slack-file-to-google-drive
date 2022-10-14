# moving-slack-file-to-google-drive
SlackにアップロードされたファイルをGoogle Driveに転送するアプリ  
(このリポジトリはGASプロジェクト)

## 使用技術
- GAS
- Glitch(Node.js)
- Slack API

## 仕様
1. 画像などのデータを Slack にアップロードすると、EventAPI の通知が飛ぶ
2. Glitch 上のアプリケーションが、Google Apps Script(GAS) のプログラムを起動
3. GAS が Slack 上のファイルを取得する
4. Google Drive にアップロードする
5. アップロードしたファイルの共有リンクを取得する
6. Slack 上の元ファイルを削除する
7. 共有リンクを Glitch のアプリケーションに返却
8. Glitch のアプリケーションが Slack の元ポストを編集して、共有リンクを貼る

## プロジェクトリンク
- [Glitch Project - moving-slack-file-to-google-drive](https://glitch.com/edit/#!/moving-slack-file-to-google-drive)
