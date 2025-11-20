const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
// Ensure no code other than src/{common,lib} is included.
const commonCodeRoot = path.resolve(workspaceRoot, 'src', 'common');
const libCodeRoot = path.resolve(workspaceRoot, 'src', 'lib');
const parentNoduModules = path.resolve(workspaceRoot, 'node_modules');
const defaultConfig = getDefaultConfig(projectRoot);

const { assetExts, sourceExts } = defaultConfig.resolver;

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {
  watchFolders: [commonCodeRoot, libCodeRoot, parentNoduModules],
  transformer: {
    babelTransformerPath: require.resolve("react-native-css-transformer")
  },

  resolver: {
    assetExts: assetExts,
    sourceExts: [...sourceExts, "css"],
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      parentNoduModules,
    ],
  },
};

const mergedConfig = mergeConfig(defaultConfig, config);

console.log('Watch folders: ', mergedConfig.watchFolders);
console.log('Source extensions: ', mergedConfig.resolver.sourceExts);

module.exports = mergedConfig;
