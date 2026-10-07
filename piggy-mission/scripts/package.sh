#!/usr/bin/env sh
# Build a deploy-ready ZIP of the static site (no build step needed).
#   sh scripts/package.sh [out.zip]
# The ZIP holds one folder with index.html at its top, ready for
# `npx vercel --prod` (or Netlify Drop / GitHub Pages / any static host).
set -eu
cd "$(dirname "$0")/.."
NAME=piggys-netball-mission
OUT="${1:-$PWD/dist/$NAME.zip}"
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/$NAME" "$(dirname "$OUT")"
cp -R index.html vercel.json src data assets "$STAGE/$NAME/"
cp DEPLOY.md "$STAGE/$NAME/README.md"
rm -f "$OUT"
(cd "$STAGE" && zip -qr -X "$OUT" "$NAME")
echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
