"""Remap store.json avatar paths to Cloudinary URLs using cloudMedia.ts map."""
import json
import re
from pathlib import Path

root = Path(r"c:\Users\vyshn\OneDrive\Desktop\vision-y")
media = (root / "backend/src/media/cloudMedia.ts").read_text(encoding="utf-8")
# Extract JSON object after CLOUD_MEDIA =
m = re.search(r"export const CLOUD_MEDIA[^=]*=\s*(\{[\s\S]*?\n\});", media)
if not m:
    raise SystemExit("Could not parse CLOUD_MEDIA")
mapping = json.loads(m.group(1))

store_path = root / "backend/data/store.json"
if not store_path.exists():
    print("no store.json")
    raise SystemExit(0)

data = json.loads(store_path.read_text(encoding="utf-8"))
n = 0
for u in data.get("users", []):
    url = u.get("avatar_url")
    if not url or str(url).startswith("http"):
        continue
    nxt = mapping.get(url) or mapping.get(url.replace(".JPG", ".jpg"))
    if nxt and nxt != url:
        u["avatar_url"] = nxt
        n += 1

store_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
print(f"remapped {n} avatars")
