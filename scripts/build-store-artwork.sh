#!/usr/bin/env bash
set -euo pipefail
mkdir -p store-artwork/iPhone_6.5 store-artwork/iPad_13
make_shot(){
  src="$1"; title="$2"; subtitle="$3"; out="$4"; w="$5"; h="$6"
  inner_w=$((w-120)); inner_h=$((h-620))
  magick -size "${w}x${h}" xc:'#0a0a0c' \
    -fill '#f4f2ef' -font DejaVu-Sans -gravity north -pointsize 58 -annotate +0+150 "${title}" \
    -fill '#a9a7b0' -pointsize 30 -annotate +0+235 "${subtitle}" \
    "${src}" -resize "${inner_w}x${inner_h}>" -gravity center -geometry +0+110 -composite \
    -fill '#8b78ff' -gravity south -pointsize 24 -annotate +0+100 'DLS Magician · Empathie' "${out}"
}
for spec in "iPhone_6.5 1284 2778" "iPad_13 2064 2752"; do
  set -- ${spec}; d="$1"; w="$2"; h="$3"
  make_shot screenshots/login.png 'One shared workspace' 'Secure team entry for product-design collaboration' "store-artwork/${d}/01-login.png" "${w}" "${h}"
  make_shot screenshots/dashboard.png 'Make intent visible' 'Projects, activity, templates, and shared workspaces' "store-artwork/${d}/02-dashboard.png" "${w}" "${h}"
  make_shot screenshots/editor.png 'From intent to interface' 'Structured language, generated JSON, and live preview' "store-artwork/${d}/03-editor.png" "${w}" "${h}"
done
