import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Magnetometer, Pedometer } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Platform, StatusBar as RNStatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { useFitness } from '../context/FitnessContext';
import Map from './Map';

// Global error handler for debugging
const handleError = (context, error, details = {}) => {
  console.error(`[ActivityTracker Error - ${context}]`, {
    error: error.message || error,
    details,
    timestamp: new Date().toISOString()
  });
  
  // Check for specific error messages
  if (error.message && error.message.toLowerCase().includes('usable data')) {
    console.error('FOUND "usable data" error:', error.message);
    Alert.alert(
      'Data Error Detected',
      `Error in ${context}: ${error.message}\n\nDetails: ${JSON.stringify(details)}`,
      [{ text: 'OK' }]
    );
  }
};

const { width: screenWidth } = Dimensions.get('window');

const ActivityTrackerNew = ({ activityType, color, icon }) => {
  // Reduced logging to prevent spam
  const mountLoggedRef = useRef(false);
  if (!mountLoggedRef.current) {
    console.log('[COMPONENT] ActivityTrackerNew mounted with:', { activityType, color, icon });
    mountLoggedRef.current = true;
  }
  
  const { useMiles, convertDistance, formatDistance, convertSpeed, formatSpeed, isDarkMode, themeColors } = useAppContext();
  const { addWorkout } = useFitness();
  
  // State variables
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(0);  const [calories, setCalories] = useState(0);
  const [userWeight, setUserWeight] = useState(70); // Default weight in kgs
  const [elevationGain, setElevationGain] = useState(0);
  const [steps, setSteps] = useState(0);
  const [heading, setHeading] = useState(0);
  
  // Refs
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const lastLocationRef = useRef(null);  const magnetometerSubscription = useRef(null);
  const pedometerSubscription = useRef(null);
  const initialStepCount = useRef(null);
  const statsUpdateInterval = useRef(null); // For less frequent stats updates
  const accumulatedDistance = useRef(0); // Accumulate distance between updates
  const accumulatedElevation = useRef(0); // Accumulate elevation between updates
  const headingBuffer = useRef([]); // Buffer for heading smoothing
  const lastMapUpdate = useRef(0); // Last map update timestamp
  const lastMapHeading = useRef(0); // Last map heading
  const targetMapHeading = useRef(0); // Target heading for smooth rotation
  const smoothingAnimationRef = useRef(null); // Animation frame reference for smooth rotation
  // Cleanup on unmount
  useEffect(() => {
    console.log('[COMPONENT] useEffect running - initializing components');
    
    requestLocationPermissions();
    setupMagnetometer();
    setupPedometer();
    loadUserWeight(); // Load user's actual weight
    
    return () => {
      console.log('[COMPONENT] Cleaning up on unmount');
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
      }
      if (pedometerSubscription.current) {
        pedometerSubscription.current.remove();
      }
      if (statsUpdateInterval.current) {
        clearInterval(statsUpdateInterval.current);
      }
      const currentAnimationRef = smoothingAnimationRef.current;
      if (currentAnimationRef) {
        cancelAnimationFrame(currentAnimationRef);
      }
    };
  }, [setupMagnetometer]); // setupMagnetometer dependency to run only once on mount
  // Track isTracking state changes for debugging (reduced logging)
  useEffect(() => {
    // Only log significant state changes to reduce spam
    if (isTracking) {
      console.log('[STATE_TRACKING] ✅ Tracking is now ACTIVE');
    }
  }, [isTracking, isPaused]);  // Reload user weight and ensure magnetometer is working when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[FOCUS] Screen focused - checking magnetometer status');
      loadUserWeight();
      
      // Check if magnetometer subscription is still active, if not, restart it
      if (!magnetometerSubscription.current) {
        console.log('[FOCUS] Magnetometer subscription lost - restarting...');
        setupMagnetometer();
      } else {
        console.log('[FOCUS] Magnetometer subscription still active');
      }
      
      return () => {
        console.log('[FOCUS] Screen unfocused');
        // Don't clean up magnetometer on unfocus to prevent losing it
        // Only clean up on component unmount
      };
    }, [setupMagnetometer])
  );
  const requestLocationPermissions = async () => {
    try {
      console.log('[ActivityTracker] Requesting location permissions...');
      
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        const errorMsg = 'Location services are disabled';
        setErrorMsg(errorMsg);
        handleError('requestLocationPermissions', new Error(errorMsg));
        return;
      }

      let { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      console.log('[ActivityTracker] Foreground permission status:', foregroundStatus);
      
      if (foregroundStatus !== 'granted') {
        console.log('[ActivityTracker] Requesting foreground permissions...');
        const result = await Location.requestForegroundPermissionsAsync();
        foregroundStatus = result.status;
        console.log('[ActivityTracker] Permission result:', foregroundStatus);
      }
      
      if (foregroundStatus !== 'granted') {
        const errorMsg = 'Permission to access location was denied';
        setErrorMsg(errorMsg);
        handleError('requestLocationPermissions', new Error(errorMsg));
        return;
      }

      // Get current location
      console.log('[ActivityTracker] Getting current position...');
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      console.log('[ActivityTracker] Location obtained:', {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy
      });
      
      setLocation(currentLocation.coords);
    } catch (error) {
      handleError('requestLocationPermissions', error, {
        function: 'requestLocationPermissions',
        locationEnabled: 'unknown'
      });      setErrorMsg('Error getting location permissions');
    }};
  const setupMagnetometer = React.useCallback(async () => {
    try {
      console.log('[MAGNETOMETER] Starting setup...');
      const isAvailable = await Magnetometer.isAvailableAsync();
      console.log('[MAGNETOMETER] Available:', isAvailable);
      
      if (isAvailable) {        // Balanced update interval - responsive but not overwhelming
        Magnetometer.setUpdateInterval(500); // More frequent updates for better rotation responsiveness
        console.log('[MAGNETOMETER] Update interval set to 500ms');
        
        magnetometerSubscription.current = Magnetometer.addListener(({ x, y, z }) => {
          try {
            // Calculate angle from magnetometer data
            let angle = Math.atan2(y, x) * (180 / Math.PI);
            angle = angle < 0 ? angle + 360 : angle;
            let newHeading = 360 - angle;
            
            // Simple normalization to 0-360 range
            if (newHeading < 0) newHeading += 360;
            if (newHeading >= 360) newHeading -= 360;
              // Always update heading - remove tracking requirement for rotation
            const currentHeading = heading;
            const headingDiff = Math.abs(newHeading - currentHeading);
            const minDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;
            
            // Update if heading changed by more than 5 degrees (more sensitive for better rotation)
            if (minDiff > 5) {              // Show some logs to confirm it's working (use current location from state)
              if (Math.random() < 0.3) {
                console.log('[MAGNETOMETER] Heading change from', currentHeading.toFixed(1), 'to', newHeading.toFixed(1), 'diff:', minDiff.toFixed(1), 'hasLocation:', !!location, 'paused:', isPaused, 'hasMapRef:', !!mapRef.current);
              }
              setHeading(newHeading);
              
              // Allow map rotation whenever we have location and not paused (no tracking requirement)
              // Use current values from closure
              if (!isPaused && location && mapRef.current) {
                console.log('[MAP_ROTATION] Attempting rotation - location:', !!location, 'mapRef:', !!mapRef.current, 'paused:', isPaused);
                animateToHeading(newHeading);
              } else {
                // Enhanced debugging for why rotation isn't happening
                if (Math.random() < 0.1) {
                  console.log('[MAP_ROTATION] ❌ Not rotating - paused:', isPaused, 'hasLocation:', !!location, 'hasMapRef:', !!mapRef.current);
                }
              }
            }
          } catch (error) {
            console.error('[MAGNETOMETER] Error in listener:', error);
          }
        });
        
        console.log('[MAGNETOMETER] Listener setup complete');
      } else {
        console.warn('[MAGNETOMETER] Not available on this device');
      }
    } catch (error) {
      console.error('[MAGNETOMETER] Setup error:', error);
      console.error('[MAGNETOMETER] Error details:', error.message);
    }
  }, [heading, location, isPaused, animateToHeading]);

  const setupPedometer = async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (isAvailable) {
        console.log('Pedometer is available');
      } else {
        console.log('Pedometer is not available on this device');
      }
    } catch (error) {
      console.log('Pedometer setup error:', error);
    }
  };
  const startStepTracking = async () => {
    try {
      console.log('[ActivityTracker] Starting step tracking...');
      
      const isAvailable = await Pedometer.isAvailableAsync();
      console.log('[ActivityTracker] Pedometer available:', isAvailable);
      
      if (isAvailable) {
        const end = new Date();
        const start = new Date();
        start.setTime(end.getTime());
        
        console.log('[ActivityTracker] Getting initial step count...');
        const result = await Pedometer.getStepCountAsync(start, end);
        initialStepCount.current = result.steps;
        console.log('[ActivityTracker] Initial step count:', initialStepCount.current);
        
        pedometerSubscription.current = Pedometer.watchStepCount(result => {
          try {
            const currentSteps = result.steps - (initialStepCount.current || 0);
            setSteps(Math.max(0, currentSteps));
            console.log('[ActivityTracker] Step count updated:', currentSteps);
          } catch (error) {
            handleError('stepCountCallback', error, {
              resultSteps: result?.steps,
              initialSteps: initialStepCount.current
            });
          }
        });
        
        console.log('[ActivityTracker] Step tracking started successfully');
      } else {
        console.log('[ActivityTracker] Pedometer not available on this device');
      }
    } catch (error) {
      handleError('startStepTracking', error, {
        pedometerAvailable: 'unknown',
        activityType
      });
      // Don't throw error here as step tracking is optional
    }
  };

  const stopStepTracking = () => {
    if (pedometerSubscription.current) {
      pedometerSubscription.current.remove();
      pedometerSubscription.current = null;
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  const startLocationTracking = async () => {
    try {
      console.log('[ActivityTracker] Starting location tracking...');
      
      // Ensure we have location permission
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
          try {
            console.log('[ActivityTracker] New location received:', {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              accuracy: newLocation.coords.accuracy
            });
            
            const { latitude, longitude, altitude } = newLocation.coords;
            
            const newCoordinate = { latitude, longitude };
            setRouteCoordinates(prevCoords => [...prevCoords, newCoordinate]);
            
            if (lastLocationRef.current) {
              const newDistance = calculateDistance(
                lastLocationRef.current.latitude,
                lastLocationRef.current.longitude,
                latitude,
                longitude
              );
              
              // Accumulate data instead of immediately updating state
              accumulatedDistance.current += newDistance;
              
              if (altitude && lastLocationRef.current.altitude) {
                const elevationChange = altitude - lastLocationRef.current.altitude;
                if (elevationChange > 0) {
                  accumulatedElevation.current += elevationChange;
                }
              }
            }
            
            lastLocationRef.current = { latitude, longitude, altitude };
            
            // Update location less frequently for map to reduce flickering
            if (!location || 
                Math.abs(latitude - location.latitude) > 0.0005 || 
                Math.abs(longitude - location.longitude) > 0.0005) {
              setLocation({ latitude, longitude });
            }
          } catch (error) {
            handleError('locationCallback', error, {
              newLocation: newLocation?.coords
            });
          }
        }
      );
      
      console.log('[ActivityTracker] Location tracking started successfully');
    } catch (error) {
      handleError('startLocationTracking', error, {
        hasLocationPermission: 'unknown',
        activityType
      });
      throw error; // Re-throw to be caught by startWorkout
    }
  };
    const calculateCalories = (distanceKm, activityType, durationMinutes) => {
    // Use actual user weight or fallback to 70kg if not available
    const weight = userWeight > 0 ? userWeight : 70;
    let met; // Metabolic Equivalent of Task
    
    switch (activityType) {
      case 'Running':
        met = 8.0; // Running at moderate pace
        break;
      case 'Walking':
        met = 3.8; // Walking at moderate pace
        break;
      case 'Cycling':
        met = 7.5; // Cycling at moderate pace
        break;
      default:
        met = 5.0;
    }
    
    // Calculate calories based on distance (more accurate for actual movement)
    // Estimate: ~100 calories per km for running, scaled by MET and weight
    const caloriesPerKm = (met / 8.0) * 100 * (weight / 70); // Normalize to 70kg baseline
    const calories = distanceKm * caloriesPerKm;
    
    // Log for debugging (only log when distance changes to avoid spam)
    if (distanceKm > 0) {
      console.log(`ActivityTracker: Calories calculation - ${activityType}, Weight: ${weight}kg, Distance: ${distanceKm.toFixed(3)}km, Calories: ${calories.toFixed(1)}`);
    }
    
    return calories;
  };const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
      setDuration(elapsed);
      
      // Note: Calories will be calculated based on actual movement in location/step tracking
      // Not based on time alone to avoid counting calories when stationary
    }, 1000);
  };
  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      // Record pause start time
      const pauseStartTime = Date.now() - startTimeRef.current - pausedTimeRef.current;
      pausedTimeRef.current = pauseStartTime;
    }
  };
  const resumeTimer = () => {
    // Update start time to account for pause
    startTimeRef.current = Date.now() - pausedTimeRef.current;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setDuration(elapsed);
      
      // Note: Calories will be calculated based on actual movement in location/step tracking
      // Not based on time alone to avoid counting calories when stationary
    }, 1000);
  };
  const startStatsUpdater = () => {
    // Update stats every 2 seconds instead of on every location update
    statsUpdateInterval.current = setInterval(() => {
      if (accumulatedDistance.current > 0) {
        const distanceToAdd = accumulatedDistance.current;
        setDistance(prevDistance => {
          const newTotalDistance = prevDistance + distanceToAdd;
          // Calculate calories based on total distance moved
          const newCalories = calculateCalories(newTotalDistance, activityType, 0);
          setCalories(newCalories);
          return newTotalDistance;
        });
        accumulatedDistance.current = 0;
      }
      
      if (accumulatedElevation.current > 0) {
        setElevationGain(prevElevation => prevElevation + accumulatedElevation.current);
        accumulatedElevation.current = 0;
      }
    }, 2000); // Update every 2 seconds
  };

  const stopStatsUpdater = () => {
    if (statsUpdateInterval.current) {
      clearInterval(statsUpdateInterval.current);
      statsUpdateInterval.current = null;    }
  };
  const startWorkout = async () => {
    try {
      console.log('[ActivityTracker] Starting workout...');
      
      // Ensure we have location permissions and current location
      let currentLocation = location;
      if (!currentLocation) {
        console.log('[ActivityTracker] No location available, requesting permissions...');
        try {
          // Get fresh location data
          const isLocationEnabled = await Location.hasServicesEnabledAsync();
          if (!isLocationEnabled) {
            throw new Error('Location services are disabled. Please enable location services.');
          }

          let { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') {
            const result = await Location.requestForegroundPermissionsAsync();
            status = result.status;
          }
          
          if (status !== 'granted') {
            throw new Error('Location permission denied. Please grant location permissions.');
          }

          const locationData = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          currentLocation = locationData.coords;
          setLocation(currentLocation);
          console.log('[ActivityTracker] Fresh location obtained:', currentLocation);        } catch (_error) {
          throw new Error('Unable to obtain location. Please enable location services and grant permissions.');
        }
      }
      
      console.log('[ActivityTracker] Setting tracking state...');
      setIsTracking(true);
      setIsPaused(false);
      console.log('[ActivityTracker] Tracking state set to true');
      
      // Reset all tracking variables
      console.log('[ActivityTracker] Resetting tracking variables...');
      setDistance(0);
      setDuration(0);
      setSpeed(0);
      setCalories(0);
      setSteps(0);
      setRouteCoordinates([]);
      accumulatedDistance.current = 0;
      accumulatedElevation.current = 0;
      initialStepCount.current = null;
      pausedTimeRef.current = 0;
      
      console.log('[ActivityTracker] Resetting magnetometer tracking...');
      headingBuffer.current = [];
      lastMapUpdate.current = 0;
      lastMapHeading.current = 0;
      targetMapHeading.current = 0;
      console.log('[ActivityTracker] Magnetometer tracking reset');
      
      console.log('[ActivityTracker] Starting timer and stats updater...');
      startTimer();
      startStatsUpdater();
      console.log('[ActivityTracker] Timer and stats updater started');
      
      console.log('[ActivityTracker] Starting location tracking...');
      await startLocationTracking();
      console.log('[ActivityTracker] Location tracking started');
      
      console.log('[ActivityTracker] Starting step tracking...');
      await startStepTracking();
      console.log('[ActivityTracker] Step tracking started');
      
      console.log('[ActivityTracker] Workout started successfully!');
    } catch (error) {
      handleError('startWorkout', error, {
        hasLocation: !!location,
        activityType,
        trackingState: isTracking
      });
      
      // Reset states if there was an error
      setIsTracking(false);
      setIsPaused(false);
      
      Alert.alert(
        'Failed to Start Workout',
        `Unable to start ${activityType} tracking: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const pauseWorkout = () => {
    setIsPaused(true);
    pauseTimer();
    stopStatsUpdater();
    if (locationSubscription.current) {
      locationSubscription.current.remove();    }
  };

  const resumeWorkout = async () => {
    setIsPaused(false);
    resumeTimer();
    startStatsUpdater();
    await startLocationTracking();
  };

  const stopWorkout = async () => {
    setIsTracking(false);
    setIsPaused(false);
    
    pauseTimer();
    stopStatsUpdater();
    stopStepTracking();
    
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
          // Apply any remaining accumulated stats before saving
    if (accumulatedDistance.current > 0) {
      setDistance(prevDistance => {
        const newTotalDistance = prevDistance + accumulatedDistance.current;
        // Final calorie calculation based on total distance
        const finalCalories = calculateCalories(newTotalDistance, activityType, 0);
        setCalories(finalCalories);
        return newTotalDistance;
      });
      accumulatedDistance.current = 0;
    }
    if (accumulatedElevation.current > 0) {
      setElevationGain(prevElevation => prevElevation + accumulatedElevation.current);
      accumulatedElevation.current = 0;
    }
      // Save workout data using FitnessContext
    const workoutData = {
      type: activityType,
      duration: duration,
      distance: typeof distance === 'number' && !isNaN(distance) ? distance : 0,
      calories: Math.round(calories),
      steps: steps,
      route: routeCoordinates,
      elevationGain: elevationGain
    };
    
    try {
      console.log('[ActivityTracker] Saving workout data:', workoutData);
      
      // Validate workout data
      if (!workoutData.type) {
        throw new Error('Invalid workout data: missing activity type');
      }
      
      // Use FitnessContext to add the workout
      addWorkout(workoutData);
      
      console.log('[ActivityTracker] Workout saved successfully');
      Alert.alert('Workout Saved', 'Your workout has been saved successfully!');
    } catch (error) {
      handleError('saveWorkout', error, {
        workoutData,
        activityType
      });
      
      Alert.alert(
        'Save Error',
        `Failed to save workout: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
    
    resetWorkout();
  };
  const resetWorkout = () => {
    setRouteCoordinates([]);
    setDistance(0);
    setDuration(0);
    setSpeed(0);
    setCalories(0);
    setElevationGain(0);
    setSteps(0);
    pausedTimeRef.current = 0;
      // Reset accumulated values
    accumulatedDistance.current = 0;
    accumulatedElevation.current = 0;
  };
  const loadUserWeight = async () => {
    try {
      console.log('[ActivityTracker] Loading user weight...');
      
      const savedProfile = await AsyncStorage.getItem('userProfile');
      if (savedProfile) {
        const profileData = JSON.parse(savedProfile);
        const weight = parseFloat(profileData.weight);
        if (!isNaN(weight) && weight > 0) {
          setUserWeight(weight);
          console.log(`[ActivityTracker] Loaded user weight: ${weight}kg`);
        } else {
          console.log('[ActivityTracker] Invalid weight data, using default weight of 70kg');
        }
      } else {
        console.log('[ActivityTracker] No profile found, using default weight of 70kg');
      }} catch (error) {
      handleError('loadUserWeight', error, {
        attemptedLoadProfile: true
      });
      // Keep default weight of 70kg
      console.log('[ActivityTracker] Error loading weight, using default of 70kg');
    }
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor((milliseconds || 0) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const getSpeedLabel = () => {
    return 'Avg Speed';
  };
  const getSpeedValue = () => {
    // Calculate average speed only when there's distance and duration
    if (distance > 0 && duration > 0) {
      const avgSpeed = (distance / (duration / 3600000)); // km/h
      const convertedSpeed = convertSpeed(avgSpeed);
      const safeSpeed = typeof convertedSpeed === 'number' && !isNaN(convertedSpeed) ? convertedSpeed : 0;
      const unit = useMiles ? 'mph' : 'km/h';
      return `${safeSpeed.toFixed(1)} ${unit}`;
    }
    const unit = useMiles ? 'mph' : 'km/h';
    return `0.0 ${unit}`;
  };
  const safeNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };
  const safeText = (value) => {
    return value ? value.toString() : '0';  };  // Function to animate map to new heading with balanced throttling
  const animateToHeading = React.useCallback((newHeading) => {
    if (!mapRef.current || !location) {
      console.log('[MAP_ROTATION] Skipping - no map ref or location:', { hasMapRef: !!mapRef.current, hasLocation: !!location });
      return; // Don't update map if no map ref or location
    }
    
    try {
      const now = Date.now();
      
      // Throttle map updates to prevent excessive calls but still be responsive
      if (now - lastMapUpdate.current < 300) { // Reduced throttle for more responsiveness
        return;
      }
      
      // Only update if heading has changed significantly (reduce jitter)
      const headingDiff = Math.abs(newHeading - lastMapHeading.current);
      const minDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;
      
      if (minDiff > 5) { // Reduced threshold for more responsive rotation
        // Add some logging to confirm map rotation is happening
        if (Math.random() < 0.4) {
          console.log('[MAP_ROTATION] ✅ Rotating map from', lastMapHeading.current.toFixed(1), 'to', newHeading.toFixed(1));
        }
        lastMapHeading.current = newHeading;
        lastMapUpdate.current = now;
          const cameraConfig = {
          center: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          heading: newHeading,
          pitch: 0,
          zoom: 17,
        };
        
        console.log('[MAP_ROTATION] Animating camera with config:', {
          lat: location.latitude,
          lng: location.longitude,
          heading: newHeading,
          zoom: 17
        });
        
        mapRef.current.animateCamera(cameraConfig, { duration: 400 }); // Faster animation
      }
    } catch (error) {
      console.error('[MAP_ROTATION] Error animating map heading:', error);
    }
  }, [location]);

  // Periodic magnetometer health check to ensure it stays active
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      // Only run health check if we have location (screen is being actively used)
      if (location && !magnetometerSubscription.current) {
        console.log('[MAGNETOMETER_HEALTH] Subscription lost - restarting magnetometer...');
        setupMagnetometer();
      }
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [location, setupMagnetometer]);

  // Restart magnetometer when location becomes available to fix closure issue
  useEffect(() => {
    if (location && magnetometerSubscription.current) {
      console.log('[MAGNETOMETER_LOCATION] Location available - restarting magnetometer to update closure');
      // Clean up existing subscription
      magnetometerSubscription.current.remove();
      magnetometerSubscription.current = null;
      // Restart with new location in closure
      setupMagnetometer();
    }
  }, [location, setupMagnetometer]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      {/* Show error message if present */}
      {errorMsg ? (
        <View style={{ backgroundColor: '#ffcccc', padding: 10, margin: 10, borderRadius: 8 }}>
          <Text style={{ color: '#b00020', textAlign: 'center' }}>{errorMsg}</Text>
        </View>
      ) : null}
      {/* Header - clean without icon/title */}
      <View style={[styles.header, { backgroundColor: color }]}> 
        <View style={styles.headerContent}> 
          {/* Icon and activity name removed for cleaner look */}
        </View>
      </View>
        {/* Map Container */}
      <View style={styles.mapContainer}>
            {Platform.OS !== 'web' && location ? (
          <View style={styles.mapWrapper}>
            <Map
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            region={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            mapType="standard"
            showsUserLocation={true}
            followsUserLocation={isTracking && !isPaused}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            rotateEnabled={true}
            compassOffset={{x: -5, y: 70}}
            showsCompass={true}
            moveOnMarkerPress={false}
            loadingEnabled={true}
            onMapReady={() => {
              console.log('[MAP] Map is ready for rotation');
            }}            onRegionChange={(region) => {
              // Log only occasionally to reduce spam
              if (Math.random() < 0.1) { // Log only 10% of region changes
                console.log('[MAP] Region changed:', {
                  lat: region.latitude.toFixed(6),
                  lng: region.longitude.toFixed(6),
                  heading: region.heading?.toFixed(1) || 'undefined'
                });
              }
            }}
            onPress={() => {
              console.log('[MAP] Map pressed');
            }}
          >
            {routeCoordinates.length > 1 && (
              <Map.Polyline
                coordinates={routeCoordinates}
                strokeColor={color}
                strokeWidth={4}
                lineDashPattern={[]}
              />
            )}
          </Map>
          
          {/* Compass Indicator Overlay */}
          <View style={styles.compassOverlay}>
            <View style={[styles.compassNeedle, { transform: [{ rotate: `${heading}deg` }] }]}>
              <MaterialCommunityIcons name="navigation" size={24} color="#FF4444" />
            </View>
          </View>
        </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map-outline" size={60} color="#ccc" />
            <Text style={styles.mapPlaceholderText}>
              {Platform.OS === 'web' 
                ? 'Map view available on mobile' 
                : 'Getting your location...'}
            </Text>
          </View>
        )}
      </View>

      {/* Stats Container */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatTime(duration)}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
            <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDistance(safeNumber(distance))}</Text>
            <Text style={styles.statLabel}>{useMiles ? 'mi' : 'km'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{getSpeedValue()}</Text>
            <Text style={styles.statLabel}>{getSpeedLabel()}</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{safeText(Math.round(safeNumber(calories)))}</Text>
            <Text style={styles.statLabel}>cal</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{safeText(Math.round(safeNumber(elevationGain)))}</Text>
            <Text style={styles.statLabel}>m elev</Text>
          </View>
                    <View style={styles.statItem}>
            <Text style={styles.statValue}>{safeText(safeNumber(steps))}</Text>
            <Text style={styles.statLabel}>steps</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(heading)}°</Text>
            <Text style={styles.statLabel}>compass</Text>
          </View>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {!isTracking ? (
          <TouchableOpacity
            style={[styles.controlButton, styles.startButton, { backgroundColor: color }]}
            onPress={async () => {
              console.log('Start button pressed!');
              if (!isTracking) {
                await startWorkout();
              }
            }}
            disabled={isTracking}
          >
            <MaterialCommunityIcons name="play" size={40} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.trackingControls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.pauseButton]}
              onPress={isPaused ? resumeWorkout : pauseWorkout}
            >
              <MaterialCommunityIcons 
                name={isPaused ? "play" : "pause"} 
                size={30} 
                color="#FFF" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopWorkout}
            >
              <MaterialCommunityIcons name="stop" size={30} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : (RNStatusBar.currentHeight || 0),
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },  mapContainer: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  compassOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassNeedle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapPlaceholderText: {
    marginTop: 10,
    color: '#999',
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabel: {    fontSize: 12,
    color: '#CCC',
    marginTop: 5,
  },
  controlsContainer: {
    padding: 20,
    paddingBottom: 40, // Reduced since SafeAreaView handles most of the spacing
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    }),
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  trackingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: screenWidth * 0.6,
  },
  pauseButton: {
    backgroundColor: '#FF9800',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  stopButton: {
    backgroundColor: '#F44336',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
});

export default ActivityTrackerNew;
