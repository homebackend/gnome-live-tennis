// esbuild.js
import { build } from "esbuild";
import { type } from "os";
import fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process'; // Import execSync

const outDir = path.join(process.cwd(), 'dist');

const commonBuildOptions = {
  bundle: true,
  format: 'esm',
  //sourcemap: true,
  outdir: 'dist',
  platform: 'node',
  //logLevel: 'verbose',
  target: ['node22'],
};

async function copyCommonAssets(outDir, cssTargetName) {
  const cwd = process.cwd();
  await fs.copy(path.join(cwd, 'assets', 'icons'), path.join(outDir, 'icons'));
  await fs.copy(path.join(cwd, 'assets', 'flags'), path.join(outDir, 'flags'));
  await fs.copy(path.join(cwd, 'src', 'common', 'style.css'), path.join(outDir, cssTargetName));
}

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

  try {
    await copyCommonAssets(outDir, 'style.css');
    await fs.copy(path.join(process.cwd(), 'src', 'electron'), outDir, {
      filter: (src, dest) => {
        if (fs.statSync(src).isDirectory()) {
          return true;
        }

        return src.endsWith('.html') || src.endsWith('.css');
      }
    });

    console.log('Assets copied to dist directory successfully.');
  } catch (err) {
    console.error('Error copying assets:', err);
  }

  console.log('Electron build complete.');
}

async function buildGnome() {
  const distDir = path.join(process.cwd(), 'dist-gnome');

  await build({
    ...commonBuildOptions,
    entryPoints: {
      extension: 'src/gnome/extension.ts',
      prefs: 'src/gnome/prefs.ts'
    },
    outdir: distDir,
    platform: 'node',
    target: ['es2022'],
    external: ['@girs/*', 'gi', "gi://*", "resource://*"],
  });

  await build({
    ...commonBuildOptions,
    entryPoints: ['src/gnome/schema.ts'],
    outdir: distDir,
  });

  const schemaDir = path.join(distDir, 'schemas')
  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
  }

  try {
    execSync(`ts-node ${path.join(distDir, 'schema.js')}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('Schema generation failed!');
    process.exit(1);
  }

  await copyCommonAssets(distDir, 'stylesheet.css');
  await fs.rm(`${distDir}/icons/linux`, { recursive: true })
  await fs.rm(`${distDir}/icons/win`, { recursive: true })
  await fs.copy(path.join(process.cwd(), 'src', 'gnome', 'metadata.json'), path.join(distDir, 'metadata.json'));

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
