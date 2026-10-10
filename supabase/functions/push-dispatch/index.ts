// Turns bus_status changes into pushes. Triggered by a database webhook on bus_status.
// M4 TODO(team): wire running-late, not-seen-yet and passed-your-stop rules next to leaveNow().
import { admin, json } from "../_shared.ts";
import { leaveNow, type Source } from "./alertRules.ts";

Deno.serve(async (req) => {
  const { record } = await req.json();
  const db = admin();
  const { data: follows } = await db.from("follows").select("follower_id, alert_prefs")
    .eq("route_label", record.route_label).eq("stop_id", record.stop_id);
  let sent = 0;
  for (const f of follows ?? []) {
    const { data: fol } = await db.from("followers").select("push_token,walk_min").eq("id", f.follower_id).single();
    if (!fol?.push_token) continue;
    const ageMin = (Date.now() - new Date(record.updated_at).getTime()) / 60000;
    const d = leaveNow({ source: record.source as Source, eta_lo: record.eta_lo, ageMin },
      { walkMin: fol.walk_min, quietNow: false, lastPushMinAgoForStop: null, alreadySentLeaveNow: false });
    if (!d.send) continue;
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: fol.push_token, title: "GoYellow", body: d.text }),
    });
    sent++;
  }
  return json({ sent });
});
