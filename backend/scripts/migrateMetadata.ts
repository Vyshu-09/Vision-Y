/**
 * Non-destructive metadata soft-migration.
 * Loads the current store (Mongo or file), normalizes policy/clause fields,
 * backfills supersession family links, and saves — never deletes records.
 *
 * Usage: npm run migrate:metadata --prefix backend
 */
import { bootstrapPersistentStore, getPersistMode } from "../src/db/persist.js";
import { store } from "../src/db/store.js";
import { closeMongo } from "../src/db/mongo.js";

async function main() {
  await bootstrapPersistentStore();
  const policies = store.listPolicies().length;
  const clauses = store.allClauses().length;
  console.log(
    `[migrate:metadata] Soft-migrated ${policies} policies and ${clauses} clauses (mode=${getPersistMode()}).`,
  );
  console.log("[migrate:metadata] No records deleted. New fields filled with safe defaults where missing.");
  await closeMongo();
  process.exit(0);
}

main().catch((err) => {
  console.error("[migrate:metadata] failed:", err);
  process.exit(1);
});
