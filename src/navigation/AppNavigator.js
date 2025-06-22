import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { ErrorBoundary } from '../utils/ErrorLogger';

// Import screens
import ActivitiesScreen from '../screens/ActivitiesScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CyclingActivity from '../screens/CyclingActivity';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RouteDetailScreen from '../screens/RouteDetailScreen';
import RunningActivity from '../screens/RunningActivity';
import StatsScreen from '../screens/StatsScreen';
import WalkingActivity from '../screens/WalkingActivity';

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home Stack Navigator
const HomeStack = () => {
  useEffect(() => {
    console.log('HomeStack mounted');
  }, []);

  // Wrap in a function to prevent any text node issues
  const renderContent = () => (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RunningActivity"
        component={RunningActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WalkingActivity"
        component={WalkingActivity}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CyclingActivity"
        component={CyclingActivity}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );

  return (
    <ErrorBoundary componentName="HomeStack">
      {renderContent()}
    </ErrorBoundary>
  );
};

// Activities Stack Navigator
const ActivitiesStack = () => {
  useEffect(() => {
    console.log('ActivitiesStack mounted');
  }, []);

  // Wrap in a function to prevent any text node issues
  const renderContent = () => (
    <Stack.Navigator>
      <Stack.Screen
        name="ActivitiesScreen"
        component={ActivitiesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RouteDetail"
        component={RouteDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );

  return (
    <ErrorBoundary componentName="ActivitiesStack">
      {renderContent()}
    </ErrorBoundary>
  );
};

// Main Tab Navigator
const AppNavigator = () => {
  const { themeColors } = useAppContext();
  const styles = getStyles(themeColors);
  
  useEffect(() => {
    console.log('AppNavigator mounted');
  }, []);

  // Create tab icon component with proper error handling
  const createTabIcon = (iconName, color, size) => {
    try {
      return (
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={iconName} size={size} color={color} />
        </View>
      );
    } catch (error) {
      console.log('Error creating tab icon:', error);
      return null;
    }
  };

  return (
    <ErrorBoundary componentName="NavigationContainer">
      <NavigationContainer>
        <ErrorBoundary componentName="TabNavigator">
          <Tab.Navigator
            screenOptions={({ route }) => {
              let iconName = 'help-circle';

              if (route.name === 'Home') {
                iconName = 'home';
              } else if (route.name === 'Activities') {
                iconName = 'run';
              } else if (route.name === 'Calendar') {
                iconName = 'calendar';
              } else if (route.name === 'Stats') {
                iconName = 'chart-line';
              } else if (route.name === 'Profile') {
                iconName = 'account';
              }

              return {
                headerShown: false,
                tabBarActiveTintColor: themeColors.primary,
                tabBarInactiveTintColor: themeColors.textSecondary,
                tabBarShowLabel: true,
                tabBarStyle: styles.tabBar,
                tabBarIcon: ({ color, size }) => createTabIcon(iconName, color, size)
              };
            }}
          >
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="Activities" component={ActivitiesStack} />
            <Tab.Screen name="Calendar" component={CalendarScreen} />
            <Tab.Screen name="Stats" component={StatsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
          </Tab.Navigator>
        </ErrorBoundary>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

const getStyles = (themeColors) => StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
    backgroundColor: themeColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 0,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    padding: 10,
    backgroundColor: '#ffeeee',
    borderRadius: 5,
    margin: 10,
  }
});

// Wrap the entire AppNavigator with error handling
const AppNavigatorWithErrorHandling = () => {
  try {
    return <AppNavigator />;
  } catch (error) {
    console.log('Critical error in AppNavigator:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>Error loading navigation: {error.message}</Text>
      </View>
    );
  }
};

export default AppNavigatorWithErrorHandling;
