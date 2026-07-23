const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// legacy/ is the old Vite app (its own package.json named "radar") - exclude it
// so Metro's haste map doesn't collide on the duplicate package name.
config.resolver.blockList = [/legacy\/.*/];

// react-native-svg-transformer: import `.svg` files as React components
// (the only way to bundle the base64-embedded service logos, e.g. netflix).
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = withNativeWind(config, { input: './src/global.css' });
