// POST /reports {route_label, stop_id, kind: 'no_show'|'early'}
import { admin, asUser, json } from "../_shared.ts";

Deno.serve(async (req) => {
  const { data: u } = await asUser(req).auth.getUser();
  if (!u?.user) return json({ error: "auth" }, 401);
  const b = await req.json().catch(() => null);
  if (!b || !["no_show", "early"].includes(b.kind) || !b.route_label || !b.stop_id) return json({ error: "bad request" }, 400);
  // Stored without user id.
  const { error } = await admin().from("reports").insert({ route_label: b.route_label, stop_id: b.stop_id, kind: b.kind });
  return error ? json({ error: "db" }, 500) : json({ ok: true });
});
