import { supabase } from "./supabase";

export interface StatusRow {
  route_label: string; stop_id: string; stops_away: number | null; eta_min: number | null;
  eta_lo: number | null; eta_hi: number | null;
  source: "LIVE" | "RECENT" | "ESTIMATE" | "NO_DATA"; updated_at: string;
}

export const sendReport = (route_label: string, stop_id: string, kind: "no_show" | "early") =>
  supabase.functions.invoke("reports", { body: { route_label, stop_id, kind } });

export const getReceipt = async (token: string) => {
  const { data } = await supabase.functions.invoke(`trip-receipt/${token}`, { method: "GET" });
  return data as { published: boolean; max_riders: number; points_kept: number } | null;
};

export const deleteAccount = () => supabase.functions.invoke("delete-account");

export function subscribeStatus(route: string, stop: string, cb: (r: StatusRow) => void) {
  const ch = supabase.channel(`status-${route}-${stop}`).on(
    "postgres_changes",
    { event: "*", schema: "public", table: "bus_status", filter: `route_label=eq.${route}` },
    (p) => cb(p.new as StatusRow),
  ).subscribe();
  return () => { supabase.removeChannel(ch); };
}
