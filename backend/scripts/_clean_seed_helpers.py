from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src" / "db" / "seed.ts"
text = p.read_text(encoding="utf-8")

old_imports = (
    'import bcrypt from "bcryptjs";\n'
    'import { embedText } from "../embeddings/embedder.js";\n'
    'import { cloudMedia } from "../media/cloudMedia.js";\n'
    'import { store } from "./store.js";\n'
    'import { normalizeClause, normalizePolicy } from "./normalize.js";\n'
    'import type { Policy, PolicyClause, Role, User } from "../types.js";\n'
)
new_imports = (
    'import bcrypt from "bcryptjs";\n'
    'import { cloudMedia } from "../media/cloudMedia.js";\n'
    'import { store } from "./store.js";\n'
    'import type { User } from "../types.js";\n'
)
if old_imports not in text:
    raise SystemExit("imports block not found")
text = text.replace(old_imports, new_imports, 1)
start = text.find("function policy(")
end = text.find("export function seedDemoData")
if start < 0 or end < 0:
    raise SystemExit(f"helpers bounds not found {start} {end}")
text = text[:start] + text[end:]
p.write_text(text, encoding="utf-8")
print("cleaned", len(text.splitlines()))
