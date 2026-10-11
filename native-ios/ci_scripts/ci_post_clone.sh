#!/bin/sh
set -eu

# Xcode 27 selects Swift 6.4 manifests for existing pinned packages. Those
# manifests add swift-issue-reporting, which Xcode 16's resolved graph lacks.
# Resolve with the build's actual toolchain before Xcode Cloud's strict check.
# Keep Package.resolved so the resolver can retain existing package pins.
if [ -n "${CI_PRIMARY_REPOSITORY_PATH:-}" ]; then
    native_dir="$CI_PRIMARY_REPOSITORY_PATH/native-ios"
else
    native_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
fi

xcodebuild -resolvePackageDependencies \
    -project "$native_dir/DLSMagician.xcodeproj" \
    -scheme DLSMagician
