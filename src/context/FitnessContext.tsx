import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface Workout {
  id: string;
  type: string;
  date: string;
  duration: number; // in milliseconds
  distance: number; // in kilometers
  calories: number;
  steps?: number;
  route?: Array<{ latitude: number; longitude: number }>;
  elevationGain?: number;
}

interface WorkoutTypeStats {
  count: number;
  distance: number;
  calories: number;
  duration: number;
}

interface FitnessStats {
  totalWorkouts: number;
  totalDistance: number;
  totalCalories: number;
  totalDuration: number;
  workoutsByType: Record<string, WorkoutTypeStats>;
}

interface FitnessContextType {
  workouts: Workout[];
  loading: boolean;
  addWorkout: (workout: Omit<Workout, 'id' | 'date'>) => void;
  deleteWorkout: (id: string) => void;
  getStats: () => FitnessStats;
  getRecentWorkouts: (limit?: number) => Workout[];
  getWorkoutById: (id: string) => Workout | undefined;
  clearWorkouts: () => void;
}

const FitnessContext = createContext<FitnessContextType | undefined>(undefined);

export const useFitnessContext = () => {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error('useFitnessContext must be used within a FitnessProvider');
  }
  return context;
};

// Export alias for backward compatibility
export const useFitness = useFitnessContext;

export const FitnessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  // Load workouts from AsyncStorage on mount
  useEffect(() => {
    const loadWorkouts = async () => {
      try {
        const storedWorkouts = await AsyncStorage.getItem('workouts');
        if (storedWorkouts) {
          setWorkouts(JSON.parse(storedWorkouts));
        }
      } catch (error) {
        console.error('Error loading workouts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkouts();
  }, []);

  // Save workouts to AsyncStorage whenever they change
  useEffect(() => {
    if (!loading) {
      const saveWorkouts = async () => {
        try {
          await AsyncStorage.setItem('workouts', JSON.stringify(workouts));
        } catch (error) {
          console.error('Error saving workouts:', error);
        }
      };

      saveWorkouts();
    }
  }, [workouts, loading]);

  // Add a new workout
  const addWorkout = (workout: Omit<Workout, 'id' | 'date'>) => {
    const newWorkout: Workout = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...workout,
    };
    setWorkouts(prev => [...prev, newWorkout]);
  };

  // Delete a workout by ID
  const deleteWorkout = (id: string) => {
    setWorkouts(prev => prev.filter(workout => workout.id !== id));
  };

  // Get workout statistics
  const getStats = (): FitnessStats => {
    const initialStats: FitnessStats = {
      totalWorkouts: 0,
      totalDistance: 0,
      totalCalories: 0,
      totalDuration: 0,
      workoutsByType: {},
    };

    return workouts.reduce((stats, workout) => {
      stats.totalWorkouts += 1;
      stats.totalDistance += workout.distance || 0;
      stats.totalCalories += workout.calories || 0;
      stats.totalDuration += workout.duration || 0;

      // Initialize type stats if not exists
      if (!stats.workoutsByType[workout.type]) {
        stats.workoutsByType[workout.type] = {
          count: 0,
          distance: 0,
          calories: 0,
          duration: 0,
        };
      }

      // Update type-specific stats
      stats.workoutsByType[workout.type].count += 1;
      stats.workoutsByType[workout.type].distance += workout.distance || 0;
      stats.workoutsByType[workout.type].calories += workout.calories || 0;
      stats.workoutsByType[workout.type].duration += workout.duration || 0;

      return stats;
    }, initialStats);
  };

  // Get recent workouts (default: last 5)
  const getRecentWorkouts = (limit: number = 5): Workout[] => {
    return [...workouts]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  };

  // Get workout by ID
  const getWorkoutById = (id: string): Workout | undefined => {
    return workouts.find((workout) => workout.id === id);
  };

  // Clear all workouts
  const clearWorkouts = () => {
    setWorkouts([]);
  };

  const value: FitnessContextType = {
    workouts,
    loading,
    addWorkout,
    deleteWorkout,
    getStats,
    getRecentWorkouts,
    getWorkoutById,
    clearWorkouts,
  };

  return (
    <FitnessContext.Provider value={value}>
      {children}
    </FitnessContext.Provider>
  );
};
