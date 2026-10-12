// Bus times -> sensing windows. Riders say when the bus usually comes and when it leaves school;
// the app only listens in a window around those times (time-boxed sensing).
const pad = (n: number) => String(n).padStart(2, "0");

/** "7:05 AM" for a minute-of-day. */
export function label(min: number): string {
  const h24 = Math.floor(min / 60), m = min % 60;
  const h = ((h24 + 11) % 12) + 1;
  return `${h}:${pad(m)} ${h24 < 12 ? "AM" : "PM"}`;
}
/** Options every `step` minutes from `fromMin` to `toMin` inclusive. */
export function timeOptions(fromMin: number, toMin: number, step = 5): string[] {
  const out: string[] = [];
  for (let m = fromMin; m <= toMin; m += step) out.push(label(m));
  return out;
}
/** "7:05 AM" -> minute-of-day, or null. */
export function parseLabel(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]) % 12 + (m[3] === "PM" ? 12 : 0);
  return h * 60 + Number(m[2]);
}
export const toHHMM = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

export const MORNING_OPTIONS = timeOptions(5 * 60, 10 * 60); // bus comes: 5:00 AM - 10:00 AM
export const AFTERNOON_OPTIONS = timeOptions(11 * 60, 18 * 60); // bus leaves school: 11:00 AM - 6:00 PM

/** Window = from 15 min before the morning pickup to 60 min after; 10 min before dismissal to 75 min after. */
export function windowsFromTimes(pickupMin: number, leaveMin: number) {
  const clamp = (m: number) => Math.min(Math.max(m, 0), 24 * 60 - 1);
  return {
    amStart: toHHMM(clamp(pickupMin - 15)), amEnd: toHHMM(clamp(pickupMin + 60)),
    pmStart: toHHMM(clamp(leaveMin - 10)), pmEnd: toHHMM(clamp(leaveMin + 75)),
  };
}

/** Student ID (e.g. PowerSchool number): digits only, 5-12 long. */
export const isStudentId = (s: string) => /^\d{5,12}$/.test(s.trim());
