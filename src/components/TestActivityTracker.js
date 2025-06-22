import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TestActivityTracker = ({ activityType, color, icon }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Test {activityType} Activity</Text>
      <Text style={styles.text}>This is a test to isolate the text string error.</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: '#FFF',
  },
});

export default TestActivityTracker;
