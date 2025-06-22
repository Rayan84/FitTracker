import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SimpleApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FitTracker</Text>
      <Text style={styles.subtitle}>Simple Test Version</Text>
      <Text style={styles.text}>If you see this, the basic app is working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#666',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
});
