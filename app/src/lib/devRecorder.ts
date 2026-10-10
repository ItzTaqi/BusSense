// LOGGING BUILD (M0): records GPS + accelerometer with a label and uploads to dev_labeled_trips.
// Dev data only; deleted after evaluation (see docs/PRIVACY.md). Visible "Recording" state in the UI.
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Accelerometer } from "expo-sensors";
import { supabase } from "./supabase";
import { newTripToken } from "./tripToken";

const TASK = "goyellow-dev-recorder";
type Label = "bus" | "car" | "walk";
interface Row { trip_token: string; label: Label; t: string; lat: number; lon: number;
  speed_mps: number | null; accuracy_m: number | null; ax: number | null; ay: number | null; az: number | null }

let buffer: Row[] = [];
let session: { token: string; label: Label } | null = null;
let acc = { x: 0, y: 0, z: 0 };
let accSub: { remove: () => void } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

// Must be defined at module scope so background deliveries find it.
TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error || !session) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  for (const l of locations) {
    buffer.push({
      trip_token: session.token, label: session.label, t: new Date(l.timestamp).toISOString(),
      lat: l.coords.latitude, lon: l.coords.longitude, speed_mps: l.coords.speed,
      accuracy_m: l.coords.accuracy, ax: acc.x, ay: acc.y, az: acc.z,
    });
  }
});

async function flush() {
  if (!buffer.length) return;
  const batch = buffer.splice(0, buffer.length);
  const { error } = await supabase.from("dev_labeled_trips").insert(batch);
  if (error) buffer.unshift(...batch); // keep and retry next tick
}

export async function startRecording(label: Label): Promise<void> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") throw new Error("Location permission needed");
  await Location.requestBackgroundPermissionsAsync();
  session = { token: newTripToken(), label };
  Accelerometer.setUpdateInterval(200);
  accSub = Accelerometer.addListener((d) => { acc = d; });
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5000, distanceInterval: 0,
    showsBackgroundLocationIndicator: true,
    foregroundService: { notificationTitle: "GoYellow is recording", notificationBody: "Logging build" },
  });
  timer = setInterval(flush, 15000);
}

export async function stopRecording(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
  accSub?.remove(); accSub = null;
  if (timer) clearInterval(timer);
  await flush();
  session = null;
}
