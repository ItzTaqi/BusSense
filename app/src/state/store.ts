import { create } from "zustand";
import type { Lang } from "../i18n";

export type Mode = "rider" | "parent";
export type RiderStatus = "sleeping" | "listening" | "onBus" | "paused";

interface State {
  lang: Lang;
  mode: Mode | null;
  birthYear: number | null;
  riderStatus: RiderStatus;
  kRiders: number;
  declaredBus: string;
  tripToken: string | null;
  demo: boolean;
  set: (p: Partial<Omit<State, "set">>) => void;
}

export const useApp = create<State>((set) => ({
  lang: "en", mode: null, birthYear: null, riderStatus: "sleeping", kRiders: 0,
  declaredBus: "", tripToken: null, demo: false,
  set: (p) => set(p),
}));
