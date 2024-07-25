# toggl track to freee workload

[Toggl Track](https://toggl.com/) のデータを Google Sheets にエクスポートして、
[freee工数管理](https://www.freee.co.jp/lp/project-management/202304_2/?utm_source=google&utm_medium=cpc&utm_campaign=lis1&gad_source=1&gclid=Cj0KCQjwudexBhDKARIsAI-GWYXqBjeqD4Fa1XZHWrv_E8CASc4OQx4voPvx6NuSu20N6WfkGHvXT6AaAtumEALw_wcB)
に登録する Google Sheets の Add-on。

[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)

## Setup

次のコマンドでインストールする。
事前に[Google App Script APIを有効](https://script.google.com/home/usersettings)にして [clasp にログイン](https://github.com/google/clasp#login)しておくこと。

```console
$ git clone https://github.com/HeRoMo/toggl-to-freee-workload.git
$ cd toggl-to-freee-workload
$ yarn clasp create --type sheets --rootDir src --title toggl-to-freee-workload
$ yarn clasp:push
```

`clasp create` の `--title` オプションの値は任意で構わない。

## 事前準備

## freee アプリの作成

1. [freeeアプリストア](https://app.secure.freee.co.jp/developers/applications) にアクセスする
2. 「新規追加」をクリックして新しいアプリを作成する
    - アプリ名：任意でOK
    - 概要：任意でOK
    - アプリタイプ：プライベートを選択
3. 作成すると **ClientID** と **Client Secret** が発行される。 
    - **ClientID** と **Client Secret** は後で使う。
    - コールバックURLはまだそのままでOK
4. 権限設定で次の項目にはチェックを入れる
   - [人事労務] 勤怠: 参照のみでOK
   - [工数管理] 従業員
   - [工数管理] チーム
   - [工数管理] プロジェクト: 参照のみでOK
   - [工数管理] プロジェクト詳細
   - [工数管理] 従業員単価
   - [工数管理] 取引先
   - [工数管理] 工数：参照、更新ともにチェックする
5. 設定したら保存する

### GASアプリの設定

1. スクリプトが関連づいているスプレッドシートを開く
   - `yarn clasp open --addon` を実行すると開く
2. メニュー「拡張機能」の中に**toggl-to-freee-workload**という項目ができているのでそのサブメニューの「設定」を選択する
3. 設定ダイアログが開くので各項目を入力して保存する。
    - Toggle のAPI トークンは toggl track のプロフィールからコピーして入力する
    - **ClientID** と **Client Secret** には先程作成した freee アプリの値を入力する
    - コールバックURLはコピーして先程の freee アプリのコールバックURLに入力する
4. 入力したら「保存」する

### TOGGL_FREEE_MAP シートの作成

1. 「拡張機能」の**toggl-to-freee-workload** の「サイドバーを表示」を選択する
2. サイドバーのTogglの「プロジェクト・タグを出力する」ボタンをクリックする
3. TOGGL_PROJECTS_TAGS という名前のシートが作られ toggl のプロジェクトとタグの一覧が出力される
4. freee工数管理の「プロジェクト・タグを出力する」ボタンをクリックする
5. FREEE_PROJECTS_TAGS という名前のシートが作られ freee工数管理のプロジェクトとタグの一覧が出力される
   - 自分が参画していないプロジェクトも出力されることに注意
6. TOGGL_FREEE_MAP という名前のシートを作成し、カラムヘッダとして1行目に次のカラム名を記入する
   - togglProjectId	
   - togglProjectName	
   - togglTagId	
   - togglTagName		
   - freeeProjectId	
   - freeeProjectName	
   - freeeTagGroupId	
   - freeeTagGroupName	
   - freeeTagId	
   - freeeTagName
7. TOGGL_PROJECTS_TAGS と FREEE_PROJECTS_TAGS を元にtogglとfreee工数管理のプロジェクト・タグ対照表を作成する

以上で準備は完了。

## 使い方

### toggl データの出力

1. togglデータを出力したいシートを選択する
2. サイドバーを表示し toggl の workspace と 年月を選択して「読み出し」ボタンをクリックする
3. シートに toggl のデータが出力されるので確認する
   - freeeTagGroupId、freeeTagGroupName、freeeTagId、freeeTagName が出力されていない行は toggl データのプロジェクト・タグの組み合わせが間違っているか TOGGL_FREEE_MAP が間違っているので修正する
   - freee工数管理のプロジェクト *[その他]その他業務（開発以外）* はタグがないので空白で構わない

### freee工数管理へのデータ登録
1. データを確認したらサイドバーの freee工数管理の「工数を登録」をクリックする
   - シートの内容が工数として登録される
2. [工数 | freee工数管理](https://pm.secure.freee.co.jp/workloads/weekly) で登録した工数を確認する


## Develop 
### Push the codes and open in web editor
You can push the codes to GAS by the following command.

```console
$ yarn clasp:push
```

And you can open your GAS project in web editor by the following command.

```console
$ yarn clasp:open
```

### Linting

Run the following command, you can check the codes by ESLint.

```console
$ yarn lint
```

### Testing

Run the following command, you can test the codes by jest locally.

```console
$ yarn test
```

## LICENSE

[MIT](./LICENSE)

## libs

- [GitHub - googleworkspace/apps-script-oauth2: An OAuth2 library for Google Apps Script.](https://github.com/googleworkspace/apps-script-oauth2)
