import re, json
from pathlib import Path

html = Path(r"C:\Users\vyshn\AppData\Local\Temp\vignan-policies.html").read_text(encoding="utf-8", errors="ignore")
cards = re.findall(
    r'course-name">(.*?)</div>.*?policy-desc">(.*?)</div>.*?href="([^"]+)"',
    html,
    re.S,
)
out = []
for name, desc, href in cards:
    name = re.sub(r"\s+", " ", name).strip()
    desc = re.sub(r"\s+", " ", desc).strip()
    if href.startswith("http"):
        url = href
    elif href.startswith("/"):
        url = "https://vignan.ac.in" + href
    else:
        url = "https://vignan.ac.in/newvignan/" + href
    out.append({"title": name, "description": desc, "url": url})

Path(r"c:\Users\vyshn\OneDrive\Desktop\vision-y\backend\data\vignan-catalog-raw.json").parent.mkdir(parents=True, exist_ok=True)
Path(r"c:\Users\vyshn\OneDrive\Desktop\vision-y\backend\data\vignan-catalog-raw.json").write_text(
    json.dumps(out, indent=2), encoding="utf-8"
)
print("COUNT", len(out))
for o in out:
    print(o["title"], "->", o["url"][:80])
