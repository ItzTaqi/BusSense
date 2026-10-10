/**
 * Window features, a line-by-line port of worker/classifier/train.py::window_features.
 * Window rows: [speed_mps, heading_deg, az], one every 5 s over the last 180 s.
 */
export const DT = 5;
const STOP_V = 1;

export type Row = [number, number, number];

function stopRuns(slow: boolean[]): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  let i = 0;
  while (i < slow.length) {
    if (slow[i]) {
      let j = i;
      while (j + 1 < slow.length && slow[j + 1]) j++;
      const dur = (j - i + 1) * DT;
      if (dur >= 8 && dur <= 90) runs.push([i, j]);
      i = j + 1;
    } else i++;
  }
  return runs;
}

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export function windowFeatures(w: Row[]): number[] {
  const v = w.map((r) => r[0]);
  const hdg = w.map((r) => r[1]);
  const az = w.map((r) => r[2]);
  const slow = v.map((s) => s < STOP_V);
  const runs = stopRuns(slow);
  const km = Math.max((v.reduce((s, x) => s + x, 0) * DT) / 1000, 0.05);
  const last = v.length - 1;
  const accels = runs.map(([, j]) => (v[Math.min(j + 3, last)] - v[Math.min(j + 1, last)]) / (2 * DT));
  const dh: number[] = [];
  for (let i = 0; i < v.length - 1; i++) {
    if (v[i + 1] < 3 && v[i] < 3) {
      const d = hdg[i + 1] - hdg[i];
      dh.push(Math.abs((((d + 180) % 360) + 360) % 360 - 180));
    }
  }
  const mu = mean(az);
  const variance = mean(az.map((a) => (a - mu) ** 2));
  return [
    runs.length / km,
    Math.max(...v),
    mean(accels),
    mean(slow.map((s) => (s ? 1 : 0))),
    dh.length ? mean(dh) / DT : 0,
    variance,
  ];
}
