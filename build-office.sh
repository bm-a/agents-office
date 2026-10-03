#!/bin/bash
# Ray edition build: export the vault graph → stamp the note count → build the 3D bundle.
# Called by the ray-dashboard-refresh cron before pushing to the phone.
set -e
cd "$(dirname "$0")"
VAULT="${VAULT:-$HOME/workspace/second-brain}"

# 1. layout the vault graph → brain-graph.json (consumed by ray-dashboard.py)
node vault-export.mjs

# 2. stamp the live note count into the baked cosmetic counters
N=$(python3 -c "import json;print(json.load(open('$HOME/workspace/ray-dashboard/brain-graph.json'))['notes'])")
for f in src/data.js src/v1data.js; do
  python3 - "$f" "$N" <<'EOF'
import re, sys
p, n = sys.argv[1], sys.argv[2]
s = open(p).read()
s = re.sub(r"(label:\s*'NOTES INDEXED',\s*val:\s*)\d+", r"\g<1>" + n, s)
s = re.sub(r"(indexing vault — )\d+( notes)", r"\g<1>" + n + r"\g<2>", s)
s = re.sub(r"(Vault indexed: )\d+( notes)", r"\g<1>" + n + r"\g<2>", s)
open(p, 'w').write(s)
EOF
done

# 3. bake the real vault into the bundle as the offline fallback graph
AO_BRAIN="$VAULT" node build.mjs
echo "office build done — $(du -h dist/command-centre-v2.html | cut -f1)"
