// esbuild.js
import { build } from "esbuild";
import { type } from "os";

const commonBuildOptions = {
  bundle: true,
  format: 'esm',
  sourcemap: true,
  outdir: 'dist',
  platform: 'node',
  logLevel: 'verbose',
  target: ['node22'],
};

async function buildElectron() {
  await build({
    ...commonBuildOptions,
    outdir: undefined,
    format: 'cjs',
    entryPoints: ['src/electron/main.ts'],
    outfile: 'dist/main.cjs',
    external: ['electron'],
  });

  await build({
    ...commonBuildOptions,
    platform: 'node',
    format: 'cjs',
    entryPoints: ['./src/electron/menu_preload.ts', './src/electron/live_view_preload.ts', './src/electron/prefs_preload.ts'],
    external: ['electron'],
  }).catch(() => process.exit(1));

  await build({
    ...commonBuildOptions,
    platform: 'browser',
    entryPoints: ['./src/electron/menu_renderer.ts', './src/electron/live_view_renderer.ts', './src/electron/prefs_renderer.ts'],
  });
  console.log('Electron build complete.');
}

async function buildGnome() {
  await build({
    ...commonBuildOptions,
    entryPoints: {
      extension: 'src/gnome/extension.ts',
      prefs: 'src/gnome/prefs.ts'
    },
    platform: 'node',
    target: ['es2022'],
    external: ['@girs/*', 'gi', "gi://*", "resource://*"],
  });

  await build({
    ...commonBuildOptions,
    entryPoints: ['src/gnome/schema.ts'],
  });

  console.log('GNOME extension build complete.');
}

async function main() {
  try {
    await buildElectron();
    await buildGnome();
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

main();
