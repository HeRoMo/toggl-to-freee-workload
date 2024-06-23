import {TogglClazz} from './service/toggl';
import Freee, {FreeeClazz} from './service/freee';
import SpreadsheetUtils from './SpreadsheetUtils';
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

  // // TODO: 削除
  // SpreadsheetApp.getUi()
  //   .createMenu('freee API連携')
  //   .addItem('認可処理', 'Freee.showAuth')
  //   .addItem('ログアウト', 'Freee.logout')
  //   .addToUi();
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
 * Togglのワークスペースを取得する
 * @return ワークスペースの{id, name}のリスト
 */
function getWorkspaces(): Array<{id: number, name: string}> { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const toggl = new TogglClazz(Props.get('TOGGL_API_TOKEN'));
    return toggl.getWorkspaces();
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
    const toggl = new TogglClazz(Props.get('TOGGL_API_TOKEN'));
    const report = toggl.getAllReport(workplaceId, year, month);
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
  Freee.showAuth();
}

function outputTogglProjectTags(workplaceId: number): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const toggl = new TogglClazz(Props.get('TOGGL_API_TOKEN'));
    const tags = toggl.getTags(workplaceId);
    const projects = toggl.getProjects(workplaceId);
    const activeSpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = 'TOGGL_PROJECTS_TAGS';
    const ss = new SpreadsheetUtils(activeSpreadSheet.getId());
    const projectData = Object.keys(projects).map((id) => [id, projects[id]]);
    projectData.unshift(['togglProjectId', 'togglProjectName']);
    projectData.push(['', '']);
    const tagData = Object.keys(tags).map((id) => [id, tags[id]]);
    tagData.unshift(['togglTagId', 'togglTagName']);
    const outputData = projectData.concat(tagData);
    ss.writeToSheet(sheetName, outputData);

    activeSpreadSheet.toast(`${sheetName} を出力しました`);
  } catch (error) {
    const user = Session.getTemporaryActiveUserKey();
    const message = 'Togglのプロジェクト・タグのデータの読み出しでエラーが発生しました。';
    console.error({ user, message, error });
    throw new Error(`${message} \n[${user}]`);
  }
}

function getCompanies(): Array<{id: number, name: string}> { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const freee = new FreeeClazz();
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
 *
 * @param companyId
 */
function outputFreeeProjectTags(companyId: number): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const freee = new FreeeClazz();
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

function addTimeEntryFromSheet(companyId: number): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const freee = new FreeeClazz();
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

