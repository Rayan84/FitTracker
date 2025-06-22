// Web fallback for react-native-maps
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mock MapView component
const MapView = ({ style, children, ...props }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>
        Maps are only available in the mobile app.
        Please use Expo Go on your mobile device to view maps.
      </Text>
      {children}
    </View>
  );
};

// Mock other components from react-native-maps
const Marker = ({ style, ...props }) => null;
const Polyline = ({ style, ...props }) => null;
const Circle = ({ style, ...props }) => null;
const Callout = ({ style, ...props }) => null;
const Polygon = ({ style, ...props }) => null;

// Mock constants
const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = 'default';

// Mock AnimatedRegion
class AnimatedRegion {
  constructor() {}
  timing() { return { start: () => {} }; }
}

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

// Export all components and constants
MapView.Marker = Marker;
MapView.Polyline = Polyline;
MapView.Circle = Circle;
MapView.Callout = Callout;
MapView.Polygon = Polygon;
MapView.AnimatedRegion = AnimatedRegion;

// Default export
export default MapView;

// Named exports
export {
  MapView,
  Marker,
  Polyline,
  Circle,
  Callout,
  Polygon,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  AnimatedRegion
};
