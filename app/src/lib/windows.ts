// Time-boxed sensing: listen only inside the rider's bus windows ("HH:MM", 24 h, local time).
export function inWindow(now: Date, start: string, end: string): boolean {
  const m = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return m >= sh * 60 + sm && m <= eh * 60 + em;
}
export const inAnyWindow = (now: Date, w: Array<[string, string]>) => w.some(([s, e]) => inWindow(now, s, e));
