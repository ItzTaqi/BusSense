import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const nativeStorage = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
};

// Browser preview only: SecureStore does not exist on web. Phones always use SecureStore.
const webStorage = {
  getItem: async (k: string) => globalThis.localStorage?.getItem(k) ?? null,
  setItem: async (k: string, v: string) => globalThis.localStorage?.setItem(k, v),
  removeItem: async (k: string) => globalThis.localStorage?.removeItem(k),
};
// If SecureStore is unavailable (browser preview), fall back instead of throwing.
const safe = <T,>(f: () => Promise<T>, fb: () => Promise<T>) => f().catch(fb);
const storage = Platform.OS === "web" ? webStorage : {
  getItem: (k: string) => safe(() => nativeStorage.getItem(k), () => webStorage.getItem(k)),
  setItem: (k: string, v: string) => safe(() => nativeStorage.setItem(k, v), async () => webStorage.setItem(k, v)),
  removeItem: (k: string) => safe(() => nativeStorage.removeItem(k), async () => webStorage.removeItem(k)),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://localhost",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "missing",
  { auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);

export async function ensureAnonSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) await supabase.auth.signInAnonymously();
}
