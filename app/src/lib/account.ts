import { deleteAccount } from "./api";
import { kvRemove } from "./kv";
import { ALL_LOCAL_KEYS } from "./localKeys";
import { ensureAnonSession, supabase } from "./supabase";

export type DeleteResult = { ok: true } | { ok: false };

// Deletes the account on the server FIRST. Only when that succeeds do we erase this phone, so a failed
// attempt never leaves someone half-deleted.
export async function deleteEverything(): Promise<DeleteResult> {
  try {
    const { error } = await deleteAccount();
    if (error) return { ok: false };
  } catch { return { ok: false }; }
  try { await supabase.auth.signOut({ scope: "local" }); } catch { /* the user is already gone server-side */ }
  await Promise.all(ALL_LOCAL_KEYS.map(kvRemove));
  ensureAnonSession().catch(() => {}); // a fresh anonymous identity for whatever happens next
  return { ok: true };
}
