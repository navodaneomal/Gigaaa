#!/usr/bin/env sh
# Zip the finished PDF together with everything needed to rebuild it.
#   sh scripts/package.sh [out.zip]
set -eu
cd "$(dirname "$0")/.."
OUT="${1:-$PWD/dist/the-small-things.zip}"
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
[ -f dist/the-small-things.pdf ] || node scripts/build.mjs
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
N=the-small-things
mkdir -p "$STAGE/$N/source"
cp dist/the-small-things.pdf "$STAGE/$N/The Small Things.pdf"
cp -R content src scripts assets package.json README.md "$STAGE/$N/source/"
rm -f "$OUT"
(cd "$STAGE" && zip -qr -X "$OUT" "$N")
echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
