import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    Platform,
    StatusBar as RNStatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Map from '../components/Map';
import { useAppContext } from '../context/AppContext';

const RouteDetailScreen = ({ route, navigation }) => {
  const { workout } = route.params;
  const { isDarkMode, themeColors } = useAppContext();
  const styles = getStyles(themeColors);

  // Calculate map region from route coordinates
  const getMapRegion = () => {
    if (!workout.route || workout.route.length === 0) {
      return {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    const coordinates = workout.route;
    const latitudes = coordinates.map(coord => coord.latitude);
    const longitudes = coordinates.map(coord => coord.longitude);

    const maxLat = Math.max(...latitudes);
    const minLat = Math.min(...latitudes);
    const maxLng = Math.max(...longitudes);
    const minLng = Math.min(...longitudes);

    const centerLat = (maxLat + minLat) / 2;
    const centerLng = (maxLng + minLng) / 2;
    const deltaLat = (maxLat - minLat) * 1.2; // Add 20% padding
    const deltaLng = (maxLng - minLng) * 1.2;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(deltaLat, 0.005), // Minimum zoom level
      longitudeDelta: Math.max(deltaLng, 0.005),
    };
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'Running': return '#FF6B6B';
      case 'Walking': return '#4ECDC4';
      case 'Cycling': return '#45B7D1';
      default: return '#4893ff';
    }
  };

  const formatTime = (milliseconds) => {
    if (!milliseconds || milliseconds === 0) return '0m';
    const totalSeconds = Math.floor((milliseconds || 0) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Workout Info */}
      <View style={styles.workoutInfo}>
        <View style={styles.workoutHeader}>
          <View style={[styles.workoutIcon, { backgroundColor: getActivityColor(workout.type) }]}>
            <MaterialCommunityIcons 
              name={workout.type === 'Running' ? 'run' : workout.type === 'Walking' ? 'walk' : 'bike'} 
              size={24} 
              color="white" 
            />
          </View>
          <View style={styles.workoutDetails}>
            <Text style={styles.workoutType}>{workout.type}</Text>
            <Text style={styles.workoutDate}>{formatDate(workout.date)}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{parseFloat(workout.distance || 0).toFixed(2)}</Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatTime(workout.duration)}</Text>
            <Text style={styles.statLabel}>time</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(workout.calories || 0)}</Text>
            <Text style={styles.statLabel}>calories</Text>
          </View>
          {workout.steps && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{parseInt(workout.steps || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>steps</Text>
            </View>
          )}
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {Platform.OS !== 'web' && workout.route && workout.route.length > 0 ? (
          <Map
            style={styles.map}
            initialRegion={getMapRegion()}
            mapType="standard"
            showsUserLocation={false}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            rotateEnabled={true}
            scrollEnabled={true}
            zoomEnabled={true}
            pitchEnabled={true}
          >
            <Map.Polyline
              coordinates={workout.route}
              strokeColor={getActivityColor(workout.type)}
              strokeWidth={4}
              lineDashPattern={[]}
            />
            {/* Start marker */}
            {workout.route.length > 0 && (
              <Map.Marker
                coordinate={workout.route[0]}
                title="Start"
                pinColor="green"
              />
            )}
            {/* End marker */}
            {workout.route.length > 1 && (
              <Map.Marker
                coordinate={workout.route[workout.route.length - 1]}
                title="Finish"
                pinColor="red"
              />
            )}
          </Map>
          ) : (
          <View style={styles.mapPlaceholder}>
            <MaterialCommunityIcons name="map-off" size={60} color={themeColors.textSecondary} />
            <Text style={styles.placeholderText}>
              {Platform.OS === 'web' 
                ? 'Map view not available on web' 
                : 'No route data available'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const getStyles = (themeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'ios' ? 44 + 15 : (RNStatusBar.currentHeight || 0) + 15,
    backgroundColor: themeColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border,
  },
  backButton: {
    padding: 5,
  },  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.text,
  },
  placeholder: {
    width: 34, // Same width as back button for centering
  },
  workoutInfo: {
    backgroundColor: themeColors.surface,
    padding: 20,
    marginBottom: 1,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  workoutIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  workoutDetails: {
    flex: 1,
  },  workoutType: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.text,
  },
  workoutDate: {
    fontSize: 14,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  statLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 2,
  },  mapContainer: {
    flex: 1,
    backgroundColor: themeColors.surface,
  },
  map: {
    flex: 1,
  },  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  placeholderText: {
    fontSize: 16,
    color: themeColors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default RouteDetailScreen;
