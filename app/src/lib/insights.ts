// Weekly insights computed on the phone from anonymous parent reports (no user ids exist in the data).
export interface Report { kind: "no_show" | "early"; t: string }
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_MS = 7 * 24 * 3600 * 1000;

export interface Insights {
  weeks: number;
  totalNoShow: number; totalEarly: number;
  thisWeek: number; lastWeek: number;          // "didn't come" reports
  trend: "up" | "down" | "flat" | "none";      // this week vs last week
  worstDay: string | null;                     // weekday with most "didn't come" reports
  series: number[];                            // "didn't come" per week, oldest -> newest
}

export function computeInsights(reports: Report[], weeks = 4, now: Date = new Date()): Insights {
  const series = Array(weeks).fill(0) as number[];
  const byDay = Array(7).fill(0) as number[];
  let totalNoShow = 0, totalEarly = 0;
  for (const r of reports) {
    const t = new Date(r.t).getTime();
    const age = now.getTime() - t;
    if (!Number.isFinite(t) || age < 0 || age >= weeks * WEEK_MS) continue;
    if (r.kind === "early") { totalEarly++; continue; }
    totalNoShow++;
    series[weeks - 1 - Math.floor(age / WEEK_MS)]++;
    byDay[new Date(t).getDay()]++;
  }
  const thisWeek = series[weeks - 1] ?? 0, lastWeek = series[weeks - 2] ?? 0;
  const trend = totalNoShow === 0 ? "none" : thisWeek > lastWeek ? "up" : thisWeek < lastWeek ? "down" : "flat";
  const max = Math.max(...byDay);
  return { weeks, totalNoShow, totalEarly, thisWeek, lastWeek, trend, worstDay: max > 0 ? WEEKDAYS[byDay.indexOf(max)] : null, series };
}

export const trendText = (i: Insights) =>
  i.trend === "none" ? "No reports yet" : i.trend === "up" ? `Up from ${i.lastWeek} last week`
  : i.trend === "down" ? `Down from ${i.lastWeek} last week` : "Same as last week";
