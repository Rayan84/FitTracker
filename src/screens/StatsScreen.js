import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Dimensions,
    Platform,
    StatusBar as RNStatusBar,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { useFitness } from '../context/FitnessContext';

const { width } = Dimensions.get('window');

const StatsScreen = () => {
  const { useMiles, formatDistance, convertDistance, isDarkMode, themeColors } = useAppContext();
  const { workouts, getStats } = useFitness();
  const styles = getStyles(themeColors);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year, all

  // Calculate stats from workouts
  const calculateStats = () => {
    if (workouts.length === 0) {
      return {
        totalWorkouts: 0,
        totalDistance: 0,
        totalSteps: 0,
        totalCalories: 0,
        totalDuration: 0,
        avgDistance: 0,
        avgDuration: 0,
        personalBests: [],
      };
    }

    const totalWorkouts = workouts.length;
    const totalDistance = workouts.reduce((sum, workout) => sum + parseFloat(workout.distance || 0), 0);
    const totalSteps = workouts.reduce((sum, workout) => sum + parseInt(workout.steps || 0), 0);
    const totalCalories = workouts.reduce((sum, workout) => sum + parseInt(workout.calories || 0), 0);
    const totalDuration = workouts.reduce((sum, workout) => sum + parseInt(workout.duration || 0), 0);

    const avgDistance = totalDistance / totalWorkouts;
    const avgDuration = totalDuration / totalWorkouts;

    // Calculate personal bests
    const longestRun = Math.max(...workouts.map(w => parseFloat(w.distance || 0)));
    const longestDuration = Math.max(...workouts.map(w => parseInt(w.duration || 0)));
    const mostSteps = Math.max(...workouts.map(w => parseInt(w.steps || 0)));
    const mostCalories = Math.max(...workouts.map(w => parseInt(w.calories || 0)));    const personalBests = [
      { title: 'Longest Distance', value: formatDistance(longestRun), icon: 'map-marker-path' },
      { title: 'Longest Duration', value: formatTime(longestDuration), icon: 'clock-outline' },
      { title: 'Most Steps', value: mostSteps.toLocaleString(), icon: 'shoe-print' },
      { title: 'Most Calories', value: mostCalories.toLocaleString(), icon: 'fire' },
    ];

    return {
      totalWorkouts,
      totalDistance,
      totalSteps,
      totalCalories,
      totalDuration,
      avgDistance,
      avgDuration,
      personalBests,
    };
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const stats = calculateStats();
  const achievements = [
    { title: 'Early Bird', description: '5 morning workouts', icon: 'weather-sunset-up', completed: workouts.length >= 5 },
    { title: 'Distance Master', description: `Complete ${useMiles ? '31' : '50'}${useMiles ? 'mi' : 'km'} total`, icon: 'run-fast', completed: stats.totalDistance >= (useMiles ? 31 : 50) },
    { title: 'Consistency King', description: '10 workouts completed', icon: 'calendar-check', completed: stats.totalWorkouts >= 10 },
    { title: 'Step Counter', description: '50,000 total steps', icon: 'shoe-print', completed: stats.totalSteps >= 50000 },
    { title: 'Calorie Burner', description: 'Burn 5,000 calories', icon: 'fire', completed: stats.totalCalories >= 5000 },
  ];

  const periodOptions = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
    { key: 'all', label: 'All Time' },
  ];
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Activity Stats</Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periodOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.periodButton,
                selectedPeriod === option.key && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(option.key)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === option.key && styles.periodButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Stats Overview */}
        <View style={styles.statsOverviewContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="run" size={32} color="#FF7043" />
            <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
            <View style={styles.statCard}>
            <MaterialCommunityIcons name="map-marker-path" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>{formatDistance(stats.totalDistance)}</Text>
            <Text style={styles.statLabel}>Total {useMiles ? 'MI' : 'KM'}</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="shoe-print" size={32} color="#5C6BC0" />
            <Text style={styles.statValue}>{(stats.totalSteps / 1000).toFixed(1)}K</Text>
            <Text style={styles.statLabel}>Steps</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="fire" size={32} color="#FF5722" />
            <Text style={styles.statValue}>{(stats.totalCalories / 1000).toFixed(1)}K</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>

        {/* Average Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Averages</Text>
        </View>
          <View style={styles.averageStatsContainer}>
          <View style={styles.averageStatItem}>
            <Text style={styles.averageStatValue}>{formatDistance(stats.avgDistance)}</Text>
            <Text style={styles.averageStatLabel}>Average Distance</Text>
          </View>
          <View style={styles.averageStatDivider} />
          <View style={styles.averageStatItem}>
            <Text style={styles.averageStatValue}>{formatTime(stats.avgDuration)}</Text>
            <Text style={styles.averageStatLabel}>Average Duration</Text>
          </View>
        </View>

        {/* Personal Bests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Personal Bests</Text>
        </View>
        
        <View style={styles.personalBestsContainer}>
          {stats.personalBests.map((best, index) => (
            <View key={index} style={styles.personalBestItem}>
              <MaterialCommunityIcons name={best.icon} size={24} color="#4893ff" />
              <View style={styles.personalBestText}>
                <Text style={styles.personalBestTitle}>{best.title}</Text>
                <Text style={styles.personalBestValue}>{best.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
        </View>
        
        <View style={styles.achievementsContainer}>
          {achievements.map((achievement, index) => (
            <View key={index} style={styles.achievementItem}>
              <View 
                style={[
                  styles.achievementIconContainer,
                  !achievement.completed && styles.achievementIconContainerIncomplete
                ]}
              >
                <MaterialCommunityIcons 
                  name={achievement.icon} 
                  size={24} 
                  color={achievement.completed ? 'white' : '#AAAAAA'} 
                />
              </View>
              <View style={styles.achievementText}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              </View>
              {achievement.completed && (
                <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
              )}
            </View>
          ))}
        </View>

        {/* Recent Activity Summary */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        
        <View style={styles.recentActivityContainer}>
          {workouts.slice(-3).reverse().map((workout, index) => (
            <View key={index} style={styles.recentActivityItem}>
              <MaterialCommunityIcons 
                name={workout.type === 'Running' ? 'run' : workout.type === 'Walking' ? 'walk' : 'bike'} 
                size={24} 
                color="#4893ff" 
              />
              <View style={styles.recentActivityText}>
                <Text style={styles.recentActivityType}>{workout.type}</Text>
                <Text style={styles.recentActivityDetails}>
                  {workout.distance} km • {formatTime(workout.duration)} • {workout.calories} cal
                </Text>
              </View>
              <Text style={styles.recentActivityDate}>
                {new Date(workout.date).toLocaleDateString()}
              </Text>
            </View>
          ))}
          {workouts.length === 0 && (
            <View style={styles.noDataContainer}>
              <MaterialCommunityIcons name="chart-line" size={60} color="#ccc" />
              <Text style={styles.noDataText}>No workout data yet</Text>
              <Text style={styles.noDataSubtext}>Start your first workout to see stats here!</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? 44 + 20 : (RNStatusBar.currentHeight || 0) + 20,
    backgroundColor: themeColors.surface,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: themeColors.surface,
    marginBottom: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: themeColors.surface,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: themeColors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  statsOverviewContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: themeColors.surface,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: themeColors.surface,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.text,
  },  averageStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: themeColors.surface,
    marginBottom: 10,
  },
  averageStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  averageStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.primary,
  },
  averageStatLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  averageStatDivider: {
    width: 1,
    backgroundColor: themeColors.border,
    marginHorizontal: 20,
  },
  personalBestsContainer: {
    backgroundColor: themeColors.surface,
    marginBottom: 10,
  },  personalBestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  personalBestText: {
    flex: 1,
    marginLeft: 15,
  },
  personalBestTitle: {
    fontSize: 16,
    color: themeColors.text,
    fontWeight: '500',
  },
  personalBestValue: {
    fontSize: 14,
    color: themeColors.primary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  achievementsContainer: {
    backgroundColor: themeColors.surface,
    marginBottom: 10,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  achievementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementIconContainerIncomplete: {
    backgroundColor: themeColors.surface,
  },
  achievementText: {
    flex: 1,
    marginLeft: 15,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text,
  },
  achievementDescription: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  recentActivityContainer: {
    backgroundColor: themeColors.surface,
    marginBottom: 20,
  },
  recentActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  recentActivityText: {
    flex: 1,
    marginLeft: 15,
  },  recentActivityType: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text,
  },
  recentActivityDetails: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  recentActivityDate: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 18,
    color: themeColors.textSecondary,
    marginTop: 15,
    fontWeight: '500',
  },
  noDataSubtext: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
});

export default StatsScreen;
