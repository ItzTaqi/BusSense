// Week-by-week view of anonymous parent reports. Weeks run Monday to Sunday in the phone's local time.
import { Report } from "./insights";

const DAY_MS = 86400000;
const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function weekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
  return d;
}
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export interface WeekOption { offset: number; start: Date; end: Date; label: string }

/** This week first, then each earlier week. Labels are unique so they can be used as dropdown values. */
export function weekOptions(now: Date = new Date(), count = 8): WeekOption[] {
  const thisMonday = weekStart(now);
  return Array.from({ length: count }, (_, offset) => {
    const start = addDays(thisMonday, -7 * offset);
    const end = addDays(start, 6);
    const range = `${fmt(start)} – ${fmt(end)}`;
    const name = offset === 0 ? "This week" : offset === 1 ? "Last week" : null;
    return { offset, start, end, label: name ? `${name} (${range})` : range };
  });
}

export interface Day { key: string; label: string; noShow: number; early: number }

const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Monday to Friday always; Saturday and Sunday only when they have reports. */
export function dailyBreakdown(reports: Report[], start: Date): Day[] {
  const begin = start.getTime();
  const end = begin + 7 * DAY_MS;
  const days: Day[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return { key: keyOf(d), label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }), noShow: 0, early: 0 };
  });
  for (const r of reports) {
    const t = new Date(r.t).getTime();
    if (!Number.isFinite(t) || t < begin || t >= end) continue;
    const day = days.find((x) => x.key === keyOf(new Date(t)));
    if (!day) continue;
    if (r.kind === "early") day.early++; else day.noShow++;
  }
  return days.filter((d, i) => i < 5 || d.noShow + d.early > 0);
}

export function weekTotals(days: Day[]) {
  return { noShow: days.reduce((s, d) => s + d.noShow, 0), early: days.reduce((s, d) => s + d.early, 0) };
}
