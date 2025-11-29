// sync-versions.js
import fs from 'fs-extra';
import path from 'path';
import process from 'process';

const rootPackagePath = path.join(process.cwd(), 'package.json');
const rnPackagePath = path.join(process.cwd(), 'react-native-app', 'package.json');

async function syncVersions() {
  try {
    const rootPackage = await fs.readJson(rootPackagePath);
    const rnPackage = await fs.readJson(rnPackagePath);

    if (rootPackage.version !== rnPackage.version) {
      console.log(`Syncing version: ${rootPackage.version}`);
      rnPackage.version = rootPackage.version;
      await fs.writeJson(rnPackagePath, rnPackage, { spaces: 2 });
      console.log('Version synchronized successfully.');
    } else {
      console.log('Versions are already in sync.');
    }
  } catch (error) {
    console.error('Error synchronizing versions:', error);
    process.exit(1);
  }
}

syncVersions();
