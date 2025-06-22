// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

// Get the default config
const defaultConfig = getDefaultConfig(__dirname);

// Modify the resolver to handle platform-specific extensions
defaultConfig.resolver.sourceExts = process.env.PLATFORM === 'web'
  ? ['web.tsx', 'web.ts', 'web.jsx', 'web.js', 'tsx', 'ts', 'jsx', 'js', 'json']
  : ['tsx', 'ts', 'jsx', 'js', 'json'];

module.exports = defaultConfig;
