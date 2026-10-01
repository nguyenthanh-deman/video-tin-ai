#!/usr/bin/env bash
# Cai cong cu can cho pipeline (chay lai nhieu lan khong sao). Dung trong Routine hoac may Linux.
set -u
cd "$(dirname "$0")/.."
SUDO=""; command -v sudo >/dev/null 2>&1 && [ "$(id -u)" != "0" ] && SUDO="sudo"

need_apt=""
command -v ffmpeg >/dev/null 2>&1 || need_apt="$need_apt ffmpeg"
if [ -n "$need_apt" ]; then
  echo ">> Cai:$need_apt"
  $SUDO apt-get update -qq && $SUDO apt-get install -y -qq $need_apt || echo "!! Khong cai duoc$need_apt bang apt"
fi
ffmpeg -hide_banner -filters 2>/dev/null | grep -q rubberband && echo ">> ffmpeg co rubberband" || echo ">> ffmpeg KHONG co rubberband (se dung atempo, chat luong thap hon chut)"

python3 -c "import numpy" 2>/dev/null || pip install -q numpy 2>/dev/null || pip install -q --break-system-packages numpy

[ -d node_modules/three ] && [ -d node_modules/playwright ] || npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Chromium cho Playwright: dung ban co san -> tai qua Playwright -> du phong Chrome for Testing (storage.googleapis.com)
has_chrome() { node pipeline/find_chrome.mjs >/dev/null 2>&1; }
if ! has_chrome; then
  echo ">> Tai Chromium cho Playwright..."
  npx playwright install --with-deps chromium >/tmp/pw.log 2>&1 || npx playwright install chromium >>/tmp/pw.log 2>&1 || true
fi
if ! has_chrome; then
  echo ">> Playwright khong tai duoc (thuong do mang). Thu Chrome for Testing tu storage.googleapis.com..."
  npx playwright install-deps chromium >/dev/null 2>&1 || true
  CFT_VER="${CFT_VER:-131.0.6778.85}"
  mkdir -p /opt/cft 2>/dev/null || $SUDO mkdir -p /opt/cft
  curl -fsSL -o /tmp/cft.zip "https://storage.googleapis.com/chrome-for-testing-public/$CFT_VER/linux64/chrome-headless-shell-linux64.zip" \
    && $SUDO python3 -c "import zipfile;zipfile.ZipFile('/tmp/cft.zip').extractall('/opt/cft')" \
    && $SUDO chmod -R +x /opt/cft/chrome-headless-shell-linux64 || echo "!! Khong tai duoc Chrome for Testing"
fi
has_chrome && echo ">> Chromium: $(node pipeline/find_chrome.mjs)" || echo "!! CHUA CO CHROMIUM - xem README muc Mang"
echo ">> setup xong"
