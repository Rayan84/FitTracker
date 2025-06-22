const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add development build optimizations
config.resolver.platforms = ['ios', 'android', 'web'];

// Enable hermes for better performance
config.transformer.hermesCommand = 'hermes';

module.exports = config;
