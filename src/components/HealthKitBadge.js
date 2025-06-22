import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

const HealthKitBadge = ({ size = 'small', style = {} }) => {
  const badgeSize = size === 'large' ? 20 : 12;
  const iconSize = size === 'large' ? 12 : 8;
  
  return (    <View style={[styles.badge, { width: badgeSize, height: badgeSize }, style]}>
      <MaterialCommunityIcons 
        name="dumbbell" 
        size={iconSize} 
        color="#FFF" 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#007AFF', // iOS blue color for Fitness app
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -4,
    right: -4,
  },
});

export default HealthKitBadge;
