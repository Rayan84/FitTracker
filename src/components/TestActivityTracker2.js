import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TestActivityTracker = ({ activityType, color, icon }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Activity Tracker</Text>
      <Text style={styles.activity}>{activityType}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    color: '#FFF',
    marginBottom: 20,
  },
  activity: {
    fontSize: 18,
    color: '#FFF',
  },
});

export default TestActivityTracker;
