// Past rides live ONLY on the rider's phone. The server keeps trips anonymous (no user id), so it cannot list "my" trips.

export interface Ride {
  id: string;
  startedAt: number;   // ms since epoch
  endedAt: number;
  bus: string;
  published: boolean | null;   // null = the receipt could not be fetched
  maxRiders: number | null;
}

export const MAX_RIDES = 50;

/** Newest first, capped, no duplicate ids. */
export function addRide(list: Ride[], ride: Ride, max = MAX_RIDES): Ride[] {
  return [ride, ...list.filter((r) => r.id !== ride.id)].sort((a, b) => b.startedAt - a.startedAt).slice(0, max);
}
export const durationMin = (r: Ride) => Math.max(1, Math.round((r.endedAt - r.startedAt) / 60000));

export function outcomeText(r: Ride): string {
  if (r.published === null) return "Receipt unavailable";
  if (r.published) return r.maxRiders ? `Shared with ${r.maxRiders} riders` : "Shared with other riders";
  return "Not shown: fewer than 3 riders";
}

export function rideTitle(r: Ride, now: Date = new Date()): string {
  const d = new Date(r.startedAt);
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = d.toDateString() === new Date(now.getTime() - 86400000).toDateString();
  const day = sameDay ? "Today" : yesterday ? "Yesterday" : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${day}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}
