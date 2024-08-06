import {Toggl} from '../service/toggl';
import Props from '../props';
import SpreadsheetUtils from '../SpreadsheetUtils';

/**
 * Togglのワークスペースを取得する
 * @return ワークスペースの{id, name}のリスト
 */
function getWorkspaces(): Array<{id: number, name: string}> { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const toggl = new Toggl(Props.get('TOGGL_API_TOKEN'));
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
    const toggl = new Toggl(Props.get('TOGGL_API_TOKEN'));
    const report = toggl.getAllReport(workplaceId, year, month);
    const totalCount = Math.max(report.length - 1, 0); // ヘッダ行を引いておく
    const count = Math.max(report.length - 1, 0); // ヘッダ行を引いておく
    console.info({ message: `Togglから ${count} 件取得しました`, totalCount, count });
    SpreadsheetApp.getActiveSpreadsheet().toast(`Success ${count}件取得しました`, 'toggl');
    writeToSheet(report);
  } catch (error) {
    const user = Session.getTemporaryActiveUserKey();
    const message = 'Togglデータの読み出しでエラーが発生しました。';
    console.error({ user, message, error });
    throw new Error(`${message} \n[${user}]`);
  }
}

/**
 * toggl のプロジェクトとタグの一覧を TOGGL_PROJECTS_TAGS という名前のシートに出力する
 * @param workplaceId ワークプレイスID
 */
function outputTogglProjectTags(workplaceId: number): void { // eslint-disable-line @typescript-eslint/no-unused-vars
  try {
    const toggl = new Toggl(Props.get('TOGGL_API_TOKEN'));
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
    const message = 'togglのプロジェクト・タグのデータの読み出しでエラーが発生しました。';
    console.error({ user, message, error });
    throw new Error(`${message} \n[${user}]`);
  }
}
