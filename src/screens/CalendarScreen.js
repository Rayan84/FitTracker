import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';

const CalendarScreen = () => {
  const { themeColors } = useAppContext();
  const styles = getStyles(themeColors);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [workouts, setWorkouts] = useState([]);
  // Load workouts when component mounts
  useEffect(() => {
    loadWorkouts();
  }, []);

  // Reload workouts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

  // Reload workouts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [])
  );

  // Load all workouts from AsyncStorage
  const loadWorkouts = async () => {
    try {
      const savedWorkouts = await AsyncStorage.getItem('workouts');
      if (savedWorkouts) {
        const workoutData = JSON.parse(savedWorkouts);
        console.log('CalendarScreen: Loaded workouts:', workoutData.length, 'workouts');
        console.log('CalendarScreen: Sample workout:', workoutData[0]);
        setWorkouts(workoutData);
      } else {
        console.log('CalendarScreen: No workouts found in storage');
        setWorkouts([]);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  };

  // Function to get current month's days
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Function to get the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };
  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDayOfMonth = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days = [];
    
    // Add empty spaces for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayEmpty} />);
    }
    
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(selectedYear, selectedMonth, i);
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected = selectedDate.toDateString() === date.toDateString();
        // Check if there are workouts for this date
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const hasWorkouts = workouts.some(workout => {
        const workoutDate = new Date(workout.date);
        const workoutDateString = `${workoutDate.getFullYear()}-${String(workoutDate.getMonth() + 1).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(2, '0')}`;
        return workoutDateString === dateString;
      });
      
      days.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.dayContainer,
            isToday && styles.today,
            isSelected && styles.selected,
          ]}
          onPress={() => setSelectedDate(date)}
        >
          <Text style={[styles.dayText, isSelected && styles.selectedText]}>{i}</Text>
          
          {/* Real workout indicator */}
          {hasWorkouts && (
            <View style={styles.workoutIndicator} />
          )}
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  // Function to go to previous month
  const previousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  // Function to go to next month
  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Day names for display
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Get real workouts for the selected date
  const getWorkoutsForSelectedDate = () => {
    if (!workouts || workouts.length === 0) {
      console.log('CalendarScreen: No workouts available');
      return [];
    }

    // Convert selected date to string format for comparison (YYYY-MM-DD)
    const selectedDateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    console.log('CalendarScreen: Looking for workouts on', selectedDateString);
    
    // Filter workouts for the selected date
    const filteredWorkouts = workouts.filter(workout => {
      // Extract date portion from workout date
      const workoutDate = new Date(workout.date);
      const workoutDateString = `${workoutDate.getFullYear()}-${String(workoutDate.getMonth() + 1).padStart(2, '0')}-${String(workoutDate.getDate()).padStart(2, '0')}`;
      
      return workoutDateString === selectedDateString;
    }).map(workout => ({
      type: workout.type || 'Activity',
      duration: workout.duration ? `${Math.round(workout.duration / 60000)} min` : '--',
      distance: workout.distance ? `${workout.distance} km` : '--'
    }));
    
    console.log('CalendarScreen: Found', filteredWorkouts.length, 'workouts for selected date');
    return filteredWorkouts;
  };

  const workoutsForSelectedDate = getWorkoutsForSelectedDate();
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Calendar Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNavigation}>
        <TouchableOpacity onPress={previousMonth}>
          <MaterialCommunityIcons name="chevron-left" size={30} color="#4893ff" />
        </TouchableOpacity>
        <Text style={styles.monthYearText}>
          {`${monthNames[selectedMonth]} ${selectedYear}`}
        </Text>
        <TouchableOpacity onPress={nextMonth}>
          <MaterialCommunityIcons name="chevron-right" size={30} color="#4893ff" />
        </TouchableOpacity>
      </View>

      {/* Week Day Labels */}
      <View style={styles.weekDaysContainer}>
        {dayNames.map(day => (
          <Text key={day} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {generateCalendarDays()}
      </View>

      {/* Selected Date Info */}
      <View style={styles.selectedDateContainer}>
        <Text style={styles.selectedDateText}>
          {selectedDate.toDateString()}
        </Text>
      </View>

      {/* Workouts for Selected Date */}
      <ScrollView style={styles.workoutsContainer}>
        <Text style={styles.workoutsTitle}>
          {workoutsForSelectedDate.length > 0 
            ? 'Workouts' 
            : 'No workouts for this day'}
        </Text>
        
        {workoutsForSelectedDate.map((workout, index) => (
          <View key={index} style={styles.workoutCard}>
            <View style={[styles.workoutIcon, { 
              backgroundColor: workout.type === 'Running' 
                ? '#FF7043' 
                : workout.type === 'Cycling' 
                ? '#5C6BC0' 
                : '#4CAF50'
            }]}>
              <MaterialCommunityIcons 
                name={
                  workout.type === 'Running' 
                    ? 'run' 
                    : workout.type === 'Cycling' 
                    ? 'bike' 
                    : 'yoga'
                } 
                size={24} 
                color="#FFF" 
              />
            </View>
            <View style={styles.workoutDetails}>
              <Text style={styles.workoutType}>{workout.type}</Text>
              <Text style={styles.workoutInfo}>
                {workout.duration}
                {workout.distance ? ` • ${workout.distance}` : ''}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
    );
};

const getStyles = (themeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 44 + 20 : (RNStatusBar.currentHeight || 0) + 20,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: themeColors.surface,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.text,  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: themeColors.background,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  weekDayText: {
    width: 40,
    textAlign: 'center',
    fontWeight: '600',
    color: themeColors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    padding: 10,
    backgroundColor: themeColors.surface,
  },
  dayContainer: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  dayEmpty: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayText: {
    fontSize: 16,
    color: themeColors.text,
  },
  today: {
    backgroundColor: themeColors.primary + '20',
    borderRadius: 20,
  },  selected: {
    backgroundColor: themeColors.primary,
    borderRadius: 20,
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  workoutIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: themeColors.primary,
    marginTop: 4,
  },
  selectedDateContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text,
  },
  workoutsContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: themeColors.background,
  },
  workoutsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.text,
    marginBottom: 10,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.surface,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  workoutDetails: {
    flex: 1,
  },
  workoutType: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.text,
  },
  workoutInfo: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 5,
  },
});

export default CalendarScreen;
