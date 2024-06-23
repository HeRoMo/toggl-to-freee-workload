import Props from '../props';
import SpreadsheetUtils from "../SpreadsheetUtils";

interface FreeeUser {
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

export class FreeeClazz {
  private baseURL = 'https://api.freee.co.jp';
  public readonly service = OAuth2.createService('freeeAPI')
    .setAuthorizationBaseUrl ('https://accounts.secure.freee.co.jp/public_api/authorize')
    .setTokenUrl('https://accounts.secure.freee.co.jp/public_api/token')
    .setClientId(Props.get('FREEE_CLIENT_ID'))
    .setClientSecret(Props.get('FREEE_CLIENT_SECRET'))
    .setCallbackFunction ('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setCache(CacheService.getUserCache());

  public getUser(): FreeeUser {
    const response = this.getRequest('/api/1/users/me');
    const {user} = JSON.parse(response.getContentText());
    return user;
  }

  public getCompanies(): Array<{id: number, name: string}> {
    const companies = this.fetchCompanies();
    return companies.map((c) => ({id: c.id, name: c.display_name}));
  }

  private fetchCompanies(): FreeeCompany[] {
    const response = this.getRequest('/pm/users/me');
    const {companies} = JSON.parse(response.getContentText());
    return companies;
  }

  public getProjects(companyId: number): FreeeProject[] {
    const params = {
      company_id: companyId,
      limit: 100,
    };
    const response = this.getRequest('/pm/projects', params);
    const {projects} = JSON.parse(response.getContentText());
    return projects;
  }

  public getProjectsTags(companyId: number): any[][] {
    const projects = this.getProjects(companyId);
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

  private parseProject(project: FreeeProject): any[][] {
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
   * @param companyId
   * @param projectId
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
   *
   * @param workloadInput
   * @private
   */
  private entryWorkload(workloadInput: FreeeWorkloadInput): FreeeWorkload {
    const response = this.postRequest('/pm/workloads', workloadInput);
    const {workload} = JSON.parse(response.getContentText());
    return workload;
  }

  public logout(): void {
    this.service.reset();
  }

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


//----------------------------------------------------------------
// const freeeService_ = getFreeeService();
// function getFreeeService() {
//   return OAuth2.createService('freeeAPI')
//     .setAuthorizationBaseUrl ('https://accounts.secure.freee.co.jp/public_api/authorize')
//     .setTokenUrl('https://accounts.secure.freee.co.jp/public_api/token')
//     .setClientId(Props.get('FREEE_CLIENT_ID'))
//     .setClientSecret(Props.get('FREEE_CLIENT_SECRET'))
//     .setCallbackFunction ('authCallback')
//     .setPropertyStore (PropertiesService.getUserProperties());
// }

function authCallback(request) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const freee = new FreeeClazz();
  const isAuthorized = freee.service.handleCallback(request);
  if (isAuthorized) {
    return HtmlService.createHtmlOutput('Success! You can close this tab.');
  } else {
    return HtmlService.createHtmlOutput('Denied. You can close this tab');
  }
}

const Freee = {
  createModelessDialog(html, title) {
    const htmlOutput = HtmlService.createHtmlOutput(html)
      .setWidth(360)
      .setHeight(120);
    SpreadsheetApp.getUi().showModelessDialog(htmlOutput, title);
  },

  showAuth(): void { // eslint-disable-line @typescript-eslint/no-unused-vars
    const freee = new FreeeClazz();
    if (!freee.service.hasAccess()) {
      const authorizationUrl = freee.service.getAuthorizationUrl();
      const template = HtmlService.createTemplate(
        '<a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>. ' +
        'freee APIの認可をします。',
      );
      template.authorizationUrl = authorizationUrl;
      const page = template.evaluate();
      const title = 'freeeアプリの認可処理';

      this.createModelessDialog(page, title);
    } else {
      this.showUser();
    }
  },

  showUser(): void { // TODO: code.ts に移動する
    const freee = new FreeeClazz();
    const user = freee.getUser();
    Browser.msgBox('OAuth認可済みです。\\n認可されたユーザー名：' + user.display_name);
  },

  logout(): void { // eslint-disable-line @typescript-eslint/no-unused-vars
    const freee = new FreeeClazz();
    freee.logout();
    const mes = 'freeeアプリからログアウトしました。';
    const logoutTitle = 'ログアウト終了';

    this.createModelessDialog(mes, logoutTitle);
  },
};

export default Freee;

function TestUser():void {
  // const user = Freee.getUser();
  const freee = new FreeeClazz();
  const user = freee.getUser();
  console.log({user});
}

function TestCompanies():void {
  // const user = Freee.getUser();
  const freee = new FreeeClazz();
  const companies = freee.getCompanies();
  console.log({companies});
}

function TestProj(): void {
  const freee = new FreeeClazz();
  const companyId = 111111;
  const projectsTags = freee.getProjectsTags(companyId);
  console.log({count: projectsTags.length, projectsTags: projectsTags});
  const projects = freee.getProjects(companyId);
  console.log({count: projects.length, proj: projects});
  const p = projects[31];
  console.log(JSON.stringify(p, null, 2));
  //
  // console.log({companyId, projId: p.id});
  // const proj = freee.getProjectById(companyId, p.id);
  // console.log(JSON.stringify(proj, null, 2));
}

function TestEntryWL() {
  const entry: FreeeWorkloadInput = {
    company_id: 111111,
    project_id: 222222,
    date: '2024-05-24',
    minutes: 9,
    memo: '作業内容',
    // workload_tags: [{
    //   tag_group_id: 1,
    //   tag_id: 1,
    // }],
  };

  const freee = new FreeeClazz();
  const workload = freee.entryWorkload(entry);
  console.log({workload});
}
