import Props from '../props';
import SpreadsheetUtils from "../SpreadsheetUtils";

export interface FreeeUser {
  id: number;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  first_name_kana: string;
  last_name_kana: string;
}

interface FreeeCompany {
  id: number;
  name: string;
  display_name: string;
  role: string;
  external_cid: string;
  person_me: FreeePersonMe;
}

interface FreeePersonMe {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface FreeeProject {
  id: number;
  name: string;
  code: string;
  description: string;
  manager: FreeeManager;
  color: string;
  from_date: string;
  thru_date: string;
  publish_to_employee: boolean;
  operational_status: string;
  sales_order_status: string;
  sales_budget: number;
  expense_budget: number;
  profit_budget: number;
  sales_actual: number;
  expense_actual: number;
  profit_actual: number;
  members: FreeeManager[];
  orderers: Orderer[];
  contractors: Orderer[];
  project_tags: Projecttag[];
  workload_tag_groups: WorkloadTagGroup[];
}

interface FreeeManager {
  person_id: number;
  person_name: string;
}

interface Orderer {
  partner_id: number;
  partner_name: string;
  partner_code: string;
}

interface Projecttag {
  tag_group_name: string;
  tag_name: string;
}

interface WorkloadTagGroup {
  tag_group_id: number;
  tag_group_name: string;
  required: boolean;
  tags: Tag[];
}

interface Tag {
  id: number;
  name: string;
}

interface FreeeWorkloadInput {
  company_id: number;
  person_id?: number;
  project_id: number;
  date: string;
  minutes: number;
  memo?: string;
  workload_tags?: FreeeWorkloadTagInput[];
}

interface FreeeWorkloadTagInput {
  tag_group_id: number;
  tag_id: number;
}

interface FreeeWorkload {
  id: number;
  person_id: number;
  person_name: string;
  date: string;
  project_id: number;
  project_name: string;
  project_code: string;
  memo: string;
  minutes: number;
  workload_tags: FreeeWorkloadTag[];
}

interface FreeeWorkloadTag {
  tag_group_id: number;
  tag_group_name: string;
  tag_id: number;
  tag_name: string;
}

export class Freee {
  private baseURL = 'https://api.freee.co.jp';
  private readonly service = OAuth2.createService('freeeAPI')
    .setAuthorizationBaseUrl ('https://accounts.secure.freee.co.jp/public_api/authorize')
    .setTokenUrl('https://accounts.secure.freee.co.jp/public_api/token')
    .setClientId(Props.get('FREEE_CLIENT_ID'))
    .setClientSecret(Props.get('FREEE_CLIENT_SECRET'))
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setCache(CacheService.getUserCache());

  /**
   * ログイン中なら true を返す
   */
  public inLogin(): boolean {
    return this.service.hasAccess();
  }

  /**
   * freee の認証URLを取得する
   */
  public getAuthorizationUrl(): string {
    return this.service.getAuthorizationUrl();
  }

  /**
   * freee からのコールバックを処理する
   * @param request
   */
  public handleCallback(request: object): boolean {
    return this.service.handleCallback(request);
  }

  /**
   * freee のログイン中のユーザ情報を取得する
   */
  public currentUser(): FreeeUser|null {
    if (this.inLogin()) {
      const response = this.getRequest('/api/1/users/me');
      const {user} = JSON.parse(response.getContentText());
      return user;
    }
    return null;
  }

  /**
   * freee の所属事業所のIDと名前の一覧を取得する
   */
  public getCompanies(): Array<{id: number, name: string}> {
    const companies = this.fetchCompanies();
    return companies.map((c) => ({id: c.id, name: c.display_name}));
  }

  /**
   * freee の所属事業所を取得する
   * @private
   */
  private fetchCompanies(): FreeeCompany[] {
    const response = this.getRequest('/pm/users/me');
    const {companies} = JSON.parse(response.getContentText());
    return companies;
  }

  /**
   * freee 工数管理のプロジェクトを取得する
   * @param companyId freee 事業所ID
   * @private
   */
  private fetchProjects(companyId: number): FreeeProject[] {
    const params = {
      company_id: companyId,
      limit: 100,
    };
    const response = this.getRequest('/pm/projects', params);
    const {projects} = JSON.parse(response.getContentText());
    return projects;
  }

  /**
   * freee のプロジェクトとタグの一覧を取得する
   * @param companyId freee 事業所ID
   */
  public getProjectsTags(companyId: number): any[][] { // eslint-disable-line @typescript-eslint/no-explicit-any
    const projects = this.fetchProjects(companyId);
    const projectTags = projects.map((project)=>{
      return this.parseProject(project);
    });
    const  output = projectTags.flat();
    output.sort((a,b) => {
      if (a[1] == b[1]) {
        if (a[4] == b[4]) {
          return 0;
        } else if (a[4] > b[4]) {
          return 1;
        } else {
          return -1;
        }
      } else if (a[1] > b[1]) {
        return 1;
      } else {
        return -1;
      }
    });
    output.unshift(
      ['freeeProjectId', 'freeeProjectName', 'freeeTagGroupId', 'freeeTagGroupName', 'freeeTagId', 'freeeTagName'],
    );
    output.forEach((o) => {
      console.log(`★ ${o[0]} ${o[1]}`);
    });
    return output;
  }

  /**
   * プロジェクト情報をスプレッドシートに出力しやすい形式に変換する
   * @param project
   * @private
   */
  private parseProject(project: FreeeProject): any[][] { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.log(`${project.id}: ${project.name}`);
    const projectId = project.id;
    const projectName = project.name;
    const data = project.workload_tag_groups.map((tagGroup) => {
      const tagGroupId = tagGroup.tag_group_id;
      const tagGroupName = tagGroup.tag_group_name;
      return tagGroup.tags.map((tag) => (
        [projectId, projectName, tagGroupId, tagGroupName, tag.id, tag.name]
      ));
    });
    if (project.workload_tag_groups.length == 0) {
      data.push([[projectId, projectName, null, null, null, null]]);
    }
    return data.flat();
  }

  /**
   * ID を指定して Project を取得する。
   * 実装したものの権限エラーが発生する
   *
   * @param companyId freee 事業所ID
   * @param projectId プロジェクトID
   */
  public getProjectById(companyId: number, projectId: number): FreeeProject {
    const params = {
      company_id: companyId,
    };
    const path = `/pm/projects/${projectId}`;
    const response = this.getRequest(path, params);
    const {project} = JSON.parse(response.getContentText());
    return project;
  }

  /**
   * スプレッドシートを読み、freee 工数管理に登録する
   * @param companyId freee 事業所ID
   * @param sheetName 読み込むシート名
   */
  public entryWorkloads(companyId: number, sheetName: string): number {
    const spreadSheet = new SpreadsheetUtils(SpreadsheetApp.getActiveSpreadsheet().getId());
    const data = spreadSheet.getSheetAsJson(sheetName);
    let count = 0;
    for (const row of data) {
      const entry: FreeeWorkloadInput = {
        company_id: companyId,
        project_id: row['freeeProjectId'],
        date: Utilities.formatDate(new Date(String(row['date'])), 'JST', 'yyyy-MM-dd'),
        minutes: row['minutes'],
        memo: row['description'],
      };
      if (row['freeeTagGroupId'] != null && row['freeeTagGroupId'] != '') {
        entry.workload_tags = [{ tag_group_id: row['freeeTagGroupId'], tag_id: row['freeeTagId'] }];
      }
      try {
        this.entryWorkload(entry);
        count++;
      } catch (error) {
        console.log({error, entry});
        throw error;
      }
    }
    return count;
  }

  /**
   * freee 工数管理でデータを登録する
   * @param workloadInput 工数データ
   * @private
   */
  private entryWorkload(workloadInput: FreeeWorkloadInput): FreeeWorkload {
    const response = this.postRequest('/pm/workloads', workloadInput);
    const {workload} = JSON.parse(response.getContentText());
    return workload;
  }

  /**
   * freee 工数管理からログアウトする
   */
  public logout(): void {
    this.service.reset();
  }

  /**
   * freee の GET API をコールする
   * @param path リクエストパス
   * @param queryParams リクエストボディ
   * @private
   */
  private getRequest(
    path: string,
    queryParams: {[key:string]: string|number } = null,
  ): GoogleAppsScript.URL_Fetch.HTTPResponse {
    let url = this.baseURL + path;
    const queries: string[] = [];
    if (queryParams != null) {
      for(const p in queryParams) {
          queries.push(`${p}=${queryParams[p]}`);
      }
      url = `${url}?${queries.join('&')}`;
    }

    const response = UrlFetchApp.fetch(
      url,
      {
        method: 'get',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + this.service.getAccessToken() },
      },
    );
    return response;
  }

  /**
   * freee の POST API をコールする
   * @param path リクエストパス
   * @param body リクエストボディ
   * @private
   */
  private postRequest(path: string, body: object): GoogleAppsScript.URL_Fetch.HTTPResponse {
    const url = this.baseURL + path;
    const response = UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + this.service.getAccessToken() },
        payload: JSON.stringify(body),
      },
    );
    return response;
  }
}

/**
 * freee の OAuth2 のコールバックを処理する
 * @param request
 */
function authCallback(request: object) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const freee = new Freee();
  const isAuthorized = freee.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('freee の認証に成功しました! このタブを閉じてください。');
  } else {
    return HtmlService.createHtmlOutput('freee の認証に失敗しました。 このタブを閉じてください。');
  }
}
