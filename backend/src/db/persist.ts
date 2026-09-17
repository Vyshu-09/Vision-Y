import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { remapUserAvatars } from "../media/remapAvatars.js";
import { connectMongo, isMongoConfigured } from "./mongo.js";
import { loadSnapshotFromMongo, saveSnapshotToMongo, type StoreSnapshot } from "./mongoStore.js";
import { seedDemoData } from "./seed.js";
import { store } from "./store.js";
import { normalizeSnapshotPoliciesAndClauses } from "./normalize.js";
import { ensureIndexes } from "./mongo.js";
import { needsOfficialPolicySync, syncVignanPolicies } from "../services/syncVignanPolicies.js";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let persistReady = false;
let persistMode: "mongo" | "file" = "file";

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
  const { policies, clauses } = normalizeSnapshotPoliciesAndClauses(
    snap.policies ?? [],
    snap.clauses ?? [],
  );
  store.users = new Map(snap.users.map((u) => [u.id, u]));
  store.policies = new Map(policies.map((p) => [p.id, p]));
  store.clauses = new Map(clauses.map((c) => [c.id, c]));
  store.circulars = new Map(snap.circulars.map((c) => [c.id, c]));
  store.queries = new Map(snap.queries.map((q) => [q.id, q]));
  store.flags = new Map(snap.flags.map((f) => [f.id, f]));
  store.conflicts = new Map(snap.conflicts.map((c) => [c.id, c]));
  store.supersessions = new Map(snap.supersessions.map((s) => [s.id, s]));
  store.notifications = new Map(snap.notifications.map((n) => [n.id, n]));
  store.clarifications = new Map(snap.clarifications.map((t) => [t.id, t]));
}

function saveFileNow(): void {
  const file = dataFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(toSnapshot(), null, 2), "utf8");
  fs.renameSync(tmp, file);
}

async function saveNow(): Promise<void> {
  const snap = toSnapshot();
  if (persistMode === "mongo") {
    await saveSnapshotToMongo(snap);
    // Keep a local backup copy too
    try {
      saveFileNow();
    } catch {
      /* ignore backup failures */
    }
    return;
  }
  saveFileNow();
}

function scheduleSave(): void {
  if (!persistReady) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void saveNow().catch((err) => {
      console.error("[persist] failed to save store:", err);
    });
  }, 500);
}

function tryLoadFile(): boolean {
  const file = dataFilePath();
  if (!fs.existsSync(file)) return false;
  try {
    const raw = fs.readFileSync(file, "utf8");
    const snap = JSON.parse(raw) as StoreSnapshot;
    if (!snap?.users?.length) return false;
    applySnapshot(snap);
    console.log(`[persist] Loaded file data from ${file} (${snap.policies?.length ?? 0} policies)`);
    return true;
  } catch (err) {
    console.error("[persist] Could not load store file:", err);
    return false;
  }
}

/**
 * Prefer MongoDB when MONGODB_URI is set.
 * Migrates local store.json → Mongo on first connect if Atlas is empty.
 */
export async function bootstrapPersistentStore(): Promise<void> {
  if (isMongoConfigured()) {
    try {
      await connectMongo();
      await ensureIndexes();
      persistMode = "mongo";
      const mongoSnap = await loadSnapshotFromMongo();
      if (mongoSnap?.users?.length) {
        applySnapshot(mongoSnap);
        // Soft-migrate: persist normalized metadata fields back without wiping data
        await saveNow();
        console.log(
          `[persist] Loaded MongoDB data (${mongoSnap.policies.length} policies, ${mongoSnap.users.length} users)`,
        );
      } else if (tryLoadFile()) {
        await saveSnapshotToMongo(toSnapshot());
        console.log(`[persist] Migrated local store.json → MongoDB`);
      } else {
        seedDemoData();
        await saveNow();
        console.log(`[persist] Seeded demo data → MongoDB`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[persist] MongoDB unavailable, falling back to file:", msg);
      console.error(
        "[persist] Tip: In Atlas → Network Access, allow 0.0.0.0/0 (or Render outbound IPs), then redeploy.",
      );
      persistMode = "file";
      if (!tryLoadFile()) {
        seedDemoData();
        saveFileNow();
        console.log(`[persist] Seeded demo data → ${dataFilePath()}`);
      }
    }
  } else {
    persistMode = "file";
    if (!tryLoadFile()) {
      seedDemoData();
      saveFileNow();
      console.log(`[persist] Seeded demo data → ${dataFilePath()}`);
    } else {
      // Soft-migrate file snapshot with new metadata defaults
      saveFileNow();
    }
  }

  const remapped = remapUserAvatars(store.users.values());
  if (remapped > 0) {
    await saveNow();
    console.log(`[persist] Remapped ${remapped} avatar URLs to Cloudinary`);
  }

  // Replace mock seed policies with official Vignan PDFs when empty / mock / missing vignan.ac.in
  if (process.env.SKIP_VIGNAN_SYNC !== "1" && needsOfficialPolicySync()) {
    try {
      console.log("[persist] Syncing official policies from vignan.ac.in …");
      const result = await syncVignanPolicies({ replaceExisting: true });
      await saveNow();
      console.log(
        `[persist] Vignan sync: imported=${result.imported} removed=${result.removed} failed=${result.failed.length}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[persist] Vignan policy sync failed:", msg);
    }
  }

  persistReady = true;
  store.onChange(scheduleSave);
}

export function getPersistMode(): "mongo" | "file" {
  return persistMode;
}

/** Flush pending store changes (used by CLI scripts). */
export async function flushPersistentStore(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await saveNow();
}
