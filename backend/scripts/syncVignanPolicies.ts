/**
 * Download official Vignan policies from policies.php catalog and activate them.
 * Usage: npm run sync:vignan-policies --prefix backend
 * Optional: FORCE=1 to re-import even when Vignan policies already exist.
 */
import { bootstrapPersistentStore, flushPersistentStore, getPersistMode } from "../src/db/persist.js";
import { closeMongo } from "../src/db/mongo.js";
import { store } from "../src/db/store.js";
import {
  needsOfficialPolicySync,
  syncVignanPolicies,
} from "../src/services/syncVignanPolicies.js";

async function main() {
  // Avoid double-sync inside bootstrap when we intend to force-replace below
  process.env.SKIP_VIGNAN_SYNC = "1";
  await bootstrapPersistentStore();

  const force = process.env.FORCE === "1" || process.argv.includes("--force");
  if (!force && !needsOfficialPolicySync()) {
    console.log(
      `[sync:vignan] Already have ${store.listPolicies().length} policies with vignan.ac.in sources. Pass --force to re-import.`,
    );
    await closeMongo();
    process.exit(0);
  }

  console.log(`[sync:vignan] Syncing (mode=${getPersistMode()}) …`);
  const result = await syncVignanPolicies({ replaceExisting: true });
  await flushPersistentStore();
  console.log(
    `[sync:vignan] imported=${result.imported} removed=${result.removed} skipped=${result.skipped} failed=${result.failed.length}`,
  );
  for (const f of result.failed) {
    console.warn(`  FAIL ${f.title}: ${f.error}`);
  }
  await closeMongo();
  process.exit(result.failed.length && !result.imported ? 1 : 0);
}

main().catch((err) => {
  console.error("[sync:vignan] failed:", err);
  process.exit(1);
});
