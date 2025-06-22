import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    RefreshControl,
    StatusBar as RNStatusBar,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HealthKitBadge from '../components/HealthKitBadge';
import { useAppContext } from '../context/AppContext';
import { useFitness } from '../context/FitnessContext';

const { width } = Dimensions.get('window');

const ActivitiesScreen = ({ navigation }) => {
  const { useMiles, formatDistance, isDarkMode, themeColors } = useAppContext();
  const { workouts, deleteWorkout } = useFitness();
  const styles = getStyles(themeColors, isDarkMode);
  const [filteredWorkouts, setFilteredWorkouts] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, running, walking, cycling
  const [sortBy, setSortBy] = useState('date'); // date, distance, duration
  const [refreshing, setRefreshing] = useState(false);

  // Update filtered workouts when workouts or filters change
  useEffect(() => {
    filterAndSortWorkouts();
  }, [workouts, selectedFilter, sortBy]);
  const filterAndSortWorkouts = () => {
    if (!workouts || !Array.isArray(workouts)) {
      setFilteredWorkouts([]);
      return;
    }

    let filtered = [...workouts];

    // Apply filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(workout => 
        workout && workout.type && workout.type.toLowerCase() === selectedFilter.toLowerCase()
      );
    }

    // Apply sort
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => {
          const dateA = a && a.date ? new Date(a.date) : new Date(0);
          const dateB = b && b.date ? new Date(b.date) : new Date(0);
          return dateB - dateA;
        });
        break;
      case 'distance':
        filtered.sort((a, b) => {
          const distA = safeNumber(a && a.distance ? a.distance : 0);
          const distB = safeNumber(b && b.distance ? b.distance : 0);
          return distB - distA;
        });
        break;
      case 'duration':
        filtered.sort((a, b) => {
          const durA = safeNumber(a && a.duration ? a.duration : 0);
          const durB = safeNumber(b && b.duration ? b.duration : 0);
          return durB - durA;
        });
        break;
      default:
        filtered.sort((a, b) => {
          const dateA = a && a.date ? new Date(a.date) : new Date(0);
          const dateB = b && b.date ? new Date(b.date) : new Date(0);
          return dateB - dateA;
        });
    }

    setFilteredWorkouts(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // The workouts will be automatically updated from FitnessContext
    setRefreshing(false);
  }, []);
  const handleFilterChange = (newFilter) => {
    setSelectedFilter(newFilter);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
  };
  const handleDeleteWorkout = async (workoutId) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Use FitnessContext deleteWorkout method
            deleteWorkout(workoutId);
          },
        },
      ]
    );
  };
  const formatTime = (milliseconds) => {
    if (!milliseconds || milliseconds === 0) return '0m';
    const totalSeconds = Math.floor((milliseconds || 0) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
        });
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'Running':
        return 'run';
      case 'Walking':
        return 'walk';
      case 'Cycling':
        return 'bike';
      default:
        return 'run';
    }
  };
  const getActivityColor = (type) => {
    switch (type) {
      case 'Running':
        return '#FF7043';
      case 'Walking':
        return '#4CAF50';
      case 'Cycling':
        return '#5C6BC0';
      default:
        return '#4893ff';
    }
  };

  // Helper functions to safely render values
  const safeText = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const safeNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const filterOptions = [
    { key: 'all', label: 'All', icon: 'view-grid' },
    { key: 'running', label: 'Running', icon: 'run' },
    { key: 'walking', label: 'Walking', icon: 'walk' },
    { key: 'cycling', label: 'Cycling', icon: 'bike' },
  ];

  const sortOptions = [
    { key: 'date', label: 'Date', icon: 'calendar' },
    { key: 'distance', label: 'Distance', icon: 'map-marker-path' },
    { key: 'duration', label: 'Duration', icon: 'clock-outline' },
  ];

  if (workouts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ScrollView 
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Activities</Text>
          </View>
          
          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons name="run" size={80} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Activities Yet</Text>
            <Text style={styles.emptyStateText}>
              Start your first workout to see your activity history here!
            </Text>
            <TouchableOpacity 
              style={styles.startWorkoutButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.startWorkoutButtonText}>Start a Workout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Activities</Text>
          <Text style={styles.headerSubtitle}>
            {safeText(filteredWorkouts.length)} workout{filteredWorkouts.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Filter Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterButton,
                selectedFilter === option.key && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange(option.key)}
            >
              <MaterialCommunityIcons 
                name={option.icon} 
                size={18} 
                color={selectedFilter === option.key ? 'white' : themeColors.textSecondary} 
              />
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === option.key && styles.filterButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <View style={styles.sortButtons}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortButton,
                  sortBy === option.key && styles.sortButtonActive,
                ]}
                onPress={() => handleSortChange(option.key)}
              >
                <MaterialCommunityIcons 
                  name={option.icon} 
                  size={16} 
                  color={sortBy === option.key ? themeColors.primary : themeColors.textSecondary} 
                />
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === option.key && styles.sortButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activities List */}
        <View style={styles.activitiesContainer}>
          {filteredWorkouts.map((workout, index) => (
            <TouchableOpacity 
              key={workout.id || index} 
              style={styles.workoutCard}
              onPress={() => {
                if (workout.route && workout.route.length > 0) {
                  // Navigate to route detail screen with workout data
                  navigation.navigate('RouteDetail', { workout });
                } else {
                  Alert.alert('No Route Data', 'This workout does not have GPS route data recorded.');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.workoutHeader}>
                <View style={styles.workoutTitleRow}>
                  <View style={[
                    styles.workoutIcon, 
                    { backgroundColor: getActivityColor(workout.type) }
                  ]}>
                    <MaterialCommunityIcons 
                      name={getActivityIcon(workout.type)} 
                      size={24} 
                      color="white" 
                    />
                    {workout.isFromHealthKit && (
                      <HealthKitBadge size="small" />
                    )}
                  </View>
                  <View style={styles.workoutTitleInfo}>
                    <Text style={styles.workoutType}>{safeText(workout.type)}</Text>
                    <Text style={styles.workoutDate}>
                      {safeText(formatDate(workout.date))}
                      {workout.isFromHealthKit && (
                        <Text style={styles.healthKitText}> • Fitness (iOS)</Text>
                      )}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDeleteWorkout(workout.id)}
                >
                  <MaterialCommunityIcons name="delete-outline" size={20} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.workoutStats}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="map-marker-path" size={16} color={themeColors.primary} />
                  <Text style={styles.statValue}>{formatDistance(safeNumber(workout.distance))}</Text>
                  <Text style={styles.statLabel}>{useMiles ? 'mi' : 'km'}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#FF7043" />
                  <Text style={styles.statValue}>{safeText(formatTime(workout.duration))}</Text>
                  <Text style={styles.statLabel}>time</Text>
                </View>
                
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="fire" size={16} color="#FF5722" />
                  <Text style={styles.statValue}>{safeText(Math.round(safeNumber(workout.calories)))}</Text>
                  <Text style={styles.statLabel}>cal</Text>
                </View>
                
                {workout.steps ? (
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="shoe-print" size={16} color="#5C6BC0" />
                    <Text style={styles.statValue}>{safeText(safeNumber(workout.steps).toLocaleString())}</Text>
                    <Text style={styles.statLabel}>steps</Text>
                    </View>
                ) : null}
              </View>

              {/* Additional workout details */}
              <View style={styles.workoutFooter}>
                <Text style={styles.workoutTime}>
                  {safeText((() => {
                    try {
                      if (!workout.date) return 'Unknown time';
                      const date = new Date(workout.date);
                      if (isNaN(date.getTime())) return 'Unknown time';
                      return date.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      });
                    } catch (error) {
                      return 'Unknown time';
                    }
                  })())}
                </Text>
                {workout.route && workout.route.length > 0 ? (
                  <View style={styles.routeIndicator}>
                    <MaterialCommunityIcons name="map" size={14} color={themeColors.primary} />
                    <Text style={styles.routeText}>Tap to view route</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={themeColors.primary} />
                  </View>
                ) : (
                  <View style={styles.noRouteIndicator}>
                    <MaterialCommunityIcons name="map-outline" size={14} color={themeColors.textSecondary} />
                    <Text style={styles.noRouteText}>No GPS data</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (themeColors, isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  emptyContainer: {
    flexGrow: 1,
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
  headerSubtitle: {
    fontSize: 16,
    color: themeColors.textSecondary,    marginTop: 5,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -50,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: themeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  startWorkoutButton: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  startWorkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  filterContainer: {
    paddingVertical: 15,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  filterContent: {    paddingHorizontal: 20,
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: themeColors.surface,
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: themeColors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    fontWeight: '500',
    marginLeft: 6,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: themeColors.surface,
  },
  sortLabel: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginRight: 15,
  },
  sortButtons: {
    flexDirection: 'row',
    flex: 1,
  },  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: themeColors.background,
    marginRight: 10,
  },  sortButtonActive: {
    backgroundColor: isDarkMode ? 'rgba(72, 147, 255, 0.2)' : '#e3f2fd',
  },sortButtonText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginLeft: 4,
  },
  sortButtonTextActive: {
    color: themeColors.primary,
    fontWeight: '500',
  },
  activitiesContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },  workoutCard: {
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  workoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutTitleInfo: {
    flex: 1,
  },  workoutType: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text,
  },
  workoutDate: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  workoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.text,
    marginTop: 4,
  },
  statLabel: {    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  workoutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },  workoutTime: {
    fontSize: 13,
    color: themeColors.textSecondary,
  },
  routeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(72, 147, 255, 0.2)' : '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  routeText: {
    fontSize: 12,
    color: themeColors.primary,
    marginLeft: 4,
    marginRight: 4,
    fontWeight: '500',
  },
  noRouteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  noRouteText: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 100,
  },
});

export default ActivitiesScreen;
