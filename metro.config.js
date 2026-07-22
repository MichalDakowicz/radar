const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// legacy/ is the old Vite app (its own package.json named "radar") - exclude it
// so Metro's haste map doesn't collide on the duplicate package name.
config.resolver.blockList = [/legacy\/.*/];

module.exports = withNativeWind(config, { input: './src/global.css' });
