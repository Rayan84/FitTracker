import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Dimensions, Image, Platform, StatusBar as RNStatusBar, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { useFitness } from '../context/FitnessContext';

const screenWidth = Dimensions.get('window').width;

const HomeScreen = () => {
  const navigation = useNavigation();
  const { useMiles, formatDistance, isDarkMode, themeColors } = useAppContext();
  const { getStats, getRecentWorkouts } = useFitness();
  const styles = getStyles(themeColors);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState({
    totalDistance: 0,
    totalCalories: 0,
    totalDuration: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  // Load profile photo and fitness data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadProfilePhoto();
      loadFitnessData();
    }, [])
  );

  // Load fitness data from context
  const loadFitnessData = () => {
    const stats = getStats();
    const recent = getRecentWorkouts(3); // Get last 3 workouts
    
    setWeeklyStats({
      totalDistance: stats.totalDistance || 0,
      totalCalories: stats.totalCalories || 0,
      totalDuration: stats.totalDuration || 0
    });
    
    setRecentActivities(recent);
  };

  // Load profile photo from AsyncStorage
  const loadProfilePhoto = async () => {
    try {
      const savedPhoto = await AsyncStorage.getItem('profilePhoto');
      if (savedPhoto) {
        setProfilePhoto(savedPhoto);
      }
    } catch (error) {
      console.error('Error loading profile photo:', error);
    }
  };  // Helper functions for safe rendering
  const safeText = (value) => {
    if (value === null || value === undefined) return '0';
    return String(value);
  };
  const safeNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  // Format duration from minutes to hours and minutes
  const formatDuration = (totalMinutes) => {
    if (!totalMinutes || totalMinutes === 0) return '0m';
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };
  // Format calories with commas
  const formatCalories = (calories) => {
    if (!calories || calories === 0) return '0';
    return Math.round(calories).toLocaleString();
  };

  // Get activity type info (icon, color) from type string
  const getActivityTypeInfo = (type) => {
    const typeMap = {
      'running': { icon: 'run-fast', color: '#FF7043' },
      'walking': { icon: 'walk', color: '#4CAF50' },
      'cycling': { icon: 'bicycle', color: '#5C6BC0' },
    };
    
    const lowercaseType = type?.toLowerCase() || 'running';
    return typeMap[lowercaseType] || typeMap['running'];
  };

  // Format date for recent activities
  const formatWorkoutDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 2) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Activity buttons that lead to different activities
  const activityButtons = [
    {
      title: 'Running',
      icon: 'run-fast',
      color: '#FF7043',
      screen: 'RunningActivity'
    },
    {
      title: 'Walking',
      icon: 'walk',
      color: '#4CAF50',
      screen: 'WalkingActivity'
    },    {
      title: 'Cycling',
      icon: 'bicycle',
      color: '#5C6BC0',
      screen: 'CyclingActivity'
    }
  ];
    return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['left', 'right', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: themeColors.background }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.username, { color: themeColors.text }]}>Hello, Athlete!</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.profilePhotoContainer}>
              {profilePhoto ? (
                <Image 
                  source={{ uri: profilePhoto }} 
                  style={styles.profilePhoto}
                  onError={() => setProfilePhoto(null)}
                />
              ) : (
                <MaterialCommunityIcons name="account-circle" size={40} color={themeColors.primary} />
              )}
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Weekly summary card */}
        <View style={[styles.summaryCard, { backgroundColor: themeColors.surface }]}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: themeColors.text }]}>Weekly Summary</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAll, { color: themeColors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
            {/* Real stats display from workout data */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeColors.text }]}>{formatDistance(safeNumber(weeklyStats.totalDistance))}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{useMiles ? 'mi' : 'km'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeColors.text }]}>{formatCalories(weeklyStats.totalCalories)}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>cal</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeColors.text }]}>{formatDuration(weeklyStats.totalDuration)}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>time</Text>
            </View>
          </View>
        </View>

        {/* Activity section */}
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Activities</Text>
        <View style={styles.activitiesContainer}>
          {activityButtons && activityButtons.map((activity, index) => (
            activity ? (
              <TouchableOpacity
                key={index}
                style={[styles.activityButton, { backgroundColor: activity.color || '#ccc' }]}
                onPress={() => navigation.navigate(activity.screen)}
              >
                <MaterialCommunityIcons name={activity.icon || 'help'} size={32} color="#FFF" />
                <Text style={styles.activityTitle}>{safeText(activity.title)}</Text>
              </TouchableOpacity>
            ) : null
          ))}
        </View>
        {/* Recent activities from real workout data */}
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Recent Activities</Text>
        <View style={styles.recentActivitiesContainer}>
          {recentActivities.length > 0 ? (
            recentActivities.map((workout, index) => {
              const activityInfo = getActivityTypeInfo(workout.type);
              return (
                <View key={workout.id || index} style={[styles.recentActivityItem, { backgroundColor: themeColors.surface }]}>
                  <View style={[styles.activityIconContainer, { backgroundColor: activityInfo.color }]}>
                    <MaterialCommunityIcons name={activityInfo.icon} size={24} color="#FFF" />
                  </View>
                  <View style={styles.activityDetails}>
                    <Text style={[styles.activityName, { color: themeColors.text }]}>
                      {workout.type ? workout.type.charAt(0).toUpperCase() + workout.type.slice(1) : 'Workout'}
                    </Text>
                    <Text style={[styles.activityDate, { color: themeColors.textSecondary }]}>
                      {formatWorkoutDate(workout.date)}
                    </Text>
                  </View>
                  <View style={styles.activityStats}>
                    <Text style={[styles.activityDistance, { color: themeColors.text }]}>
                      {formatDistance(workout.distance || 0)}
                    </Text>
                    <Text style={[styles.activityDuration, { color: themeColors.textSecondary }]}>
                      {formatDuration(workout.duration || 0)}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[styles.emptyStateContainer, { backgroundColor: themeColors.surface }]}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={themeColors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: themeColors.textSecondary }]}>
                No recent activities yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: themeColors.textSecondary }]}>
                Start your first workout to see it here!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (themeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 44 + 20 : (RNStatusBar.currentHeight || 0) + 20,
    paddingBottom: 10,
    backgroundColor: themeColors.background,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.text,
  },  profilePhotoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: themeColors.border,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  summaryCard: {
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',    alignItems: 'center',
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  viewAll: {
    color: themeColors.primary,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  statLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.text,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  activitiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  activityButton: {
    width: (screenWidth - 50) / 3,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },  activityTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 10,
  },
  recentActivitiesContainer: {
    paddingHorizontal: 20,
  },
  recentActivityItem: {
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    marginVertical: 6,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityDetails: {
    flex: 1,
    paddingLeft: 15,
  },
  activityName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  activityDate: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 3,
  },
  activityStats: {
    alignItems: 'flex-end',
  },
  activityDistance: {
    fontWeight: 'bold',
    fontSize: 14,
    color: themeColors.text,
  },  activityDuration: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 3,
  },
  emptyStateContainer: {
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textSecondary,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default HomeScreen;
