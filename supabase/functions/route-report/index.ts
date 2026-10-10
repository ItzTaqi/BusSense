// GET /routes/:label/report?weeks=4 -> counts of "didn't come" / "early" reports (honest minimum).
// TODO(team): add on-time % and avg minutes late from segment_times once route learning (M4) exists.
import { admin, json } from "../_shared.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const label = decodeURIComponent(url.pathname.split("/").filter(Boolean).slice(-2)[0] ?? "");
  const weeks = Math.min(Number(url.searchParams.get("weeks") ?? 4), 8);
  const since = new Date(Date.now() - weeks * 7 * 864e5).toISOString();
  const { data } = await admin().from("reports").select("kind,t").eq("route_label", label).gte("t", since);
  const count = (k: string) => (data ?? []).filter((r) => r.kind === k).length;
  return json({ route_label: label, weeks, no_show_reports: count("no_show"), early_reports: count("early") });
});
