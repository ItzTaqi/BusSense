import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const storage = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
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
