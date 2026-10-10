// Demo mode: a bundled, clearly-labeled scripted scenario. NOT real data.
import type { StatusRow } from "../lib/api";

export const DEMO_STEPS: StatusRow[] = [
  { route_label: "DEMO-12", stop_id: "demo-3", stops_away: null, eta_min: null, eta_lo: null, eta_hi: null, source: "NO_DATA", updated_at: "" },
  { route_label: "DEMO-12", stop_id: "demo-3", stops_away: 6, eta_min: 14, eta_lo: 11, eta_hi: 17, source: "ESTIMATE", updated_at: "" },
  { route_label: "DEMO-12", stop_id: "demo-3", stops_away: 4, eta_min: 9, eta_lo: 7, eta_hi: 11, source: "LIVE", updated_at: "" },
  { route_label: "DEMO-12", stop_id: "demo-3", stops_away: 2, eta_min: 5, eta_lo: 4, eta_hi: 7, source: "LIVE", updated_at: "" },
  { route_label: "DEMO-12", stop_id: "demo-3", stops_away: 1, eta_min: 2, eta_lo: 1, eta_hi: 3, source: "RECENT", updated_at: "" },
];
