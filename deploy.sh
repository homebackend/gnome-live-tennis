#!/bin/sh

EXTENSION=live-tennis-neerajcd@gmail.com
DEST_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION"

gnome-extensions disable "$EXTENSION"

npm run build
npm run prettify
glib-compile-schemas dist-gnome/schemas/

rm -rf "$DEST_DIR"

mkdir -p "$DEST_DIR"
cp dist-gnome/{extension,prefs}.js "$DEST_DIR"
cp src/gnome/metadata.json "$DEST_DIR/metadata.json"
cp src/common/style.css "$DEST_DIR"
cp -r dist-gnome/schemas "$DEST_DIR"
cp -r assets/icons "$DEST_DIR"
cp -r assets/flags "$DEST_DIR"

if ! gnome-extensions list --enabled | grep -q "$EXTENSION"
then
    gnome-extensions enable "$EXTENSION"
else
    echo "$EXTENSION is already enabled"
fi
