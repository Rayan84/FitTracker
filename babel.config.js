module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add plugin to handle platform-specific extensions
      ["module-resolver", {
        "extensions": [".web.js", ".web.jsx", ".web.ts", ".web.tsx", ".js", ".jsx", ".ts", ".tsx", ".ios.js", ".android.js"],
        "alias": {
          // Define aliases for problematic native modules
          "react-native-maps": process.env.PLATFORM === 'web' 
            ? "./src/components/web-fallbacks/MapsFallback"
            : "react-native-maps"
        }
      }]
    ]
  };
};
