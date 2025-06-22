import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import * as Localization from 'expo-localization';

// Create the context
const AppContext = createContext();

// Context provider component
export const AppProvider = ({ children }) => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [useManualTheme, setUseManualTheme] = useState(false);
  
  // Units state
  const [useMiles, setUseMiles] = useState(false);
  const [useManualUnits, setUseManualUnits] = useState(false);
  
  // Loading state
  const [loading, setLoading] = useState(true);
  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const darkModeSettings = await AsyncStorage.getItem('darkModeSettings');
        const unitsSettings = await AsyncStorage.getItem('unitsSettings');
        
        if (darkModeSettings) {
          const { isDarkMode: savedDarkMode, useManualTheme: savedUseManual } = JSON.parse(darkModeSettings);
          setIsDarkMode(savedDarkMode);
          setUseManualTheme(savedUseManual);
        } else {
          // Use system theme by default
          const systemColorScheme = Appearance.getColorScheme();
          setIsDarkMode(systemColorScheme === 'dark');
          setUseManualTheme(false);
        }
        
        if (unitsSettings) {
          const { useMiles: savedUseMiles, useManualUnits: savedUseManual } = JSON.parse(unitsSettings);
          setUseMiles(savedUseMiles);
          setUseManualUnits(savedUseManual);
        } else {
          // Use system locale to determine units by default
          const locale = Localization.locale;
          const region = Localization.region;
          // US, Liberia, and Myanmar use imperial system
          const isImperial = locale.includes('US') || region === 'US' || 
                            locale.includes('LR') || region === 'LR' || 
                            locale.includes('MM') || region === 'MM';
          setUseMiles(isImperial);
          setUseManualUnits(false);
        }
      } catch (error) {
        console.error('Error loading app settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Listen to system theme changes when not using manual theme
  useEffect(() => {
    if (!useManualTheme) {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setIsDarkMode(colorScheme === 'dark');
      });

      return () => subscription?.remove();
    }
  }, [useManualTheme]);

  // Save theme settings to AsyncStorage whenever they change
  useEffect(() => {
    if (!loading) {
      const saveThemeSettings = async () => {
        try {
          const themeSettings = { isDarkMode, useManualTheme };
          await AsyncStorage.setItem('darkModeSettings', JSON.stringify(themeSettings));
        } catch (error) {
          console.error('Error saving theme settings:', error);
        }
      };

      saveThemeSettings();
    }
  }, [isDarkMode, useManualTheme, loading]);
  // Save units setting to AsyncStorage whenever it changes
  useEffect(() => {
    if (!loading) {
      const saveUnitsSettings = async () => {
        try {
          const unitsSettings = { useMiles, useManualUnits };
          await AsyncStorage.setItem('unitsSettings', JSON.stringify(unitsSettings));
        } catch (error) {
          console.error('Error saving units settings:', error);
        }
      };

      saveUnitsSettings();
    }
  }, [useMiles, useManualUnits, loading]);

  // Toggle dark mode (enables manual theme control)
  const toggleDarkMode = () => {
    setUseManualTheme(true);
    setIsDarkMode(!isDarkMode);
  };

  // Set to follow system theme
  const followSystemTheme = () => {
    setUseManualTheme(false);
    const systemColorScheme = Appearance.getColorScheme();
    setIsDarkMode(systemColorScheme === 'dark');
  };
  // Toggle units (enables manual units control)
  const toggleUnits = () => {
    setUseManualUnits(true);
    setUseMiles(!useMiles);
  };

  // Set to follow system units
  const followSystemUnits = () => {
    setUseManualUnits(false);
    const locale = Localization.locale;
    const region = Localization.region;
    // US, Liberia, and Myanmar use imperial system
    const isImperial = locale.includes('US') || region === 'US' || 
                      locale.includes('LR') || region === 'LR' || 
                      locale.includes('MM') || region === 'MM';
    setUseMiles(isImperial);
  };
  // Conversion utilities
  const convertDistance = (distanceInKm) => {
    // Handle invalid inputs
    const distance = parseFloat(distanceInKm);
    if (isNaN(distance) || distance == null) {
      return 0;
    }
    
    if (useMiles) {
      return distance * 0.621371; // Convert km to miles
    }
    return distance;
  };

  const convertSpeed = (speedInKmh) => {
    // Handle invalid inputs
    const speed = parseFloat(speedInKmh);
    if (isNaN(speed) || speed == null) {
      return 0;
    }
    
    if (useMiles) {
      return speed * 0.621371; // Convert km/h to mph
    }
    return speed;
  };

  const getDistanceUnit = () => {
    return useMiles ? 'mi' : 'km';
  };

  const getSpeedUnit = () => {
    return useMiles ? 'mph' : 'km/h';
  };
  const formatDistance = (distanceInKm, decimals = 2) => {
    const converted = convertDistance(distanceInKm);
    const safeConverted = typeof converted === 'number' && !isNaN(converted) ? converted : 0;
    return `${safeConverted.toFixed(decimals)} ${getDistanceUnit()}`;
  };

  const formatSpeed = (speedInKmh, decimals = 1) => {
    const converted = convertSpeed(speedInKmh);
    const safeConverted = typeof converted === 'number' && !isNaN(converted) ? converted : 0;
    return `${safeConverted.toFixed(decimals)} ${getSpeedUnit()}`;
  };

  // Theme colors based on current mode
  const theme = {
    mode: isDarkMode ? 'dark' : 'light',
    colors: {
      // Main colors
      primary: '#4893ff',
      background: isDarkMode ? '#1a1a1a' : '#f5f5f5',
      surface: isDarkMode ? '#2a2a2a' : '#ffffff',
      card: isDarkMode ? '#2a2a2a' : '#ffffff',
      text: isDarkMode ? '#ffffff' : '#333333',
      textSecondary: isDarkMode ? '#cccccc' : '#666666',
      textTertiary: isDarkMode ? '#999999' : '#999999',
      border: isDarkMode ? '#404040' : '#e0e0e0',
      divider: isDarkMode ? '#404040' : '#e0e0e0',
      
      // Status colors
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
      
      // Activity colors
      running: '#FF6B6B',
      walking: '#4ECDC4',
      cycling: '#45B7D1',
      
      // Map colors
      mapStyle: isDarkMode ? 'dark' : 'standard',
      
      // Header
      headerBackground: isDarkMode ? '#2a2a2a' : '#ffffff',
      headerTint: isDarkMode ? '#ffffff' : '#333333',
      
      // Tab bar
      tabBarBackground: isDarkMode ? '#2a2a2a' : '#ffffff',
      tabBarActive: '#4893ff',
      tabBarInactive: isDarkMode ? '#888888' : '#999999',
      
      // Input
      inputBackground: isDarkMode ? '#404040' : '#f8f8f8',
      inputBorder: isDarkMode ? '#606060' : '#ddd',
      inputText: isDarkMode ? '#ffffff' : '#333333',
      placeholder: isDarkMode ? '#888888' : '#999999',
    }
  };
  const value = {
    // Theme
    isDarkMode,
    useManualTheme,
    theme,
    themeColors: theme.colors, // Alias for backward compatibility
    colors: theme.colors, // Also provide colors directly
    toggleDarkMode,
    followSystemTheme,
      // Units
    useMiles,
    useManualUnits,
    toggleUseMiles: toggleUnits, // Correct function name
    toggleUnits,
    followSystemUnits,
    convertDistance,
    convertSpeed,
    getDistanceUnit,
    getSpeedUnit,
    formatDistance,
    formatSpeed,
    
    // Loading
    loading,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the app context
const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Also export as useApp for backward compatibility
const useApp = useAppContext;

// Named exports
export { useAppContext, useApp };

export default AppContext;
