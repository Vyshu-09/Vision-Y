/**
 * One-shot: push backend/data/store.json into MongoDB Atlas collections.
 * Usage: npx tsx scripts/migrateToMongo.ts
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectMongo, closeMongo } from "../src/db/mongo.js";
import { saveSnapshotToMongo, type StoreSnapshot } from "../src/db/mongoStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
  const file = path.resolve(__dirname, "../data/store.json");
  if (!fs.existsSync(file)) {
    console.error("Missing", file);
    process.exit(1);
  }
  const snap = JSON.parse(fs.readFileSync(file, "utf8")) as StoreSnapshot;
  if (!snap.users?.length) {
    console.error("store.json has no users");
    process.exit(1);
  }

  await connectMongo();
  await saveSnapshotToMongo({
    ...snap,
    version: 1,
    saved_at: new Date().toISOString(),
  });

  console.log("Migrated to MongoDB:");
  console.log({
    users: snap.users.length,
    policies: snap.policies?.length ?? 0,
    clauses: snap.clauses?.length ?? 0,
    circulars: snap.circulars?.length ?? 0,
    queries: snap.queries?.length ?? 0,
    flags: snap.flags?.length ?? 0,
    conflicts: snap.conflicts?.length ?? 0,
    supersessions: snap.supersessions?.length ?? 0,
    notifications: snap.notifications?.length ?? 0,
    clarifications: snap.clarifications?.length ?? 0,
  });

  await closeMongo();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
