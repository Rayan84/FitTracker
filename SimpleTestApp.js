import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SimpleTestApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🎉 FitTracker is Working!</Text>
      <Text style={styles.subtext}>Your app is connected and running properly.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4893ff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtext: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});
