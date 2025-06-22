import React from 'react';
import { View, Text } from 'react-native';

export default function MinimalApp() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, color: '#333' }}>Minimal Test App</Text>
      <Text style={{ fontSize: 16, marginTop: 10, color: '#666' }}>This should load very quickly!</Text>
    </View>
  );
}
