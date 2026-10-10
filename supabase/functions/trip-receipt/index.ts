// GET /trip/receipt/:trip_token -> {published, max_riders, points_kept}
import { admin, json, UUID_RE } from "../_shared.ts";

Deno.serve(async (req) => {
  const token = new URL(req.url).pathname.split("/").pop() ?? "";
  if (!UUID_RE.test(token)) return json({ error: "bad request" }, 400);
  const db = admin();
  const { data } = await db.from("trip_ends").select("published,max_riders").eq("trip_token", token).maybeSingle();
  const { count } = await db.from("trip_points").select("*", { count: "exact", head: true }).eq("trip_token", token);
  return json({ published: data?.published ?? false, max_riders: data?.max_riders ?? 0, points_kept: count ?? 0 });
});
