#!/usr/bin/env bash
# Giao video: commit spec/mo ta/anh QA len nhanh claude/videos, tai video.mp4 len GitHub Releases
# (khong lam phinh repo). Neu khong tao duoc Release thi commit luon video vao nhanh.
# Dung: bash scripts/deliver.sh runs/<id> "<tieu de>"
set -u
cd "$(dirname "$0")/.."
RUN="${1:?thieu runs/<id>}"; TITLE="${2:-$(basename "$RUN")}"
ID="$(basename "$RUN")"; BR="claude/videos"; TAG="video-$ID"
[ -f "$RUN/video.mp4" ] || { echo "LOI: chua co $RUN/video.mp4"; exit 1; }
SRC="$(python3 -c "import json;s=json.load(open('$RUN/spec.json'));print((s.get('sources') or [{}])[0].get('url',''))" 2>/dev/null)"

git rev-parse --abbrev-ref HEAD | grep -qx "$BR" || git checkout -B "$BR"
touch runs/history.md
git add "$RUN/spec.json" "$RUN/qa.jpg" "$RUN/nguon-va-mo-ta.txt" 2>/dev/null

LINK=""
if command -v gh >/dev/null 2>&1; then
  # can commit + push truoc de Release tro vao dung commit
  echo "- $(date +%F) | $TITLE | (dang tai) | $SRC" >> runs/history.md
  git add runs/history.md; git commit -qm "Video $ID: $TITLE" && git push -q origin "$BR"
  cp "$RUN/video.mp4" "/tmp/${ID}.mp4"
  if gh release create "$TAG" "/tmp/${ID}.mp4" --target "$BR" --title "$TITLE" --notes-file "$RUN/nguon-va-mo-ta.txt" >/tmp/rel.txt 2>&1; then
    LINK="$(tail -1 /tmp/rel.txt)"
    sed -i "s#| (dang tai) |#| $LINK |#" runs/history.md
    git add runs/history.md; git commit -qm "history: $ID" && git push -q origin "$BR"
    echo "XONG: video tai len Release $TAG -> $LINK"; exit 0
  fi
  echo "!! Khong tao duoc GitHub Release ($(head -c 300 /tmp/rel.txt)) -> commit video vao nhanh"
  sed -i "s#| (dang tai) |#| $RUN/video.mp4 |#" runs/history.md
else
  echo "- $(date +%F) | $TITLE | $RUN/video.mp4 | $SRC" >> runs/history.md
fi
git add -f "$RUN/video.mp4" runs/history.md
git commit -qm "Video $ID (file mp4): $TITLE" && git push -q origin "$BR"
echo "XONG: video o nhanh $BR, duong dan $RUN/video.mp4"
