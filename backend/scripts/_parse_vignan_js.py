import re, json
from pathlib import Path

html = Path(r"C:\Users\vyshn\AppData\Local\Temp\vignan-policies.html").read_text(encoding="utf-8", errors="ignore")
# embedded JS catalog
m = re.search(r"data\s*=\s*(\[\{.*?\}\])\s*;", html, re.S)
if m:
    raw = m.group(1)
    # fix unquoted href issues if any
    try:
        data = json.loads(raw)
    except Exception as e:
        print("json fail", e)
        data = []
    Path(r"c:\Users\vyshn\OneDrive\Desktop\vision-y\backend\data\vignan-js-data.json").write_text(
        json.dumps(data, indent=2), encoding="utf-8"
    )
    print("js data", len(data))
    for d in data[:5]:
        print(d.get("title"), d.get("link") or d.get("url") or d.get("btn_link") or list(d.keys()))
else:
    print("no data array")
    # show nearby
    i = html.find("policies_card")
    print(html[i : i + 500] if i >= 0 else "none")
