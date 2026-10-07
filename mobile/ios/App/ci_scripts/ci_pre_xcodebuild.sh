#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=${CI_PRIMARY_REPOSITORY_PATH:-$(CDPATH= cd -- "$SCRIPT_DIR/../../../.." && pwd)}
node "$REPOSITORY_ROOT/mobile/scripts/prepare_ios_icon.mjs" --check-only
swift "$SCRIPT_DIR/verify_app_icon.swift" "$REPOSITORY_ROOT/mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
