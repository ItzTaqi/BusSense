// Tiny on-device key/value store: SecureStore on phones, localStorage in the browser preview. Never throws.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function kvGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
    return await SecureStore.getItemAsync(key);
  } catch { return null; }
}
export async function kvSet(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch { /* storage unavailable: the app still works for this session */ }
}
