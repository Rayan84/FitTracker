import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Web fallback component when MapView is not available
const Map = ({ style, children }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>
        Maps are only available in the mobile app.
        Please use Expo Go on your mobile device to view maps.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  text: {
    textAlign: 'center',
    color: '#666',
    marginHorizontal: 20,
  }
});

export default Map;
