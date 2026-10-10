// POST /trip/points  {trip_token, declared_bus, points:[{t,lat,lon,speed,acc,p_bus}]}
// Identity is used ONLY to check the rider's bus window, then dropped. Rows stored carry no user id.
import { admin, asUser, json, UUID_RE } from "../_shared.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const body = await req.json().catch(() => null);
  if (!body || !UUID_RE.test(body.trip_token) || !Array.isArray(body.points) || body.points.length > 10)
    return json({ error: "bad request" }, 400);

  const { data: u } = await asUser(req).auth.getUser();
  if (!u?.user) return json({ error: "auth" }, 401);
  const { data: rider } = await asUser(req).from("riders")
    .select("am_window_start,am_window_end,pm_window_start,pm_window_end").eq("id", u.user.id).single();
  if (!rider) return json({ error: "no rider profile" }, 403);

  // Window check, local time of the school (America/New_York).
  const now = new Date().toLocaleTimeString("en-GB", { timeZone: "America/New_York", hour12: false });
  const inWin = (s?: string, e?: string) => !!s && !!e && now >= s && now <= e;
  if (!inWin(rider.am_window_start, rider.am_window_end) && !inWin(rider.pm_window_start, rider.pm_window_end))
    return json({ error: "outside bus window" }, 403);
  // identity is not used past this line.

  const db = admin();
  const { data: rl } = await db.from("rate_limits").select("last_at").eq("trip_token", body.trip_token).maybeSingle();
  if (rl && Date.now() - new Date(rl.last_at).getTime() < 10_000) return json({ error: "rate limit" }, 429);
  await db.from("rate_limits").upsert({ trip_token: body.trip_token, last_at: new Date().toISOString() });

  const rows = body.points
    .filter((p: any) => Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 && (p.p_bus ?? 0) >= 0.7)
    .map((p: any) => ({
      trip_token: body.trip_token, t: p.t, geom: `SRID=4326;POINT(${p.lon} ${p.lat})`,
      speed_mps: p.speed, accuracy_m: p.acc, p_bus: p.p_bus,
      declared_bus: String(body.declared_bus ?? "").slice(0, 8),
    }));
  if (rows.length) {
    const { error } = await db.from("trip_points").insert(rows);
    if (error) return json({ error: "db" }, 500);
  }
  return json({ accepted: rows.length });
});
