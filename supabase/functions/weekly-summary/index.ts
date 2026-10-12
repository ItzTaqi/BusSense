// POST /weekly-summary -> a short AI-written summary of the weekly insights.
// Sends ONLY aggregate counts (no user data, no locations, no ids) to the Claude API.
// Needs the secret ANTHROPIC_API_KEY (supabase secrets set ANTHROPIC_API_KEY=...). Without it, returns 501 and the app shows a fallback.
import { asUser, json } from "../_shared.ts";

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(1000, Math.round(Number(v)))) : 0);

Deno.serve(async (req) => {
  const { data: u } = await asUser(req).auth.getUser();
  if (!u?.user) return json({ error: "auth" }, 401);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "not configured" }, 501);
  const b = await req.json().catch(() => null);
  if (!b) return json({ error: "bad request" }, 400);
  const facts = {
    weeks: num(b.weeks), didnt_come_total: num(b.totalNoShow), came_early_total: num(b.totalEarly),
    didnt_come_this_week: num(b.thisWeek), didnt_come_last_week: num(b.lastWeek),
    most_reports_on: typeof b.worstDay === "string" ? b.worstDay.slice(0, 12) : null,
  };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5", max_tokens: 200,
      messages: [{ role: "user", content:
        "Write a calm two-sentence weekly summary of this school bus's reliability for a parent. Use only these counts of parent " +
        "reports. Do not guess causes and do not claim certainty. Counts: " + JSON.stringify(facts) }],
    }),
  });
  if (!r.ok) return json({ error: "ai unavailable" }, 502);
  const out = await r.json();
  const text = (out.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join(" ").trim();
  return json({ summary: text.slice(0, 600) });
});
