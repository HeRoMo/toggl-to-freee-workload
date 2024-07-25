import Utils from '../utils';
import SpreadsheetUtils from "../SpreadsheetUtils";

// Toggl のレポートAPIのレスポンスのJSONの型化
interface IToggleReportData {
  user_id: number;
  username: string;
  project_id: number;
  task_id: null;
  billable: boolean;
  description: string;
  tag_ids: number[];
  billable_amount_in_cents: null;
  hourly_rate_in_cents: null;
  currency: string;
  time_entries: ITimeEntry[];
  row_number: number;
}

interface ITimeEntry {
  id: number;
  seconds: number;
  start: string;
  stop: string;
  at: string;
}

export class Toggl {
  private readonly togglKey;

  constructor(toggleAPIToken: string) {
    this.togglKey = toggleAPIToken;
  }

  /**
   * ワークスペースを取得する
   * @return ワークスペースのリスト。 { id, name } の配列
   */
  public getWorkspaces(): Array<{ id: number, name: string }> {
    const url = `https://api.track.toggl.com/api/v9/me/workspaces`;
    const response = this.callGetApi(url);
    const content = JSON.parse(response.getContentText());
    const workspaces = content.map((ws) => ({ id: ws.id, name: ws.name }));
    return workspaces;
  }

  /**
   * プロジェクトを取得する
   * @param workplaceId
   * @return プロジェクトのマップ(key: ID, value: 名前)
   */
  public getProjects(workplaceId: number): {[key: number]: string} {
    const url = `https://api.track.toggl.com/api/v9/workspaces/${workplaceId}/projects?active=true`;
    const response = this.callGetApi(url);
    const content = JSON.parse(response.getContentText());
    const projects: {[key: number]: string} = {};
    content.map((pj) => (projects[pj.id] = pj.name));
    return projects;
  }

  /**
   * タグを取得する
   * @param workplaceId
   * @return タグのマップ(key: ID, value: 名前)
   */
  public getTags(workplaceId: number): {[key: number]: string} {
    const url = `https://api.track.toggl.com/api/v9/workspaces/${workplaceId}/tags`;
    const response = this.callGetApi(url);
    const content = JSON.parse(response.getContentText());
    const tags: {[key: number]: string} = {};
    content.forEach((tag) => (tags[tag.id] = tag.name));
    return tags;
  }

  /**
   * レポート（詳細）取得する
   * データは必要な項目のみの配列に変換済み
   * @param workplaceId ワークプレイスID
   * @param year        レポートを取得する年
   * @param month       レポートを取得する月
   * @return [タスクID, プロジェクトID, 日付, 時間（分）, タグIDのリスト, タスク詳細]の配列
   */
  public getAllReport(workplaceId: number, year: number, month: number): any[][] { // eslint-disable-line @typescript-eslint/no-explicit-any
    const period = Utils.getPeriod(year, month);
    const reportJson = this.fetchAllReport(workplaceId, period.since, period.until);
    const projects = this.getProjects(workplaceId);
    const tags = this.getTags(workplaceId);
    return this.parseReportData(reportJson, projects, tags);
  }

  /**
   * Togglの GET API を実行する
   * @param url APIのエンドポイントURL＋クエリパラメータ
   * @return APIのレスポンス
   */
  private callGetApi(url: string): GoogleAppsScript.URL_Fetch.HTTPResponse {
    const authToken = Utilities.base64Encode(`${this.togglKey}:api_token`);
    const headers = { Authorization: `Basic ${authToken}` };
    const response = UrlFetchApp.fetch(url, { headers });
    return response;
  }

  /**
   * Togglの POST API を実行する
   * @param url APIのエンドポイントURL＋クエリパラメータ
   * @param reqBody リクエストボディ
   * @return APIのレスポンス
   */
  private callPostApi(
    url: string, reqBody: GoogleAppsScript.URL_Fetch.Payload,
  ): GoogleAppsScript.URL_Fetch.HTTPResponse {
    const authToken = Utilities.base64Encode(`${this.togglKey}:api_token`);
    const headers = { Authorization: `Basic ${authToken}`, "Content-Type": "application/json" };
    const opts: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(reqBody),
      headers,
    };
    return UrlFetchApp.fetch(url, opts);
  }

  /**
   * レポート（詳細）を取得する
   * @param workplaceId    ワークプレイスID
   * @param since          取得開始日（YYYY-MM-DD）
   * @param until          取得最終日（YYYY-MM-DD）
   * @param firstRowNumber 取得開始の行番号
   * @return Togglのレポートオブジェクト
   */
  private fetchReport(
    workplaceId: number,
    since: string,
    until: string,
    firstRowNumber: number = 1,
  ): { reportJson: object, nextRowNumber: number|undefined } {
    const url = `https://api.track.toggl.com/reports/api/v3/workspace/${workplaceId}/search/time_entries`;
    const reqBody = {
      start_date: since,
      end_date: until,
      grouped: true,
      page_size: 50,
      first_row_number: firstRowNumber,
    };
    const response = this.callPostApi(url, reqBody);
    const reportJson = JSON.parse(response.getContentText());
    const nextRowNumber: number = Number(response.getHeaders()['x-next-row-number']);
    return { reportJson, nextRowNumber };
  }

  /**
   * レポート（詳細）をスプレッドシートで扱いやすくパースする。
   * レポートオブジェクトから必要な値を抽出して配列に変換する
   * @param reportJson Togglのレポートオブジェクトの配列
   * @param projects
   * @param tags
   * @return 必要な値の配列のリスト
   */
  private parseReportData(
    reportJson: IToggleReportData[],
    projects: {[key: number]: string},
    tags: {[key: number]: string},
  ): any[][] { // eslint-disable-line @typescript-eslint/no-explicit-any
    const tfMap = this.readTogglFreeeMap();
    const parsedReport = reportJson.map((report) => {
      const togglId = report.time_entries[0].id;
      const projectId = report.project_id;
      const projectName = projects[projectId];
      const date = report.time_entries[0].start.split('T')[0];
      const minutes = report.time_entries.reduce((total, entry) => (total + Math.round(entry.seconds/60)), 0); // 端数は四捨五入
      const tagIds = report.tag_ids.join(';');
      const tagNames = report.tag_ids.map((tagID) => tags[tagID]).join(';');
      const description = report.description;
      let formattedRepo = [togglId, projectId, projectName, date, minutes, tagIds, tagNames, description];
      formattedRepo = formattedRepo.concat(tfMap.getFreeeProjectTag(projectId, report.tag_ids));
      return formattedRepo;
    });
    parsedReport.unshift(
      [
        'togglId',
        'projectId',
        'projectName',
        'date',
        'minutes',
        'tagIds',
        'tagNames',
        'description',
        'freeeProjectId',
        'freeeProjectName',
        'freeeTagGroupId',
        'freeeTagGroupName',
        'freeeTagId',
        'freeeTagName',
      ],
    );
    return parsedReport;
  }

  /**
   * レポート（詳細）を全部取得する。
   * 複数ページある場合、すべてのページを取得する
   * @param workplaceId ワークプレイスID
   * @param since       取得開始日（YYYY-MM-DD）
   * @param until       取得最終日（YYYY-MM-DD）
   * @return Togglのレポートオブジェクト
   */
  private fetchAllReport(workplaceId: number, since: string, until: string): IToggleReportData[] {
    let firstRowNumber: number|undefined = 1;
    let report = [];
    while (!isNaN(firstRowNumber) && firstRowNumber > 0) {
      const result = this.fetchReport(workplaceId, since, until, firstRowNumber);
      const { reportJson } = result;
      Utilities.sleep(1500); // TODO: APIのrate limitを避けるためだけどReport API V3 でも必要か？
      report = report.concat(reportJson);
      firstRowNumber = result.nextRowNumber;
      console.log({firstRowNumber});
    }
    return report;
  }

  public readTogglFreeeMap(): TogglFreeeMap {
    const ss = new SpreadsheetUtils(SpreadsheetApp.getActiveSpreadsheet().getId());
    const togglFreeeMap = ss.getSheetAsJson('TOGGL_FREEE_MAP');
    return new TogglFreeeMap(togglFreeeMap);
  }
}

class TogglFreeeMap {
  private readonly tfMap: {[key: number]: {[key: number]: any[]}}; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor(data: object[]) {
    const tfMap = {};
    data.forEach((row) => {
      let tmpMap = tfMap[row['togglProjectId']];
      if (tmpMap == null) {
        tmpMap = {};
        tfMap[row['togglProjectId']] = tmpMap;
      }
      tmpMap[row['togglTagId']] =
        [
          row['freeeProjectId'],
          row['freeeProjectName'],
          row['freeeTagGroupId'],
          row['freeeTagGroupName'],
          row['freeeTagId'],
          row['freeeTagName'],
        ];
    });
    this.tfMap = tfMap;
  }

  public getFreeeProjectTag(toggleProjectId: number, toggleTagIds: number[]): any[] { // eslint-disable-line @typescript-eslint/no-explicit-any
    const tagMap = this.tfMap[toggleProjectId];
    if (tagMap == null) {
      return ['', '', '', '', '', ''];
    }
    for (const id of toggleTagIds) {
      if (tagMap[id] != null) {
        return tagMap[id];
      }
    }
    if (tagMap[''] != null) {
      return tagMap[''];
    }
    return ['', '', '', '', '', ''];
  }

  public get(toggleProjectId: number): {[key: number]: any[]} { // eslint-disable-line @typescript-eslint/no-explicit-any
    return this.tfMap[toggleProjectId];
  }
}
