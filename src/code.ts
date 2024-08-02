import {Freee} from './service/freee';
import SpreadsheetUtils from './SpreadsheetUtils';
import Props from './props';

const APP_NAME = 'toggl to freee';

/**
 * スプレッドシートのオープンイベント処理
 * メニューを追加する
 */
function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  const addon = ui.createAddonMenu();
  addon.addItem('サイドバーを表示', 'showSidebar');
  addon.addItem('設定', 'showSettingDialog');
  addon.addToUi();
}

/**
 * アドオンインストールイベント処理
 * メニューを追加する
 */
function onInstall(): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  onOpen();
}

/**
 * サイドバー表示
 */
function showSidebar(): void {  // eslint-disable-line @typescript-eslint/no-unused-vars
  const sidebarTmpl = HtmlService.createTemplateFromFile('view/sidebar');
  const sidebar = sidebarTmpl.evaluate();
  sidebar.setSandboxMode(HtmlService.SandboxMode.IFRAME);
  sidebar.setTitle(APP_NAME);
  SpreadsheetApp.getUi().showSidebar(sidebar);
}

/**
 * 設定ダイアログ表示
 */
function showSettingDialog(): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  const template = HtmlService.createTemplateFromFile('view/setting_dialog');
  const dialog = template.evaluate();
  dialog.setWidth(400).setHeight(450);
  const ui = SpreadsheetApp.getUi();
  ui.showModelessDialog(dialog, '設定');
}

/**
 * freee にログインする
 */
function freeeLogin(): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  const freee = new Freee();
  if (!freee.inLogin()) {
    const authorizationUrl = freee.getAuthorizationUrl();
    const template = HtmlService.createTemplate(
      '<a href="<?= authorizationUrl ?>" target="_blank">freee の認証ページを開く</a>. ',
    );
    template.authorizationUrl = authorizationUrl;
    const title = 'freeeアプリの認可処理';
    const content = template.evaluate();
    createModelessDialog(title, content);
  } else {
    const user = freee.getUser();
    SpreadsheetApp.getActiveSpreadsheet().toast(`OAuth認可済みです。認可されたユーザー名：${user.display_name}`, 'freee');
  }
}

function inLogin(): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
  const freee = new Freee();
  return freee.inLogin();
}

/**
 * freee からログアウトする
 */
function freeeLogout(): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  const freee = new Freee();
  freee.logout();
  SpreadsheetApp.getActiveSpreadsheet().toast(`freee からログアウトしました`, 'freee');
}

/**
 * freee の所属する事業所の一覧を取得する
 */
function getCompanies(): Array<{id: number, name: string}> { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const freee = new Freee();
    const companies = freee.getCompanies();
    return companies;
  } catch (error) {
    const user = Session.getTemporaryActiveUserKey();
    const message = 'freeeの会社情報取得でエラーが発生しました。';
    console.error({ user, message, error });
    throw new Error(`${message} \n[${user}]`);
  }
}

/**
 * freee のプロジェクトとタグの一覧を FREEE_PROJECTS_TAGS という名前のシートに出力する
 * @param companyId 事業所ID
 */
function outputFreeeProjectTags(companyId: number): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const freee = new Freee();
    const activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = 'FREEE_PROJECTS_TAGS';
    const ss = new SpreadsheetUtils(activeSpreadSheet.getId());
    const output = freee.getProjectsTags(companyId);
    ss.writeToSheet(sheetName, output);

    activeSpreadSheet.toast(`${sheetName} を出力しました`);
  } catch (error) {
    const user = Session.getTemporaryActiveUserKey();
    const message = 'freee のプロジェクト・タグのデータの読み出しでエラーが発生しました。';
    console.log({error: error});
    throw new Error(`${message} \n[${user}]`);
  }
}

/**
 *  シートの工数を freee 工数管理を登録する
 * @param companyId 事業所ID
 */
function addTimeEntryFromSheet(companyId: number): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const freee = new Freee();
    const sheetName = SpreadsheetApp.getActiveSheet().getName();
    const count = freee.entryWorkloads(companyId, sheetName);

    const activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    activeSpreadSheet.toast(`freee 工数管理に ${count} 件を登録しました`);
  } catch (error) {
    const user = Session.getTemporaryActiveUserKey();
    const message = 'freee 工数管理の登録でエラーが発生しました。';
    console.log({error: error});
    throw new Error(`${message} \n[${user}]`);
  }
}

/**
 * エラーメッセージを表示する
 * @param message エラーメッセージ
 */
function showError(message: string): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  const ui = SpreadsheetApp.getUi();
  ui.alert('ERROR', message, ui.ButtonSet.OK);
}

/**
 * プロパティを保存する
 * @param props プロパティのhash
 */
function setProps(props: { [key: string]: string }): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  Props.setProps(props);
}

/**
 * 設定が有効かどうかを判定する
 * @return すべての設定に値がある場合 true。それ以外はfalse
 */
function hasInvalidProps(): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
  return !Props.isValid();
}

/**
 * ダイアログを開く
 * @param title タイトル
 * @param content コンテンツ
 */
function createModelessDialog(title: string, content: GoogleAppsScript.Base.BlobSource) {
  const htmlOutput = HtmlService.createHtmlOutput(content)
    .setWidth(360)
    .setHeight(120);
  SpreadsheetApp.getUi().showModelessDialog(htmlOutput, title);
}
