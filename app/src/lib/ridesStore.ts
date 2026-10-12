import { kvGet, kvSet } from "./kv";
import { Ride, addRide } from "./rides";

const KEY = "gonc.rides.v1";

export async function loadRides(): Promise<Ride[]> {
  const raw = await kvGet(KEY);
  if (!raw) return [];
  try { const v = JSON.parse(raw) as Ride[]; return Array.isArray(v) ? v : []; } catch { return []; }
}
export async function saveRide(ride: Ride): Promise<void> { await kvSet(KEY, JSON.stringify(addRide(await loadRides(), ride))); }
export async function clearRides(): Promise<void> { await kvSet(KEY, "[]"); }
