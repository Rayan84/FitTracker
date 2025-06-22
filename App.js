import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import { FitnessProvider } from './src/context/FitnessContext';
import AppNavigator from './src/navigation/AppNavigator';
import realtimeErrorService from './src/services/RealtimeErrorService';
import { ErrorBoundary, enhanceConsoleLogging } from './src/utils/ErrorLogger';

// Enable enhanced error logging
enhanceConsoleLogging();

// Start real-time error monitoring
realtimeErrorService.startContinuousMonitoring();

// Suppress specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

// Enhanced console error to catch text rendering issues
const originalConsoleError = console.error;
console.error = function(message, ...args) {
  // Check for text rendering errors
  if (typeof message === 'string' && message.includes('Text strings must be rendered within a <Text> component')) {
    console.log('TEXT RENDERING ERROR DETECTED!');
    console.log('Error message:', message);
    console.log('Stack trace:', new Error().stack);
    
    // Log additional info to help debug
    if (args && args.length > 0) {
      console.log('Additional error info:', args);
    }
  }
  
  // Call original console.error
  originalConsoleError.apply(console, [message, ...args]);
};

// Global error handler
const setupGlobalErrorHandler = () => {
  if (Platform.OS !== 'web') {
    // Set up global error handler for React Native
    if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        console.log('Global error caught:', error);
        console.log('Is fatal:', isFatal);
        console.log('Stack trace:', error.stack);
      });
    } else {
      console.log('ErrorUtils not available in this React Native version');
    }
  } else {
    // Set up global error handler for web
    window.onerror = (message, source, lineno, colno, error) => {
      console.log('Global error caught (web):', message);
      console.log('Source:', source, 'Line:', lineno, 'Column:', colno);
      console.log('Error object:', error);
      return true; // Prevents default error handling
    };
  }
};

export default function App() {
  useEffect(() => {
    setupGlobalErrorHandler();
    
    // Log when App component mounts
    console.log('App component mounted');
    
    // Debug React Native text errors
    const originalRender = Text.render;
    if (originalRender && Text.render) {
      try {
        Text.render = function(...args) {
          try {
            return originalRender.apply(this, args);
          } catch (error) {
            console.log('Error in Text.render:', error);
            throw error;
          }
        };
      } catch (e) {
        console.log('Could not override Text.render:', e);
      }
    }
  }, []);

  // On web, show a simplified version of the app without maps
  if (Platform.OS === 'web') {
    return (
      <ErrorBoundary componentName="WebApp">
        <View style={styles.webContainer}>
          <StatusBar style="auto" />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>FitTracker</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>Welcome to FitTracker</Text>
            <Text style={styles.subtitle}>
              For the best experience, please use this app on your mobile device.
            </Text>
            <Text style={styles.instructions}>
              The full version with maps and activity tracking is available on iOS and Android.
            </Text>
            <Text style={styles.instructions}>
              Scan the QR code with your device camera to get started!
            </Text>
          </View>
        </View>
      </ErrorBoundary>
    );
  }
  
  // Regular app on mobile
  return (
    <ErrorBoundary componentName="MainApp">
      <AppProvider>
        <SafeAreaProvider>
          <FitnessProvider>
            <StatusBar style="light" translucent={true} backgroundColor="transparent" />
            <AppNavigator />
          </FitnessProvider>
        </SafeAreaProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#4893ff',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#555',
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
});
