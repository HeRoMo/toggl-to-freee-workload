import Props from './props';
import {Freee} from "./service/freee";

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
function hasInvalidSetting(): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
  const freee = new Freee();
  return !(Props.isValid() && freee.inLogin());
}
