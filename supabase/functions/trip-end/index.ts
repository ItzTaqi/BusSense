// POST /trip/end {trip_token}: deletes that token's raw points; stores only the receipt.
import { admin, json, UUID_RE } from "../_shared.ts";

Deno.serve(async (req) => {
  const body = await req.json().catch(() => null);
  if (!body || !UUID_RE.test(body.trip_token)) return json({ error: "bad request" }, 400);
  const db = admin();
  // Max riders ever seen is written by the worker into trip_ends; keep any existing value.
  const { data: prev } = await db.from("trip_ends").select("published,max_riders")
    .eq("trip_token", body.trip_token).maybeSingle();
  const { error } = await db.rpc("end_trip", {
    p_token: body.trip_token, p_published: prev?.published ?? false, p_max_riders: prev?.max_riders ?? 0,
  });
  return error ? json({ error: "db" }, 500) : json({ ok: true });
});
