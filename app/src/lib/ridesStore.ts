import { kvGet, kvSet } from "./kv";
import { Ride, addRide } from "./rides";

import { KEYS } from "./localKeys";

const KEY = KEYS.rides;

export async function loadRides(): Promise<Ride[]> {
  const raw = await kvGet(KEY);
  if (!raw) return [];
  try { const v = JSON.parse(raw) as Ride[]; return Array.isArray(v) ? v : []; } catch { return []; }
}
export async function saveRide(ride: Ride): Promise<void> { await kvSet(KEY, JSON.stringify(addRide(await loadRides(), ride))); }
export async function clearRides(): Promise<void> { await kvSet(KEY, "[]"); }
