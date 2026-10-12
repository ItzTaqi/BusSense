// Birthday helpers. The full birth date stays on the phone; only the birth YEAR is ever uploaded.
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const daysInMonth = (year: number, month0: number) => new Date(year, month0 + 1, 0).getDate();
/** 0 = Sunday. */
export const firstWeekday = (year: number, month0: number) => new Date(year, month0, 1).getDay();

export interface YMD { y: number; m: number; d: number } // m is 1-12
export const formatMDY = ({ y, m, d }: YMD) => `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`;

export function ageOn(b: YMD, today: Date = new Date()): number {
  let age = today.getFullYear() - b.y;
  const before = today.getMonth() + 1 < b.m || (today.getMonth() + 1 === b.m && today.getDate() < b.d);
  if (before) age -= 1;
  return age;
}
export const isFuture = (b: YMD, today: Date = new Date()) => new Date(b.y, b.m - 1, b.d) > today;
