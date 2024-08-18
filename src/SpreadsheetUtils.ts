export class SpreadsheetUtils {
  private ss: GoogleAppsScript.Spreadsheet.Spreadsheet;

  /**
   * コンストラクタ
   * @param sheetId スプレッドシートID
   */
  public constructor(sheetId: string) {
    this.ss = SpreadsheetApp.openById(sheetId);
  }

  /**
   * シートのデータをJSONとして取得する
   * @param name シート名
   */
  public getSheetAsJson(name: string): {[key: string]: any}[] { // eslint-disable-line @typescript-eslint/no-explicit-any
    const sheet = this.ss.getSheetByName(name);
    const values = sheet.getDataRange().getValues();
    const headers = values.shift();
    const json = values.map((value) => {
      const row: {[key: string]: any} = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      headers.forEach((header, i) => {
        row[String(header)] = value[i];
      });
      return row;
    });
    return json;
  }

  public writeToSheet(sheetName: string, data: any[][]): void { // eslint-disable-line @typescript-eslint/no-explicit-any
    const sheet = this.getOrInsertSheet(sheetName, 0);
    sheet.getDataRange().clear();
    const rowCount = data.length;
    const columnCount = data[0].length;
    const range = sheet.getRange(1,1,rowCount, columnCount);
    range.setValues(data);
  }

  public getOrInsertSheet(name: string, index: number): GoogleAppsScript.Spreadsheet.Sheet {
   let sheet = this.ss.getSheetByName(name);
   if (sheet == null){
     sheet = this.ss.insertSheet(name, index);
   }
   return sheet;
  }
}

export default SpreadsheetUtils;
