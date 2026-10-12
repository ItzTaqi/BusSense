import * as Crypto from "expo-crypto";
import { create } from "zustand";
import type { Lang } from "../i18n";
import { Appearance, isAppearance } from "../lib/appearance";
import { kvGet, kvSet } from "../lib/kv";
import { TERMS_VERSION, needsAgreement } from "../lib/terms";

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
  appearance: Appearance;
  tripStartedAt: number | null;
  riderName: string;
  termsAccepted: boolean;
  termsChecked: boolean;
  set: (p: Partial<Pick<State, "lang" | "mode" | "birthYear" | "riderStatus" | "kRiders" | "declaredBus" | "tripToken" | "demo" | "children" | "activeChild" | "appearance" | "tripStartedAt" | "riderName">>) => void;
  setAppearance: (a: Appearance) => void;
  loadAppearance: () => Promise<void>;
  acceptTerms: () => void;
  loadTerms: () => Promise<void>;
  addChild: (c: Omit<Child, "id">) => void;
  removeChild: (id: string) => void;
  setActiveChild: (i: number) => void;
  loadChildren: () => Promise<void>;
}

const KEY = "gonc.children.v1";
const APPEARANCE_KEY = "gonc.appearance.v1";
const TERMS_KEY = "gonc.terms.v1";

export const useApp = create<State>((set, get) => {
  const save = () => { void kvSet(KEY, JSON.stringify(get().children)); };
  return {
    lang: "en", mode: null, birthYear: null, riderStatus: "sleeping", kRiders: 0,
    declaredBus: "", tripToken: null, demo: false, children: [], activeChild: 0, appearance: "system", tripStartedAt: null, riderName: "", termsAccepted: false, termsChecked: false,
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
    acceptTerms: () => { set({ termsAccepted: true }); void kvSet(TERMS_KEY, TERMS_VERSION); },
    loadTerms: async () => { set({ termsAccepted: !needsAgreement(await kvGet(TERMS_KEY)), termsChecked: true }); },
    setAppearance: (a) => { set({ appearance: a }); void kvSet(APPEARANCE_KEY, a); },
    loadAppearance: async () => { const v = await kvGet(APPEARANCE_KEY); if (isAppearance(v)) set({ appearance: v }); },
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
