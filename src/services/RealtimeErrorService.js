import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

// Web-compatible Alert fallback
const getAlert = () => {
  if (Platform.OS === 'web') {
    return {
      alert: (title, message, buttons) => {
        if (typeof window !== 'undefined') {
          const result = window.confirm(`${title}\n\n${message}`);
          if (buttons && buttons.length > 0) {
            const button = buttons.find(b => b.style !== 'cancel') || buttons[0];
            if (result && button.onPress) {
              button.onPress();
            }
          }
        }
      }
    };
  }
  return { alert: Alert.alert };
};

// Web-compatible storage fallback
const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: async (key) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore storage errors on web
        }
      },
      removeItem: async (key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore storage errors on web
        }
      },
      getAllKeys: async () => {
        try {
          return Object.keys(localStorage);
        } catch {
          return [];
        }
      },
      multiRemove: async (keys) => {
        try {
          keys.forEach(key => localStorage.removeItem(key));
        } catch {
          // Ignore storage errors on web
        }
      }
    };
  }
  return AsyncStorage;
};

class RealtimeErrorService {
  constructor() {
    this.errorQueue = [];
    this.isProcessing = false;
    this.errorHandlers = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.storage = getStorage();
    this.alert = getAlert();
    
    // Initialize error monitoring
    this.initializeErrorMonitoring();
  }

  initializeErrorMonitoring() {
    // Override console.error to capture all errors
    const originalError = console.error;
    console.error = (...args) => {
      this.captureError('console', args.join(' '));
      originalError.apply(console, args);
    };

    // Override console.warn for warnings
    const originalWarn = console.warn;
    console.warn = (...args) => {
      this.captureWarning('console', args.join(' '));
      originalWarn.apply(console, args);
    };    // Global error handler for unhandled promise rejections (web only)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError('unhandledPromise', event.reason?.message || event.reason);
      });
    }

    // React Native specific error handling (only if ErrorUtils exists)
    if (typeof global !== 'undefined' && global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
      global.ErrorUtils.setGlobalHandler(this.handleGlobalError.bind(this));
    }
  }

  handleGlobalError(error, isFatal) {
    this.captureError('global', error.message || error, {
      isFatal,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    if (isFatal) {
      this.handleFatalError(error);
    }
  }

  captureError(source, message, metadata = {}) {
    const errorData = {
      id: Date.now() + Math.random(),
      source,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      severity: 'error',
      attempts: 0
    };

    this.errorQueue.push(errorData);
    this.processErrorQueue();
    this.logToStorage(errorData);
  }

  captureWarning(source, message, metadata = {}) {
    const warningData = {
      id: Date.now() + Math.random(),
      source,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      severity: 'warning',
      attempts: 0
    };

    this.logToStorage(warningData);
  }

  async processErrorQueue() {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift();
      
      try {
        await this.handleError(error);
      } catch (handlingError) {
        console.error('Error handling failed:', handlingError);
        
        // Retry logic
        if (error.attempts < this.maxRetries) {
          error.attempts++;
          this.errorQueue.push(error);
          await this.delay(this.retryDelay * error.attempts);
        }
      }
    }

    this.isProcessing = false;
  }

  async handleError(errorData) {
    const { message, source, metadata } = errorData;

    // Location permission errors
    if (this.isLocationError(message)) {
      return this.handleLocationError(errorData);
    }

    // Network errors
    if (this.isNetworkError(message)) {
      return this.handleNetworkError(errorData);
    }

    // Map/GPS errors
    if (this.isMapError(message)) {
      return this.handleMapError(errorData);
    }

    // State/Context errors
    if (this.isStateError(message)) {
      return this.handleStateError(errorData);
    }

    // Storage errors
    if (this.isStorageError(message)) {
      return this.handleStorageError(errorData);
    }

    // Generic error handling
    return this.handleGenericError(errorData);
  }

  // Error type detection methods
  isLocationError(message) {
    return /location|gps|permission.*location|geolocation/i.test(message);
  }

  isNetworkError(message) {
    return /network|fetch|request|connection|timeout|cors/i.test(message);
  }

  isMapError(message) {
    return /map|route|marker|polyline|directions/i.test(message);
  }

  isStateError(message) {
    return /state|context|reducer|dispatch|undefined.*state/i.test(message);
  }

  isStorageError(message) {
    return /storage|asyncstorage|persist|save|load/i.test(message);
  }

  // Specific error handlers
  async handleLocationError(errorData) {
    console.log('🔧 Auto-fixing location error:', errorData.message);
    
    try {
      // Try to request permissions again
      const { requestForegroundPermissionsAsync } = await import('expo-location');
      const { status } = await requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Location permissions granted');
        return { fixed: true, action: 'permission_granted' };
      } else {
        console.log('❌ Location permissions still denied');
        this.showLocationPermissionAlert();
        return { fixed: false, action: 'permission_denied' };
      }
    } catch (error) {
      console.error('Failed to handle location error:', error);
      return { fixed: false, error: error.message };
    }
  }

  async handleNetworkError(errorData) {
    console.log('🔧 Auto-fixing network error:', errorData.message);
    
    try {
      // Test connectivity
      const response = await fetch('https://google.com', { method: 'HEAD' });
      
      if (response.ok) {
        console.log('✅ Network connectivity restored');
        return { fixed: true, action: 'network_restored' };
      }
    } catch (error) {
      console.log('❌ Network still unavailable');
      return { fixed: false, action: 'network_unavailable' };
    }
  }

  async handleMapError(errorData) {
    console.log('🔧 Auto-fixing map error:', errorData.message);
      try {
      // Reset map state
      await this.storage.removeItem('mapState');
      await this.storage.removeItem('lastMapRegion');
      
      console.log('✅ Map state reset');
      return { fixed: true, action: 'map_state_reset' };
    } catch (error) {
      console.error('Failed to reset map state:', error);
      return { fixed: false, error: error.message };
    }
  }

  async handleStateError(errorData) {
    console.log('🔧 Auto-fixing state error:', errorData.message);
      try {
      // Reset application state
      await this.storage.removeItem('appState');
      await this.storage.removeItem('userPreferences');
      
      console.log('✅ Application state reset');
      return { fixed: true, action: 'state_reset' };
    } catch (error) {
      console.error('Failed to reset state:', error);
      return { fixed: false, error: error.message };
    }
  }

  async handleStorageError(errorData) {
    console.log('🔧 Auto-fixing storage error:', errorData.message);
      try {
      // Clear potentially corrupted storage
      const keys = await this.storage.getAllKeys();
      const corruptedKeys = keys.filter(key => 
        key.includes('corrupted') || key.includes('temp')
      );
      
      if (corruptedKeys.length > 0) {
        await this.storage.multiRemove(corruptedKeys);
        console.log('✅ Corrupted storage cleaned');
        return { fixed: true, action: 'storage_cleaned' };
      }
      
      return { fixed: false, action: 'no_corruption_found' };
    } catch (error) {
      console.error('Failed to handle storage error:', error);
      return { fixed: false, error: error.message };
    }
  }

  async handleGenericError(errorData) {
    console.log('🔧 Handling generic error:', errorData.message);
    
    // Log error for analysis
    await this.logToStorage(errorData);
    
    return { fixed: false, action: 'logged_for_analysis' };
  }
  handleFatalError(error) {
    console.error('💥 Fatal error encountered:', error);
    
    this.alert.alert(
      'App Error',
      'The app encountered a fatal error and needs to restart.',
      [
        {
          text: 'Restart',
          onPress: () => {
            // Try to restart the app
            if (typeof window !== 'undefined' && window.location) {
              window.location.reload();
            }
          }
        }
      ]
    );
  }

  showLocationPermissionAlert() {
    this.alert.alert(
      'Location Permission Required',
      'This app needs location access to track your activities. Please enable location permissions in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            // Open app settings (implementation depends on platform)
            if (typeof window !== 'undefined') {
              console.log('Opening settings...');
            }
          }
        }
      ]
    );
  }
  async logToStorage(errorData) {
    try {
      const existingLogs = await this.storage.getItem('errorLogs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      logs.push(errorData);
      
      // Keep only last 100 errors
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      await this.storage.setItem('errorLogs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to log error to storage:', error);
    }
  }
  async getErrorLogs() {
    try {
      const logs = await this.storage.getItem('errorLogs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to retrieve error logs:', error);
      return [];
    }
  }

  async clearErrorLogs() {
    try {
      await this.storage.removeItem('errorLogs');
      console.log('Error logs cleared');
    } catch (error) {
      console.error('Failed to clear error logs:', error);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Register custom error handler
  registerErrorHandler(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
  }

  // Start continuous monitoring
  startContinuousMonitoring() {
    console.log('🚀 Starting continuous error monitoring...');
    
    // Monitor every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkSystemHealth();
    }, 5000);
  }

  stopContinuousMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      console.log('⏹️ Stopped continuous error monitoring');
    }
  }

  async checkSystemHealth() {
    try {
      // Check if critical services are working
      const healthChecks = [
        this.checkLocationService(),
        this.checkStorageService(),
        this.checkNetworkService()
      ];

      const results = await Promise.allSettled(healthChecks);
      
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const services = ['location', 'storage', 'network'];
          this.captureError('healthCheck', `${services[index]} service check failed`, {
            error: result.reason
          });
        }
      });
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  async checkLocationService() {
    const { getLastKnownPositionAsync } = await import('expo-location');
    return await getLastKnownPositionAsync();
  }
  async checkStorageService() {
    return await this.storage.getItem('test');
  }

  async checkNetworkService() {
    return await fetch('https://httpbin.org/status/200', { 
      method: 'HEAD',
      timeout: 5000 
    });
  }
}

// Create and export singleton instance
const realtimeErrorService = new RealtimeErrorService();

export default realtimeErrorService;
