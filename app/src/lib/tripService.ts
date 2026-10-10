// Rider-side trip service: samples location every 5 s, computes P(bus) on the phone from a rolling
// 180 s window, and uploads points (batched every 15 s) only while P(bus) >= 0.7. Fails closed.
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Accelerometer } from "expo-sensors";
import model from "../classifier/model.json";
import { windowFeatures, type Row } from "../classifier/features";
import { predictBus, UPLOAD_THRESHOLD, type Model } from "../classifier/predict";
import { supabase } from "./supabase";
import { newTripToken } from "./tripToken";

const TASK = "goyellow-trip";
const WINDOW_SAMPLES = 36; // 180 s / 5 s

interface Sample { t: number; lat: number; lon: number; speed: number; acc: number; heading: number; az: number }
interface Pending { t: string; lat: number; lon: number; speed: number; acc: number; p_bus: number }

let token: string | null = null;
let declared = "";
let samples: Sample[] = [];
let pending: Pending[] = [];
let az = 0;
let azBuf: number[] = [];
let accSub: { remove: () => void } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let onUpdate: ((pBus: number) => void) | null = null;

export function currentPBus(): number {
  if (samples.length < 12) return 0; // need at least 60 s before trusting the classifier
  const win: Row[] = samples.slice(-WINDOW_SAMPLES).map((s) => [s.speed, s.heading, s.az]);
  try { return predictBus(windowFeatures(win), model as Model); } catch { return 0; }
}

TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error || !token) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const l of locations) {
    const mean = azBuf.length ? azBuf.reduce((s, x) => s + x, 0) / azBuf.length : 0;
    azBuf = [];
    samples.push({ t: l.timestamp, lat: l.coords.latitude, lon: l.coords.longitude,
      speed: Math.max(0, l.coords.speed ?? 0), acc: l.coords.accuracy ?? 99, heading: l.coords.heading ?? 0, az: mean || az });
    samples = samples.slice(-WINDOW_SAMPLES * 2);
    const p = currentPBus();
    onUpdate?.(p);
    if (p >= UPLOAD_THRESHOLD) {
      const s = samples[samples.length - 1];
      pending.push({ t: new Date(s.t).toISOString(), lat: s.lat, lon: s.lon, speed: s.speed, acc: s.acc, p_bus: p });
    }
  }
});

async function flush() {
  if (!token || !pending.length) return;
  const batch = pending.splice(0, 10);
  const { error } = await supabase.functions.invoke("trip-points", {
    body: { trip_token: token, declared_bus: declared, points: batch } });
  if (error) pending.unshift(...batch.slice(0, 5)); // drop oldest on repeated failure; never grow unbounded
}

export async function startTrip(declaredBus: string, cb?: (p: number) => void): Promise<string> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") throw new Error("Location permission needed");
  await Location.requestBackgroundPermissionsAsync();
  token = newTripToken(); declared = declaredBus; samples = []; pending = []; onUpdate = cb ?? null;
  Accelerometer.setUpdateInterval(200);
  accSub = Accelerometer.addListener((d) => { az = d.z; azBuf.push(d.z); });
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 0,
    showsBackgroundLocationIndicator: true,
    foregroundService: { notificationTitle: "GoYellow is listening", notificationBody: "Only during your bus window" },
  });
  timer = setInterval(flush, 15000);
  return token;
}

export async function endTrip(): Promise<string | null> {
  const t = token;
  if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
  accSub?.remove(); accSub = null;
  if (timer) clearInterval(timer);
  await flush();
  if (t) await supabase.functions.invoke("trip-end", { body: { trip_token: t } });
  token = null; samples = []; pending = [];
  return t;
}
