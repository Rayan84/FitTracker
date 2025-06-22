import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

let MapView, Polyline, Marker, PROVIDER_GOOGLE;

if (Platform.OS !== 'web') {
  // For native platforms, import from react-native-maps
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Polyline = Maps.Polyline;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} else {
  // For web, use our fallback component
  const MapsFallback = require('./web-fallbacks/MapsFallback');
  MapView = MapsFallback.default;
  Polyline = MapsFallback.Polyline;
  Marker = MapsFallback.Marker;
  PROVIDER_GOOGLE = MapsFallback.PROVIDER_GOOGLE;
}

// Create a forwarded ref component
const Map = forwardRef((props, ref) => {
  return <MapView ref={ref} {...props} />;
});

Map.displayName = 'Map';

// Attach sub-components as static properties
Map.Polyline = Polyline;
Map.Marker = Marker;
Map.PROVIDER_GOOGLE = PROVIDER_GOOGLE;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 200,
  },
  text: {
    textAlign: 'center',
    color: '#666',
    marginHorizontal: 20,
  }
});

export default Map;
