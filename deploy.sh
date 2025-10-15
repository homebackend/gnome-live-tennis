#!/bin/sh

EXTENSION=live-tennis-neerajcd@gmail.com
DEST_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION"

gnome-extensions disable "$EXTENSION"

npm run compile:schemas
npm run build
npm run prettify

rm -rf "$DEST_DIR"

mkdir -p "$DEST_DIR"
cp dist/{extension,prefs}.js "$DEST_DIR"
cp src/metadata.json "$DEST_DIR/metadata.json"
cp src/stylesheet.css "$DEST_DIR"
cp -r src/schemas "$DEST_DIR"
cp -r src/icons "$DEST_DIR"
cp -r assets/flags "$DEST_DIR"

if ! gnome-extensions list --enabled | grep -q "$EXTENSION"
then
    gnome-extensions enable "$EXTENSION"
else
    echo "$EXTENSION is already enabled"
fi
