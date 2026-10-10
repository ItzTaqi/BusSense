// Deletes the caller's auth user; riders/followers/follows cascade. Location data has no link to delete.
import { admin, asUser, json } from "../_shared.ts";

Deno.serve(async (req) => {
  const { data: u } = await asUser(req).auth.getUser();
  if (!u?.user) return json({ error: "auth" }, 401);
  const { error } = await admin().auth.admin.deleteUser(u.user.id);
  return error ? json({ error: "db" }, 500) : json({ ok: true });
});
