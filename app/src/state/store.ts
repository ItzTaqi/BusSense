import * as Crypto from "expo-crypto";
import { create } from "zustand";
import type { Lang } from "../i18n";
import { kvGet, kvSet } from "../lib/kv";

export type Mode = "rider" | "parent";
export type RiderStatus = "sleeping" | "listening" | "onBus" | "paused";

// A child a parent follows. Stored only on the parent's phone (and the follows table, no location data).
export interface Child {
  id: string; name: string; city: string; school: string; districtCode: string; bus: string; stop: string; walkMin: number;
}

interface State {
  lang: Lang;
  mode: Mode | null;
  birthYear: number | null;
  riderStatus: RiderStatus;
  kRiders: number;
  declaredBus: string;
  tripToken: string | null;
  demo: boolean;
  children: Child[];
  activeChild: number;
  set: (p: Partial<Pick<State, "lang" | "mode" | "birthYear" | "riderStatus" | "kRiders" | "declaredBus" | "tripToken" | "demo" | "children" | "activeChild">>) => void;
  addChild: (c: Omit<Child, "id">) => void;
  removeChild: (id: string) => void;
  setActiveChild: (i: number) => void;
  loadChildren: () => Promise<void>;
}

const KEY = "gonc.children.v1";

export const useApp = create<State>((set, get) => {
  const save = () => { void kvSet(KEY, JSON.stringify(get().children)); };
  return {
    lang: "en", mode: null, birthYear: null, riderStatus: "sleeping", kRiders: 0,
    declaredBus: "", tripToken: null, demo: false, children: [], activeChild: 0,
    set: (p) => set(p),
    addChild: (c) => {
      set((s) => ({ children: [...s.children, { ...c, id: Crypto.randomUUID() }], activeChild: s.children.length, mode: "parent" }));
      save();
    },
    removeChild: (id) => {
      set((s) => {
        const children = s.children.filter((c) => c.id !== id);
        return { children, activeChild: Math.min(s.activeChild, Math.max(0, children.length - 1)), mode: children.length ? s.mode : null };
      });
      save();
    },
    setActiveChild: (i) => set({ activeChild: i }),
    loadChildren: async () => {
      const raw = await kvGet(KEY);
      if (!raw) return;
      try {
        const list = JSON.parse(raw) as Child[];
        if (Array.isArray(list) && list.length) set({ children: list, mode: "parent" });
      } catch { /* ignore a corrupt save */ }
    },
  };
});
