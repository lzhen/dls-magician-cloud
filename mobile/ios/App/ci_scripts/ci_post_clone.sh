#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=${CI_PRIMARY_REPOSITORY_PATH:-$(CDPATH= cd -- "$SCRIPT_DIR/../../../.." && pwd)}
cd "$REPOSITORY_ROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  brew install node@22
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi
npm install --prefix mobile --no-audit --no-fund
cd mobile
npx cap sync ios
node scripts/prepare_ios_icon.mjs
test -s ios/App/App/capacitor.config.json
test -s ios/App/App/public/index.html
printf '\nDLS Magician Xcode Cloud preparation complete.\n'

