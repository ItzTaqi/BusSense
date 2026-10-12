// GET /routes/:label/report?weeks=4 -> anonymous report timestamps for the weekly insights.
// Reports hold no user id. On-time % and minutes-late need segment_times from route learning (not built yet).
import { admin, json } from "../_shared.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const label = decodeURIComponent(url.pathname.split("/").filter(Boolean).slice(-2)[0] ?? "");
  const weeks = Math.min(Math.max(Number(url.searchParams.get("weeks") ?? 4), 1), 8);
  const since = new Date(Date.now() - weeks * 7 * 864e5).toISOString();
  const { data, error } = await admin().from("reports").select("kind,t").eq("route_label", label).gte("t", since).limit(1000);
  if (error) return json({ error: "db" }, 500);
  return json({ route_label: label, weeks, reports: data ?? [] });
});
