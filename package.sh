#!/bin/sh

ZIP_FILE=live-tennis-neerajcd@gmail.com.zip
DIST_DIR="dist"

npm run compile:schemas
npm run build
mkdir -p "$DIST_DIR"

cd "$DIST_DIR"
rm -rf metadata.json icons schemas flags
cp -r ../src/{metadata.json,stylesheet.css,schemas,icons} ../assets/flags .

rm -f "$ZIP_FILE"
zip -qr "$ZIP_FILE" *.js *.css metadata.json icons flags schemas
