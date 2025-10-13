#!/bin/sh

set -x

ZIP_FILE=live-tennis.zip
DIST_DIR="dist"

npm run build
mkdir -p "$DIST_DIR"

cd "$DIST_DIR"
rm -rf metadata.json icons schemas flags
cp -r ../src/metadata.json ../src/stylesheet.css ../src/schemas ../src/icons ../assets/flags .

rm -f "$ZIP_FILE"
zip -qr "$ZIP_FILE" *.js *.css metadata.json icons flags schemas
