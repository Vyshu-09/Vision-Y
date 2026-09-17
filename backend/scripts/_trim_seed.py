from pathlib import Path

p = Path(r"c:\Users\vyshn\OneDrive\Desktop\vision-y\backend\src\db\seed.ts")
text = p.read_text(encoding="utf-8")
marker = "  // Demo chain:"
idx = text.find(marker)
if idx < 0:
    raise SystemExit("marker not found")
# keep through insertUser(admin);
admin_line = "  store.insertUser(admin);"
admin_idx = text.rfind(admin_line, 0, idx)
if admin_idx < 0:
    raise SystemExit("admin insert not found")
head = text[: admin_idx + len(admin_line)]
tail = """

  // Policies come from official Vignan PDFs via syncVignanPolicies (not mock seed text).
  store.insertNotification({
    id: store.newId(),
    user_id: null,
    role_targets: [\"student\", \"faculty\", \"staff\", \"super_admin\"],
    severity: \"info\",
    title: \"Official Vignan policies\",
    body: \"Policy library syncs from https://vignan.ac.in/newvignan/policies.php — answers cite real university documents by role.\",
    event_type: \"new_document\",
    policy_id: null,
    read: false,
    created_at: store.now(),
  });
}
"""
p.write_text(head + tail, encoding="utf-8")
print("ok", len((head + tail).splitlines()))
