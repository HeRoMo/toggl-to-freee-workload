import Toggl from './toggl';
import Props from './props';

const APP_NAME = 'Toggl2freee';

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
  const sidebarTmpl = HtmlService.createTemplateFromFile('sidebar');
  const sidebar = sidebarTmpl.evaluate();
  sidebar.setSandboxMode(HtmlService.SandboxMode.IFRAME);
  sidebar.setTitle(APP_NAME);
  SpreadsheetApp.getUi().showSidebar(sidebar);
}

/**
 * 設定ダイアログ表示
 */
function showSettingDialog(): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  const template = HtmlService.createTemplateFromFile('setting_dialog');
  const dialog = template.evaluate();
  dialog.setWidth(400).setHeight(450);
  const ui = SpreadsheetApp.getUi();
  ui.showModelessDialog(dialog, '設定');
}

/**
 * Togglのワークスペースを取得する
 * @return ワークスペースの{id, name}のリスト
 */
function getWorkspaces(): Array<{id: number, name: string}> { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    return Toggl.getWorkspaces();
  } catch (error) {
    const user = Session.getTemporaryActiveUserKey();
    const message = 'Togglのワークスペース取得でエラーが発生しました。';
    console.error({ user, message, error });
    throw new Error(`${message} \n[${user}]`);
  }
}

/**
 * データをスプレッドシートに書き込む。
 * [taskId, ticketNo, startDate, duration(H), memo, taskDescription]の配列
 * @param report
 */
function writeToSheet(report: object[][]): void {
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.getDataRange().clear();
  const rowCount = report.length;
  const columnCount = report[0].length;
  const range = sheet.getRange(1, 1, rowCount, columnCount);
  range.setValues(report);
}

/**
 * Togglからレポートを取得し、スプレッドシートに書き込む
 * @param workplaceId ワークプレイスID
 * @param year        レポートを取得する年
 * @param month       レポートを取得する月
 */
function fillSheetWithReport( // eslint-disable-line @typescript-eslint/no-unused-vars
  workplaceId: number,
  year: number,
  month: number,
) {
  try {
    const report = Toggl.getAllReport(workplaceId, year, month);
    const totalCount = Math.max(report.length - 1, 0); // ヘッダ行を引いておく
    const count = Math.max(report.length - 1, 0); // ヘッダ行を引いておく
    console.info({ message: `Togglから ${count} 件取得しました`, totalCount, count });
    SpreadsheetApp.getActiveSpreadsheet().toast(`Success ${count}件取得しました`, 'Toggl');
    writeToSheet(report);
  } catch (error) {
    const user = Session.getTemporaryActiveUserKey();
    const message = 'Togglデータの読み出しでエラーが発生しました。';
    console.error({ user, message, error });
    throw new Error(`${message} \n[${user}]`);
  }
}

function freeeLogin(): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  const ui = SpreadsheetApp.getUi();
  ui.alert('INFO', 'TODO: implements', ui.ButtonSet.OK);
}

function addTimeEntryFromSheet(): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  const ui = SpreadsheetApp.getUi();
  ui.alert('INFO', 'TODO: implements', ui.ButtonSet.OK);
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

