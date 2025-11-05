#/bin/sh

RUNDIR='run'

rm -rf "$RUNDIR"
mkdir -p "$RUNDIR"

cp dist/main.cjs dist/menu_preload.js dist/menu_renderer.js dist/live_view_preload.js dist/live_view_renderer.js dist/prefs_preload.js dist/prefs_renderer.js "$RUNDIR"
cp src/electron/live_view_index.html src/electron/menu_index.html src/electron/prefs_index.html src/common/style.css "$RUNDIR"
cp -r assets/flags assets/icons "$RUNDIR"

electron .
