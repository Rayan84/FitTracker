import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Platform, Alert, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Magnetometer, Pedometer } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Map from './Map';
import { useAppContext } from '../context/AppContext';

const { width: screenWidth } = Dimensions.get('window');

const ActivityTracker = ({ activityType, color, icon }) => {
  const { useMiles, convertDistance, formatDistance, convertSpeed, formatSpeed, isDarkMode, themeColors } = useAppContext();
  
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [calories, setCalories] = useState(0);
  const [pace, setPace] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [steps, setSteps] = useState(0);  const [heading, setHeading] = useState(0);
  const [mapHeading, setMapHeading] = useState(0); // Separate state for smooth map rotation
  const [mapReady, setMapReady] = useState(false);
  
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedTimeRef = useRef(0);
  const lastLocationRef = useRef(null);  const magnetometerSubscription = useRef(null);
  const pedometerSubscription = useRef(null);
  const initialStepCount = useRef(null);
    // Cleanup on unmount
  useEffect(() => {
    requestLocationPermissions();
    setupMagnetometer();
    setupPedometer();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);      }
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
      }
      if (pedometerSubscription.current) {
        pedometerSubscription.current.remove();      }
    };
  }, []);
  // Ensure magnetometer is active when tracking starts
  useEffect(() => {
    if (isTracking && !magnetometerSubscription.current) {
      setupMagnetometer();
    }
  }, [isTracking]);  // Debug: Log camera changes and implement more reliable rotation
  useEffect(() => {
    if (location && mapRef.current && mapReady && Platform.OS !== 'web') {
      console.log('Attempting map rotation - mapHeading:', mapHeading);
        const rotateMap = () => {
        try {
          console.log('Map ref available:', !!mapRef.current);
          console.log('Map methods available:', mapRef.current ? Object.keys(mapRef.current) : 'no ref');
          
          if (mapRef.current && mapRef.current.animateCamera) {
            // Use animateCamera for rotation
            mapRef.current.animateCamera({
              center: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              pitch: 0,
              heading: mapHeading,
              altitude: 1000,
              zoom: 16,
            }, { duration: 500 });
            
            console.log('Map rotation command sent for heading:', mapHeading);
          } else {
            console.log('animateCamera method not available on map ref');
          }
        } catch (error) {
          console.error('Error rotating map:', error);
        }
      };
      
      // Add a small delay to ensure map is ready
      const timeoutId = setTimeout(rotateMap, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [mapHeading, mapReady, location]);
  const requestLocationPermissions = async () => {
    try {
      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        setErrorMsg('Location services are disabled');
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use tracking features.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request foreground permissions
      let { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        const result = await Location.requestForegroundPermissionsAsync();
        foregroundStatus = result.status;
      }
      
      if (foregroundStatus !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        Alert.alert(
          'Permission Required', 
          'FitTracker needs location access to track your workouts. Please go to Settings > Privacy & Security > Location Services and enable location for FitTracker.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Try to request background permissions (optional)
      try {
        let { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          const result = await Location.requestBackgroundPermissionsAsync();
          backgroundStatus = result.status;
        }
        
        if (backgroundStatus !== 'granted') {
          Alert.alert(
            'Background Location',
            'For continuous tracking during workouts, consider allowing "Always" location access in Settings.',
            [{ text: 'OK' }]
          );
        }
      } catch (backgroundError) {
        console.log('Background permission not available:', backgroundError);
        // Background permissions might not be available on all platforms
      }

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
        maximumAge: 60000,
      });
      
      setLocation(initialLocation.coords);
      lastLocationRef.current = initialLocation.coords;
      setErrorMsg(null);
      
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      let errorMessage = 'Failed to get location permissions';
      
      if (error.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
        errorMessage = 'Location settings are not satisfied. Please check your device location settings.';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage = 'Location is temporarily unavailable. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrorMsg(errorMessage);
      Alert.alert(
        'Location Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };  const setupMagnetometer = async () => {
    try {
      console.log('Setting up magnetometer...');
      
      // Remove any existing subscriptions first
      if (magnetometerSubscription.current) {
        magnetometerSubscription.current.remove();
        magnetometerSubscription.current = null;
      }
      
      // Check if magnetometer is available
      const isAvailable = await Magnetometer.isAvailableAsync();
      console.log('Magnetometer availability:', isAvailable);
      
      if (isAvailable) {
        // Simplified approach for testing
        Magnetometer.setUpdateInterval(500); // Slower updates for stability
        
        magnetometerSubscription.current = Magnetometer.addListener(({ x, y, z }) => {
          let angle = Math.atan2(y, x) * (180 / Math.PI);
          angle = angle < 0 ? angle + 360 : angle;
          let newHeading = 360 - angle;
          
          // Normalize to 0-360
          if (newHeading < 0) newHeading += 360;
          if (newHeading >= 360) newHeading -= 360;
          
          console.log('Magnetometer heading:', Math.round(newHeading));
          setHeading(newHeading);
          setMapHeading(newHeading);
        });
        
        console.log('Magnetometer setup successful');
      } else {
        console.log('Magnetometer not available, rotation disabled');
        setHeading(0);
        setMapHeading(0);
      }
    } catch (error) {
      console.error('Magnetometer setup error:', error);
      setHeading(0);
      setMapHeading(0);
    }
  };

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
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
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
            
            setDistance(prevDistance => prevDistance + newDistance);
            
            if (altitude && lastLocationRef.current.altitude) {
              const elevationDiff = altitude - lastLocationRef.current.altitude;
              if (elevationDiff > 0) {
                setElevationGain(prev => prev + elevationDiff);
              }
            }
          }
          
          setLocation(newLocation.coords);
          lastLocationRef.current = newLocation.coords;
          
          if (newLocation.coords.speed) {
            setSpeed(Math.max(0, newLocation.coords.speed * 3.6));
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };
  const startStepTracking = async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (isAvailable) {
        // Get current step count to use as baseline
        const start = new Date();
        start.setHours(0, 0, 0, 0); // Start from beginning of day
        
        try {
          const stepCountResult = await Pedometer.getStepCountAsync(start, new Date());
          initialStepCount.current = stepCountResult.steps;
        } catch (error) {
          console.log('Could not get initial step count, starting from 0');
          initialStepCount.current = 0;
        }
        
        pedometerSubscription.current = Pedometer.watchStepCount((result) => {
          // For live tracking, we just use the steps since we started
          setSteps(result.steps);
        });
        
        console.log('Step tracking started');
      } else {
        console.log('Pedometer not available on this device');
      }
    } catch (error) {
      console.error('Error starting step tracking:', error);
    }
  };

  const stopStepTracking = () => {
    if (pedometerSubscription.current) {
      pedometerSubscription.current.remove();
      pedometerSubscription.current = null;
    }
  };

  const startTimer = () => {
    startTimeRef.current = Date.now() - pausedTimeRef.current;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setDuration(elapsed);
      
      if (distance > 0) {
        const paceValue = (elapsed / 60000) / distance;
        setPace(paceValue);
      }
      
      // Activity-specific calorie calculation
      const weight = 70; // Should come from user profile
      let calorieMultiplier = 0.75; // Default for running
      
      switch (activityType) {
        case 'Running':
          calorieMultiplier = 0.75;
          break;
        case 'Cycling':
          calorieMultiplier = 0.5;
          break;
        case 'Walking':
          calorieMultiplier = 0.4;
          break;
        default:
          calorieMultiplier = 0.6;
      }
      
      setCalories(distance * weight * calorieMultiplier);
      
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      pausedTimeRef.current = Date.now() - startTimeRef.current;
    }
  };

  const startWorkout = async () => {
    if (!location) {
      Alert.alert('Error', 'Please wait for GPS to get your location');
      return;
    }
    
    setIsTracking(true);
    setIsPaused(false);
    setRouteCoordinates([{ latitude: location.latitude, longitude: location.longitude }]);
    
    await startLocationTracking();
    startStepTracking();
    startTimer();
  };

  const pauseWorkout = () => {
    setIsPaused(true);
    pauseTimer();
    stopLocationTracking();
    stopStepTracking();
  };

  const resumeWorkout = async () => {
    setIsPaused(false);
    await startLocationTracking();
    startStepTracking();
    startTimer();
  };

  const stopWorkout = () => {
    Alert.alert(
      'Stop Workout',
      'Are you sure you want to stop this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Stop', 
          style: 'destructive',
          onPress: () => {
            setIsTracking(false);
            setIsPaused(false);
            stopLocationTracking();
            stopStepTracking();
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            
            saveWorkout();
            resetWorkout();
          }
        }
      ]
    );
  };

  const saveWorkout = async () => {
    try {      const workoutData = {
        id: Date.now().toString(),
        type: activityType,
        date: new Date().toISOString(),
        duration,
        distance,
        calories,
        pace,
        speed,
        elevationGain,
        steps,
        routeCoordinates,
      };
      
      const existingWorkouts = await AsyncStorage.getItem('savedWorkouts');
      const workouts = existingWorkouts ? JSON.parse(existingWorkouts) : [];
      
      workouts.push(workoutData);
      
      await AsyncStorage.setItem('savedWorkouts', JSON.stringify(workouts));
      
      Alert.alert('Success', 'Workout saved successfully!');
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  const resetWorkout = () => {
    setRouteCoordinates([]);
    setDistance(0);
    setDuration(0);
    setSpeed(0);
    setCalories(0);
    setPace(0);
    setElevationGain(0);
    setSteps(0);
    pausedTimeRef.current = 0;
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPace = (pace) => {
    if (pace === 0 || !isFinite(pace)) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.floor((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  const getSpeedLabel = () => {
    switch (activityType) {
      case 'Cycling':
        return useMiles ? 'mph' : 'km/h';
      case 'Running':
      case 'Walking':
        return 'pace';
      default:
        return useMiles ? 'mph' : 'km/h';
    }
  };
  const getSpeedValue = () => {
    if (activityType === 'Cycling') {
      const convertedSpeed = convertSpeed(speed);
      const safeSpeed = typeof convertedSpeed === 'number' && !isNaN(convertedSpeed) ? convertedSpeed : 0;
      return safeSpeed.toFixed(1);
    } else {
      return formatPace(pace || 0);
    }
  };

  // Helper function to calculate smooth heading with wrap-around handling
  const calculateSmoothHeading = (headings) => {
    if (headings.length === 0) return 0;
    if (headings.length === 1) return headings[0];
    
    // Convert to radians for calculation
    let x = 0, y = 0;
    headings.forEach(heading => {
      const rad = heading * Math.PI / 180;
      x += Math.cos(rad);
      y += Math.sin(rad);
    });
    
    // Average and convert back to degrees
    const avgRad = Math.atan2(y / headings.length, x / headings.length);
    let avgDeg = avgRad * 180 / Math.PI;
    if (avgDeg < 0) avgDeg += 360;
    
    return avgDeg;
  };

  // Helper function to get shortest angle difference (handles 360/0 wrap)
  const getShortestAngleDifference = (target, current) => {
    let diff = target - current;
    
    // Handle wrap-around cases
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    return diff;
  };
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={[styles.header, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={24} color="#FFF" />
        <Text style={styles.headerTitle}>{activityType}</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Map Container */}
      <View style={styles.mapContainer}>
        {Platform.OS !== 'web' && location ? (
          <Map
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            initialCamera={{
              center: {
                latitude: location.latitude,
                longitude: location.longitude,
              },
              pitch: 0,
              heading: 0,
              altitude: 1000,
              zoom: 16,
            }}
            showsUserLocation={true}
            followsUserLocation={false}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            rotateEnabled={true}
            scrollEnabled={true}
            zoomEnabled={true}
            pitchEnabled={true}
            compassOffset={{x: -5, y: 70}}
            showsCompass={true}
            mapType="standard"
            userLocationAnnotationTitle=""
            loadingEnabled={true}
            loadingIndicatorColor={color}
            moveOnMarkerPress={false}
            onMapReady={() => {
              console.log('Map is ready for operations');
              setMapReady(true);
              
              // Try initial rotation test when map is ready
              if (mapRef.current && location) {
                setTimeout(() => {
                  console.log('Testing initial map rotation...');
                  mapRef.current.animateCamera({
                    center: {
                      latitude: location.latitude,
                      longitude: location.longitude,
                    },
                    pitch: 0,
                    heading: 45, // Test with a fixed heading first
                    altitude: 1000,
                    zoom: 16,
                  }, { duration: 2000 });
                }, 1000);
              }
            }}
            onRegionChangeComplete={(region) => {
              console.log('Region changed:', region);
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
            <Text style={styles.statValue}>{formatTime(duration || 0)}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDistance(distance || 0)}</Text>
            <Text style={styles.statLabel}>{useMiles ? 'mi' : 'km'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{getSpeedValue()}</Text>
            <Text style={styles.statLabel}>{getSpeedLabel()}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(calories || 0)}</Text>
            <Text style={styles.statLabel}>cal</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(elevationGain || 0)}</Text>
            <Text style={styles.statLabel}>m elev</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(heading || 0)}°</Text>
            <Text style={styles.statLabel}>heading</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{steps || 0}</Text>
            <Text style={styles.statLabel}>steps</Text>
          </View>
        </View>
      </View>
      
      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {!isTracking ? (
          <View style={styles.trackingControls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.startButton, { backgroundColor: color }]}
              onPress={startWorkout}
            >
              <MaterialCommunityIcons name="play" size={40} color="#FFF" />
            </TouchableOpacity>
            {/* Test rotation button */}
            <TouchableOpacity
              style={[styles.controlButton, styles.pauseButton]}
              onPress={() => {
                const newHeading = (mapHeading + 45) % 360;
                console.log('Manual rotation test - old:', mapHeading, 'new:', newHeading);
                setHeading(newHeading);
                setMapHeading(newHeading);
              }}
            >
              <MaterialCommunityIcons name="rotate-3d-variant" size={30} color="#FFF" />
            </TouchableOpacity>
          </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
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
  statLabel: {
    fontSize: 12,
    color: '#CCC',
    marginTop: 5,
  },
  controlsContainer: {
    padding: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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

export default ActivityTracker;
