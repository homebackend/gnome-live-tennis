#!/bin/sh

set -x

ZIP_FILE=live-tennis.zip
DIST_DIR="dist/extension"

mkdir -p dist/schemas
npm run build
npm run prettify
npm run generate:schemas
mkdir -p "$DIST_DIR"

cd "$DIST_DIR"
rm -rf metadata.json icons schemas flags
cp -r ../extension.js ../prefs.js ../../src/gnome/metadata.json ../../src/gnome/stylesheet.css ../schemas ../../assets/icons ../../assets/flags .

rm -f "$ZIP_FILE"
zip -qr "$ZIP_FILE" *.js *.css metadata.json icons flags schemas
