// noinspection LanguageDetectionInspection

import Props from './props';
import Utils from './utils';

const TOGGL_API_TOKEN: string = 'TOGGL_API_TOKEN';

// TogglのレポートAPIのレスポンスのJSONの型化
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

/**
 * TogglのAPIを実行する
 * @param url APIのエンドポイントURL＋クエリパラメータ
 * @return APIのレスポンス
 */
function callTogglApi_(url: string): GoogleAppsScript.URL_Fetch.HTTPResponse {
  const togglKey = Props.get(TOGGL_API_TOKEN);
  const authToken = Utilities.base64Encode(`${togglKey}:api_token`);
  const headers = { Authorization: `Basic ${authToken}` };
  const response = UrlFetchApp.fetch(url, { headers });
  return response;
}

interface PostBody {
  [key:string]: string|number|boolean|[string]|[number]
}

function postTogglApi_(url: string, reqBody: PostBody): GoogleAppsScript.URL_Fetch.HTTPResponse {
  const togglKey = Props.get(TOGGL_API_TOKEN);
  const authToken = Utilities.base64Encode(`${togglKey}:api_token`);
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
function fetchReport_(
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
  const response = postTogglApi_(url, reqBody);
  const reportJson = JSON.parse(response.getContentText());
  const nextRowNumber: number = Number(response.getHeaders()['x-next-row-number']);
  return { reportJson, nextRowNumber };
}

/**
 * レポート（詳細）をスプレッドシートで扱いやすくパースする。
 * レポートオブジェクトから必要な値を抽出して配列に変換する
 * @param reportJson Togglのレポートオブジェクトの配列
 * @return 必要な値の配列のリスト
 */
function parseReportData_(reportJson: IToggleReportData[]): any[][] {
  const parsedReport = reportJson.map((report) => {
    const togglId = report.time_entries[0].id;
    const projectId = report.project_id;
    const date = report.time_entries[0].start.split('T')[0];
    const minutes = report.time_entries.reduce((total, entry) => (total + Math.round(entry.seconds/60)), 0); // 端数は四捨五入
    const tagIds = report.tag_ids;
    const description = report.description;
    const formattedRepo = [togglId, projectId, date, minutes, tagIds, description];
    return formattedRepo;
  });
  parsedReport.unshift(['togglId', 'projectId', 'date', 'minutes', 'tagIds', 'description']);
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
function fetchAllReport_(workplaceId: number, since: string, until: string): IToggleReportData[] {
  let firstRowNumber: number|undefined = 1;
  let report = [];
  while (!isNaN(firstRowNumber) && firstRowNumber > 0) {
    const result = fetchReport_(workplaceId, since, until, firstRowNumber);
    const { reportJson } = result;
    Utilities.sleep(1500); // TODO: Report API V3 でも必要か？ APIのrate limitを避けるため
    report = report.concat(reportJson);
    firstRowNumber = result.nextRowNumber;
    console.log({firstRowNumber});
  }
  return report;
}

const Toggl = {
  /**
   * ワークスペースを取得する
   * @return ワークスペースのリスト。 { id, name } の配列
   */
  getWorkspaces(): Array<{ id: number, name: string }> {
    const url = 'https://api.track.toggl.com/api/v8/workspaces';
    const response = callTogglApi_(url);
    const content = JSON.parse(response.getContentText());
    const workspaces = content.map((ws) => ({ id: ws.id, name: ws.name }));
    return workspaces;
  },

  /**
   * プロジェクトを取得する
   * @param workplaceId
   * @return プロジェクトのマップ(key: ID, value: 名前)
   */
  getProjects(workplaceId: number): {[key: number]: string} {
    const url = `https://api.track.toggl.com/api/v9/workspaces/${workplaceId}/projects?active=true`;
    const response = callTogglApi_(url);
    const content = JSON.parse(response.getContentText());
    const projects: {[key: number]: string} = {};
    content.map((pj) => (projects[pj.id] = pj.name));
    return projects;
  },

  /**
   * タグを取得する
   * @param workplaceId
   * @return タグのマップ(key: ID, value: 名前)
   */
  getTags(workplaceId: number): {[key: number]: string} {
    const url = `https://api.track.toggl.com/api/v9/workspaces/${workplaceId}/tags`;
    const response = callTogglApi_(url);
    const content = JSON.parse(response.getContentText());
    const tags: {[key: number]: string} = {};
    content.forEach((tag) => (tags[tag.id] = tag.name));
    return tags;
  },

  /**
   * レポート（詳細）取得する
   * データは必要な項目のみの配列に変換済み
   * @param workplaceId ワークプレイスID
   * @param year        レポートを取得する年
   * @param month       レポートを取得する月
   * @return [タスクID, プロジェクトID, 日付, 時間（分）, タグIDのリスト, タスク詳細]の配列
   */
  getAllReport(workplaceId: number, year: number, month: number): any[][] {
    const period = Utils.getPeriod(year, month);
    const reportJson = fetchAllReport_(workplaceId, period.since, period.until);
    return parseReportData_(reportJson);
  },
};

export default Toggl;
