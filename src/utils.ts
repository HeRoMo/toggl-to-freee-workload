const Utils = {
  /**
   * 年月の配列を取得する。実行時の月を含む6ヶ月分
   * @return YYYY-MMの配列（降順）
   */
  getYearMonths(): string[] {
    const now = new Date();
    const yearMonths = [Utilities.formatDate(now, 'JST', 'yyyy-MM')];
    for (let i = 0; i < 5; i += 1) {
      now.setMonth(now.getMonth() - 1);
      const ym = Utilities.formatDate(now, 'JST', 'yyyy-MM');
      yearMonths.push(ym);
    }
    return yearMonths;
  },

  /**
   * 指定した年月の初日、最終日を取得する
   * @param  year  西暦
   * @param  month 月
   * @return 年月の初日、最終日 { since, until }
   */
  getPeriod(year: number, month: number): {since: string, until: string} {
    const start = new Date(year, (month - 1), 1);
    const end = new Date(year, month, 0);
    const since = Utilities.formatDate(start, 'JST', 'yyyy-MM-dd');
    const until = Utilities.formatDate(end, 'JST', 'yyyy-MM-dd');
    const period = { since, until };
    return period;
  },
};

export default Utils;
