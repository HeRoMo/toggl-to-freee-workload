import {Freee, FreeeUser} from '../service/freee';
import SpreadsheetUtils from '../SpreadsheetUtils';

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
 * freee のログイン状態を取得する
 */
function inLogin(): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
  const freee = new Freee();
  return freee.inLogin();
}

/**
 * freee のログイン中のユーザ情報を取得する。
 */
function currentUser(): FreeeUser|null { // eslint-disable-line @typescript-eslint/no-unused-vars
  const freee = new Freee();
  return freee.currentUser();
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
    const user = freee.currentUser();
    SpreadsheetApp.getActiveSpreadsheet().toast(`OAuth認可済みです。認可されたユーザー名：${user.display_name}`, 'freee');
  }
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
