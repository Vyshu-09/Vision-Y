import { bootstrapPersistentStore, flushPersistentStore } from "../src/db/persist.js";
import { store } from "../src/db/store.js";
import { syncVignanPolicies } from "../src/services/syncVignanPolicies.js";
import { VIGNAN_REGULATIONS_CATALOG } from "../src/services/vignanCatalog.js";

async function main() {
  console.log("=== Ingesting Official Vignan Regulations & Policies ===");
  await bootstrapPersistentStore();

  // 1. Mark existing mock demo policies as demo_only so they are never retrieved by Agent 53
  const mockTitles = [
    "anti-ragging",
    "academic_intergrity_policy",
    "leave and condonation",
    "attendance _policy",
    "examination_and evaluation_policy",
  ];

  let markedMock = 0;
  for (const p of store.listPolicies()) {
    const isMock =
      (p.source_file_url ?? "").startsWith("seed://") ||
      (p.source_file_url ?? "").includes("sample-antiragging") ||
      mockTitles.some((t) => p.title.toLowerCase().includes(t));

    if (isMock) {
      store.updatePolicy(p.id, {
        status: "demo_only",
        source_type: "MOCK_DEMO",
      });
      // Also update clauses
      for (const c of store.clausesForPolicy(p.id)) {
        store.updateClause(c.id, {
          source_type: "MOCK_DEMO",
        });
      }
      markedMock += 1;
      console.log(`[mock-isolated] ${p.title} (${p.id}) -> status: demo_only, source_type: MOCK_DEMO`);
    }
  }
  console.log(`Isolated ${markedMock} mock demo policies.`);

  // 2. Update demo students with cohort metadata
  const studentMetadata: Record<string, { admission_year: number; regulation: string; batch: string; program: string }> = {
    "asha.patel@vignan.ac.in": { admission_year: 2026, regulation: "R26", batch: "2026", program: "B.Tech" },
    "rahul.sharma@vignan.ac.in": { admission_year: 2025, regulation: "R25", batch: "2025", program: "B.Tech" },
    "sneha.reddy@vignan.ac.in": { admission_year: 2022, regulation: "R22", batch: "2022", program: "B.Tech" },
    "arjun.nair@vignan.ac.in": { admission_year: 2022, regulation: "R22", batch: "2022", program: "B.Tech" },
    "meera.krishnan@vignan.ac.in": { admission_year: 2023, regulation: "R22.1", batch: "2023", program: "B.Tech" },
    "vikram.singh@vignan.ac.in": { admission_year: 2025, regulation: "R25", batch: "2025", program: "B.Tech" },
    "ananya.gupta@vignan.ac.in": { admission_year: 2026, regulation: "R26", batch: "2026", program: "B.Tech" },
    "karthik.rao@vignan.ac.in": { admission_year: 2022, regulation: "R22", batch: "2022", program: "B.Tech" },
    "divya.iyer@vignan.ac.in": { admission_year: 2025, regulation: "R25", batch: "2025", program: "B.Tech" },
    "nikhil.joshi@vignan.ac.in": { admission_year: 2026, regulation: "R26", batch: "2026", program: "B.Tech" },
  };

  for (const u of store.users.values()) {
    if (u.role === "student" && studentMetadata[u.email]) {
      const meta = studentMetadata[u.email];
      store.updateUser(u.id, meta);
      console.log(`[user-cohort] ${u.name} (${u.email}) -> ${meta.program} ${meta.regulation} (${meta.batch})`);
    }
  }

  // 3. Ingest official regulations
  console.log("Ingesting Official Vignan Regulations (R26, R25, R22.1, R22)...");
  const regResult = await syncVignanPolicies({
    catalog: VIGNAN_REGULATIONS_CATALOG,
    replaceExisting: true,
  });
  console.log("Regulations sync result:", regResult);

  // 4. Save store
  await flushPersistentStore();
  console.log("=== Ingestion complete. Store flushed to disk. ===");
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
