import { cloudMedia } from "./cloudMedia.js";

/** Remap any /images avatar still on disk paths after Cloudinary sync. */
export function remapUserAvatars(
  users: Iterable<{ avatar_url: string | null }>,
): number {
  let n = 0;
  for (const u of users) {
    if (!u.avatar_url || u.avatar_url.startsWith("http")) continue;
    const next = cloudMedia(u.avatar_url);
    if (next && next !== u.avatar_url) {
      u.avatar_url = next;
      n += 1;
    }
  }
  return n;
}
