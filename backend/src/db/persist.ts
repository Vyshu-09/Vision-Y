import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { remapUserAvatars } from "../media/cloudMedia.js";
import { seedDemoData } from "./seed.js";
import { store } from "./store.js";
import type {
  Circular,
  ClarificationTicket,
  ConflictRecord,
  FlagRecord,
  Notification,
  Policy,
  PolicyClause,
  QueryRecord,
  SupersessionReview,
  User,
} from "../types.js";

interface StoreSnapshot {
  version: 1;
  saved_at: string;
  users: User[];
  policies: Policy[];
  clauses: PolicyClause[];
  circulars: Circular[];
  queries: QueryRecord[];
  flags: FlagRecord[];
  conflicts: ConflictRecord[];
  supersessions: SupersessionReview[];
  notifications: Notification[];
  clarifications: ClarificationTicket[];
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let persistReady = false;

function dataFilePath(): string {
  return path.resolve(config.dataFile);
}

function toSnapshot(): StoreSnapshot {
  return {
    version: 1,
    saved_at: new Date().toISOString(),
    users: [...store.users.values()],
    policies: [...store.policies.values()],
    clauses: [...store.clauses.values()],
    circulars: [...store.circulars.values()],
    queries: [...store.queries.values()],
    flags: [...store.flags.values()],
    conflicts: [...store.conflicts.values()],
    supersessions: [...store.supersessions.values()],
    notifications: [...store.notifications.values()],
    clarifications: [...store.clarifications.values()],
  };
}

function applySnapshot(snap: StoreSnapshot): void {
  store.users = new Map(snap.users.map((u) => [u.id, u]));
  store.policies = new Map(snap.policies.map((p) => [p.id, p]));
  store.clauses = new Map(snap.clauses.map((c) => [c.id, c]));
  store.circulars = new Map(snap.circulars.map((c) => [c.id, c]));
  store.queries = new Map(snap.queries.map((q) => [q.id, q]));
  store.flags = new Map(snap.flags.map((f) => [f.id, f]));
  store.conflicts = new Map(snap.conflicts.map((c) => [c.id, c]));
  store.supersessions = new Map(snap.supersessions.map((s) => [s.id, s]));
  store.notifications = new Map(snap.notifications.map((n) => [n.id, n]));
  store.clarifications = new Map(snap.clarifications.map((t) => [t.id, t]));
}

function saveNow(): void {
  const file = dataFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(toSnapshot(), null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function scheduleSave(): void {
  if (!persistReady) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      saveNow();
    } catch (err) {
      console.error("[persist] failed to save store:", err);
    }
  }, 400);
}

function tryLoad(): boolean {
  const file = dataFilePath();
  if (!fs.existsSync(file)) return false;
  try {
    const raw = fs.readFileSync(file, "utf8");
    const snap = JSON.parse(raw) as StoreSnapshot;
    if (!snap?.users?.length) return false;
    applySnapshot(snap);
    console.log(`[persist] Loaded live data from ${file} (${snap.policies?.length ?? 0} policies)`);
    return true;
  } catch (err) {
    console.error("[persist] Could not load store file, will reseed:", err);
    return false;
  }
}

/**
 * Load previous session from disk if present; otherwise seed demo data.
 * Then auto-save on every store mutation so uploads/chats survive restarts.
 */
export function bootstrapPersistentStore(): void {
  const loaded = tryLoad();
  if (!loaded) {
    seedDemoData();
    saveNow();
    console.log(`[persist] Seeded demo data → ${dataFilePath()}`);
  } else {
    const remapped = remapUserAvatars(store.users.values());
    if (remapped > 0) {
      saveNow();
      console.log(`[persist] Remapped ${remapped} avatar URLs to Cloudinary`);
    }
  }
  persistReady = true;
  store.onChange(scheduleSave);
}
