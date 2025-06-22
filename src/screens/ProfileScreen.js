import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    StatusBar as RNStatusBar,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import HealthKitService from '../services/HealthKitService';

const ProfileScreen = () => {  // Get theme and units from context
  const { isDarkMode, toggleDarkMode, useMiles, toggleUnits, colors } = useAppContext();
  
  // User stats (would normally come from storage/backend)
  const [user, setUser] = useState({
    name: '',
    email: '',
    weight: '',
    height: '',
    age: '',
    gender: '',
    profilePhoto: null,
  });
  
  // Toggle states - notifications only (dark mode and units come from context)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({...user});
    // Image upload state
  const [uploading, setUploading] = useState(false);    // Add state for Fitness sync and saving
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    // Load profile data and photo from storage
    loadProfileData();
    loadProfilePhoto();
    // Request permissions on component mount
    requestMediaLibraryPermissions();
  }, []);
  // Load profile data from AsyncStorage
  const loadProfileData = async () => {
    try {
      const savedProfile = await AsyncStorage.getItem('userProfile');
      if (savedProfile) {
        const profileData = JSON.parse(savedProfile);
        // Ensure all required fields exist with defaults
        const completeProfile = {
          name: profileData.name || '',
          email: profileData.email || '',
          weight: profileData.weight || '',
          height: profileData.height || '',
          age: profileData.age || '',
          gender: profileData.gender || '',
          profilePhoto: profileData.profilePhoto || null,
        };
        setUser(completeProfile);
        setEditedUser(completeProfile);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      // Set default values if loading fails
      const defaultProfile = {
        name: '',
        email: '',
        weight: '',
        height: '',
        age: '',
        gender: '',
        profilePhoto: null,
      };
      setUser(defaultProfile);
      setEditedUser(defaultProfile);
    }
  };

  // Save profile data to AsyncStorage
  const saveProfileData = async (profileData) => {
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(profileData));
    } catch (error) {
      console.error('Error saving profile data:', error);
    }
  };
  // Load profile photo from AsyncStorage
  const loadProfilePhoto = async () => {
    try {
      const savedPhoto = await AsyncStorage.getItem('profilePhoto');
      if (savedPhoto) {
        // Check if file exists before setting
        const fileInfo = await FileSystem.getInfoAsync(savedPhoto);
        if (fileInfo.exists) {
          setUser(prevUser => ({ ...prevUser, profilePhoto: savedPhoto }));
          setEditedUser(prevUser => ({ ...prevUser, profilePhoto: savedPhoto }));
        } else {
          // Remove invalid photo reference
          await AsyncStorage.removeItem('profilePhoto');
        }
      }
    } catch (error) {
      console.error('Error loading profile photo:', error);
      // Remove invalid photo reference on error
      try {
        await AsyncStorage.removeItem('profilePhoto');
      } catch (removeError) {
        console.error('Error removing invalid photo reference:', removeError);
      }
    }
  };

  // Save profile photo to AsyncStorage
  const saveProfilePhoto = async (uri) => {
    try {
      await AsyncStorage.setItem('profilePhoto', uri);
    } catch (error) {
      console.error('Error saving profile photo:', error);
    }
  };

  // Request permissions for media library
  const requestMediaLibraryPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to make this work!'
        );
      }
    }
  };

  // Handle selecting image from gallery
  const pickImage = async () => {
    try {
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        
        // Create a local copy of the image
        const fileUri = `${FileSystem.documentDirectory}profile_photo.jpg`;
        await FileSystem.copyAsync({
          from: selectedImage.uri,
          to: fileUri
        });
        
        // Update state with the new image
        handleChange('profilePhoto', fileUri);
        
        // Save image uri to storage
        await saveProfilePhoto(fileUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'There was an error selecting your image.');
    } finally {
      setUploading(false);
    }
  };

  // Handle taking a photo with camera
  const takePhoto = async () => {
    try {
      // First request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }
      
      setUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        
        // Create a local copy of the image
        const fileUri = `${FileSystem.documentDirectory}profile_photo.jpg`;
        await FileSystem.copyAsync({
          from: selectedImage.uri,
          to: fileUri
        });
        
        // Update state with the new image
        handleChange('profilePhoto', fileUri);
        
        // Save image uri to storage
        await saveProfilePhoto(fileUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'There was an error taking your photo.');
    } finally {
      setUploading(false);
    }
  };
  
  // Show action sheet to select photo source
  const handleChangePhoto = () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose a source for your profile photo',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };
  
  // Unit conversion helpers
  const convertWeight = (weight, toImperial) => {
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum)) return weight;
    
    if (toImperial) {
      // kg to lbs (1 kg = 2.20462 lbs)
      return (weightNum * 2.20462).toFixed(1);
    } else {
      // lbs to kg (1 lb = 0.453592 kg)
      return (weightNum / 2.20462).toFixed(1);
    }
  };

  const convertHeight = (height, toImperial) => {
    const heightNum = parseFloat(height);
    if (isNaN(heightNum)) return height;
    
    if (toImperial) {
      // cm to feet (1 cm = 0.0328084 feet)
      return (heightNum * 0.0328084).toFixed(1);
    } else {
      // feet to cm (1 foot = 30.48 cm)
      return (heightNum * 30.48).toFixed(0);
    }
  };
  const getDisplayWeight = (weight) => {
    if (!weight) return '--';
    const weightNum = parseFloat(weight);
    if (isNaN(weightNum)) return weight;
    
    if (useMiles) {
      // Convert kg to lbs (stored in kg, display in lbs)
      return (weightNum * 2.20462).toFixed(1);
    }
    return weight;
  };

  const getDisplayHeight = (height) => {
    if (!height) return '--';
    const heightNum = parseFloat(height);
    if (isNaN(heightNum)) return height;
    
    if (useMiles) {
      // Convert cm to feet (stored in cm, display in feet)
      return (heightNum * 0.0328084).toFixed(1);
    }
    return height;
  };
  const saveProfile = async () => {
    // Validate inputs
    if (!editedUser.name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
      // Process weight and height to numbers
    const weight = parseFloat(editedUser.weight);
    const height = parseFloat(editedUser.height);
    const age = parseInt(editedUser.age);
    
    if (isNaN(weight) || isNaN(height) || isNaN(age)) {
      Alert.alert('Error', 'Please enter valid numbers for weight, height and age');
      return;
    }
    // Validate ranges - always validate against metric since that's how we store
    // Weight should be in kg (stored), so convert limits
    if (weight < 20 || weight > 500) {
      const minDisplay = useMiles ? (20 * 2.20462).toFixed(0) : 20;
      const maxDisplay = useMiles ? (500 * 2.20462).toFixed(0) : 500;
      const unit = useMiles ? 'lbs' : 'kg';
      Alert.alert('Error', `Please enter a valid weight (${minDisplay}-${maxDisplay} ${unit})`);
      return;
    }
    
    // Height should be in cm (stored), so convert limits
    if (height < 100 || height > 250) {
      const minDisplay = useMiles ? (100 * 0.0328084).toFixed(1) : 100;
      const maxDisplay = useMiles ? (250 * 0.0328084).toFixed(1) : 250;
      const unit = useMiles ? 'ft' : 'cm';
      Alert.alert('Error', `Please enter a valid height (${minDisplay}-${maxDisplay} ${unit})`);
      return;
    }

    if (age < 1 || age > 120) {
      Alert.alert('Error', 'Please enter a valid age (1-120 years)');
      return;
    }

    setIsSaving(true);
    try {
      // Create a clean profile object
      const profileToSave = {
        name: editedUser.name.trim(),
        email: editedUser.email.trim(),
        weight: weight.toString(),
        height: height.toString(),
        age: age.toString(),
        gender: editedUser.gender,
        profilePhoto: editedUser.profilePhoto,
      };

      // Save changes to local state
      setUser(profileToSave);
      setIsEditing(false);
      
      // Save to AsyncStorage with error handling
      await saveProfileData(profileToSave);
      
      // Also save profile photo separately for consistency
      if (profileToSave.profilePhoto) {
        await AsyncStorage.setItem('profilePhoto', profileToSave.profilePhoto);
      }
      
      // Show confirmation
      Alert.alert('Success', 'Your profile has been updated and saved');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
    // Handle input changes with unit conversion
  const handleChange = (field, value) => {
    if (field === 'weight' || field === 'height') {
      // For weight and height, convert input to metric for storage
      setEditedUser(prev => ({ ...prev, [field]: value }));
    } else {
      setEditedUser(prev => ({ ...prev, [field]: value }));
    }
  };

  // Get input values in current unit system for editing
  const getInputWeight = () => {
    if (!editedUser.weight) return '';
    const weightNum = parseFloat(editedUser.weight);
    if (isNaN(weightNum)) return editedUser.weight;
    
    // Always store in kg, convert for display if needed
    if (useMiles) {
      return (weightNum * 2.20462).toFixed(1);
    }
    return editedUser.weight;
  };

  const getInputHeight = () => {
    if (!editedUser.height) return '';
    const heightNum = parseFloat(editedUser.height);
    if (isNaN(heightNum)) return editedUser.height;
    
    // Always store in cm, convert for display if needed
    if (useMiles) {
      return (heightNum * 0.0328084).toFixed(1);
    }
    return editedUser.height;
  };

  // Convert input values back to metric for storage
  const convertInputToMetric = (field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;

    if (field === 'weight' && useMiles) {
      // Convert lbs to kg for storage
      return (numValue / 2.20462).toFixed(1);
    }
    if (field === 'height' && useMiles) {
      // Convert feet to cm for storage
      return (numValue / 0.0328084).toFixed(0);
    }
    return value;
  };
  // Function to erase all sport/workout data
  const eraseSportData = async () => {
    Alert.alert(
      'Erase Workout Data',
      'Are you sure you want to erase all your workout data including activity history and calendar data? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('workouts');
              // Also remove any potential legacy or alternate workout data keys
              await AsyncStorage.removeItem('savedWorkouts');
              Alert.alert('Success', 'All workout data has been erased successfully.');
            } catch (error) {
              console.error('Error erasing workout data:', error);
              Alert.alert('Error', 'Failed to erase workout data. Please try again.');
            }
          },
        },
      ]
    );
  };  // Function to retrieve workouts from Fitness (iOS built-in app)
  const syncWithAppleHealth = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Fitness data retrieval is only available on iOS devices.');
      return;
    }

    // Create instance of HealthKitService to check availability
    const healthKitService = new HealthKitService();
    if (!healthKitService.isAvailable()) {
      Alert.alert('Fitness Not Available', 'Fitness (iOS built-in app) is not available on this device.');
      return;
    }

    Alert.alert(
      'Retrieve from Fitness',
      'This will import workouts from your iOS Fitness app. Any duplicate workouts will be automatically filtered out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retrieve',
          onPress: async () => {
            setIsSyncing(true);
            try {
              // Load existing workouts
              const existingWorkouts = await AsyncStorage.getItem('workouts');
              const workouts = existingWorkouts ? JSON.parse(existingWorkouts) : [];
              
              // Retrieve from Fitness
              const syncedWorkouts = await healthKitService.syncWorkouts(workouts);
              
              // Save updated workouts
              await AsyncStorage.setItem('workouts', JSON.stringify(syncedWorkouts));
              
              const newWorkoutCount = syncedWorkouts.length - workouts.length;
              
              Alert.alert(
                'Retrieve Complete',
                `Successfully imported ${newWorkoutCount} new workout${newWorkoutCount !== 1 ? 's' : ''} from Fitness (iOS built-in app).`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error retrieving from Fitness:', error);
              Alert.alert('Retrieve Error', 'Failed to retrieve from Fitness (iOS built-in app). Please try again.');
            } finally {
              setIsSyncing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: isEditing ? 150 : 100 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>Updated: May 27, 2025</Text>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.primary }, isSaving && { opacity: 0.7 }]} 
            onPress={() => {
              if (isEditing) {
                saveProfile();
              } else {
                setEditedUser({...user});
                setIsEditing(true);
              }
            }}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={styles.avatarContainer}>
            {uploading ? (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <ActivityIndicator size="large" color={colors.background} />
              </View>
            ) : editedUser.profilePhoto ? (
              <Image 
                source={{ uri: editedUser.profilePhoto }} 
                style={[styles.avatarImage, { borderColor: colors.primary }]}
              />
                          ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{(user.name || 'U').charAt(0)}</Text>
              </View>
            )}
            
            {isEditing && (
              <TouchableOpacity 
                style={[styles.changePhotoButton, { backgroundColor: colors.background }]}
                onPress={handleChangePhoto}
              >
                <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change</Text>
              </TouchableOpacity>
            )}
          </View>
            <View style={styles.profileInfo}>
            {isEditing ? (
              <View style={styles.infoEditContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Name</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                  value={editedUser.name}
                  onChangeText={(value) => handleChange('name', value)}
                  placeholderTextColor={colors.textSecondary}
                />
                
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                  value={editedUser.email}
                  onChangeText={(value) => handleChange('email', value)}
                  keyboardType="email-address"
                  placeholderTextColor={colors.textSecondary}
                />
                  <View style={styles.row}>
                  <View style={styles.halfColumn}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Weight ({useMiles ? 'lbs' : 'kg'})
                    </Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                      value={getInputWeight()}
                      onChangeText={(value) => {
                        const metricValue = convertInputToMetric('weight', value);
                        handleChange('weight', metricValue);
                      }}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textSecondary}
                      placeholder={useMiles ? "Enter weight in lbs" : "Enter weight in kg"}
                    />
                  </View>
                  <View style={styles.halfColumn}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Height ({useMiles ? 'ft' : 'cm'})
                    </Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                      value={getInputHeight()}
                      onChangeText={(value) => {
                        const metricValue = convertInputToMetric('height', value);
                        handleChange('height', metricValue);
                      }}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textSecondary}
                      placeholder={useMiles ? "e.g. 5.8" : "Enter height in cm"}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfColumn}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Age</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                      value={editedUser.age}
                      onChangeText={(value) => handleChange('age', value)}
                      keyboardType="number-pad"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfColumn}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Gender</Text>
                    <View style={styles.genderButtons}>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          { borderColor: colors.border },
                          editedUser.gender === 'Male' && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => handleChange('gender', 'Male')}
                      >
                        <Text style={[
                          { color: colors.text },
                          editedUser.gender === 'Male' && styles.genderButtonTextActive,
                        ]}>
                          Male
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.genderButton,
                          { borderColor: colors.border },
                          editedUser.gender === 'Female' && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => handleChange('gender', 'Female')}
                      >
                        <Text style={[
                          { color: colors.text },
                          editedUser.gender === 'Female' && styles.genderButtonTextActive,
                        ]}>
                          Female
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ) : (              <>
                <Text style={[styles.userName, { color: colors.text }]}>{user.name || 'No name set'}</Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user.email || 'No email set'}</Text>
                  <View style={styles.userStatsContainer}>
                    <View style={styles.userStatItem}>
                      <Text style={[styles.userStatValue, { color: colors.text }]}>
                      {`${getDisplayWeight(user.weight) || '--'} ${useMiles ? 'lbs' : 'kg'}`}
                    </Text>
                    <Text style={[styles.userStatLabel, { color: colors.textSecondary }]}>Weight</Text>
                  </View>
                  <View style={[styles.userStatDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.userStatItem}>
                    <Text style={[styles.userStatValue, { color: colors.text }]}>
                      {`${getDisplayHeight(user.height) || '--'} ${useMiles ? 'ft' : 'cm'}`}
                    </Text>
                    <Text style={[styles.userStatLabel, { color: colors.textSecondary }]}>Height</Text>
                  </View>
                  <View style={[styles.userStatDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.userStatItem}>
                    <Text style={[styles.userStatValue, { color: colors.text }]}>{user.age || '--'} yrs</Text>
                    <Text style={[styles.userStatLabel, { color: colors.textSecondary }]}>Age</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
        
        {/* Settings */}
        {!isEditing && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
            </View>
            
            <View style={[styles.settingsContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="theme-light-dark" size={24} color={colors.primary} />
                  <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
                </View><Switch
                  value={isDarkMode}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: '#D1D1D6', true: colors.primary }}
                  thumbColor={'#FFFFFF'}
                />
              </View>
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="bell-outline" size={24} color={colors.primary} />
                  <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#D1D1D6', true: colors.primary }}
                  thumbColor={'#FFFFFF'}
                />
              </View>
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="ruler" size={24} color={colors.primary} />
                  <Text style={[styles.settingText, { color: colors.text }]}>Units</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.customToggle, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={toggleUnits}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.toggleOption,
                    !useMiles && [styles.toggleOptionActive, { backgroundColor: colors.primary }]
                  ]}>
                    <Text style={[
                      styles.toggleOptionText,
                      { color: !useMiles ? colors.background : colors.textSecondary }
                    ]}>
                      Metric
                    </Text>
                  </View>
                  <View style={[
                    styles.toggleOption,
                    useMiles && [styles.toggleOptionActive, { backgroundColor: colors.primary }]
                  ]}>
                    <Text style={[
                      styles.toggleOptionText,
                      { color: useMiles ? colors.background : colors.textSecondary }
                    ]}>
                      Imperial
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <View style={styles.settingLeft}>
                                  <MaterialCommunityIcons name="heart-pulse" size={24} color={colors.primary} />
                  <Text style={[styles.settingText, { color: colors.text }]}>Retrieve from Fitness</Text>
                </View>
                <TouchableOpacity onPress={syncWithAppleHealth} disabled={isSyncing}>
                  {isSyncing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <MaterialCommunityIcons name="sync" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="run" size={24} color={colors.primary} />
                  <Text style={[styles.settingText, { color: colors.text }]}>Erase Workout Data</Text>
                </View>
                <TouchableOpacity onPress={eraseSportData}>
                  <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                <View style={styles.settingLeft}>
                                  <MaterialCommunityIcons name="dumbbell" size={24} color={colors.primary} />
                  <Text style={[styles.settingText, { color: colors.text }]}>Retrieve from Fitness</Text>
                </View>
                <TouchableOpacity onPress={syncWithAppleHealth}>
                  <MaterialCommunityIcons name="sync" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 44 + 20 : (RNStatusBar.currentHeight || 0) + 20,
  },  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  versionText: {
    fontSize: 12,
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  profileCard: {
    borderRadius: 15,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  changePhotoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 10,
  },
  changePhotoText: {
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 16,
    marginTop: 5,
  },
  userStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  userStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  userStatDivider: {
    width: 1,
  },
  userStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userStatLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsContainer: {
    borderRadius: 15,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 15,
  },
  infoEditContainer: {
    width: '100%',
  },
  infoLabel: {
    fontSize: 14,
    marginTop: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 5,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfColumn: {
    width: '48%',
  },
  genderButtons: {
    flexDirection: 'row',
    marginTop: 5,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 5,
    borderRadius: 8,
  },  genderButtonTextActive: {
    color: 'white',
  },
  customToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    height: 32,
  },
  toggleOption: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    margin: 2,
  },
  toggleOptionActive: {
    // backgroundColor will be set dynamically
  },
  toggleOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ProfileScreen;
