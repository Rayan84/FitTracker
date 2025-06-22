const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: [
        'react-native-maps',
        '@react-native-async-storage/async-storage',
        'victory-native',
        'nanoid'
      ],
    },
  }, argv);

  // Handle native modules on web
  config.resolve.alias = {
    ...config.resolve.alias,
    // Replace all react-native-maps imports with empty component
    'react-native-maps': path.resolve(__dirname, 'src/components/web-fallbacks/MapsFallback.js'),
    'victory-native': path.resolve(__dirname, 'src/components/web-fallbacks/VictoryNativeFallback.js'),
    // Replace specific problematic files with empty modules
    'react-native-maps/lib/MapMarkerNativeComponent': path.resolve(__dirname, 'src/components/web-fallbacks/EmptyModule.js'),
    'react-native/Libraries/Utilities/codegenNativeCommands': path.resolve(__dirname, 'src/components/web-fallbacks/EmptyModule.js'),
    // Add nanoid fallback
    'nanoid/non-secure': path.resolve(__dirname, 'src/components/web-fallbacks/nanoid/non-secure.js')
  };

  // Add fallback for native modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    'react-native/Libraries/Utilities/codegenNativeCommands': false,
    'nanoid/non-secure': path.resolve(__dirname, 'src/components/web-fallbacks/nanoid/non-secure.js')
  };

  return config;
};
