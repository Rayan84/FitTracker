import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Create a simple stack navigator
const Stack = createNativeStackNavigator();

// Create a simple screen component
const TestScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Test Screen</Text>
  </View>
);

// Create a simple navigator with different comment styles
export const TestNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Test" 
          component={TestScreen} 
        /> {/* Comment after closing tag with space */}
        <Stack.Screen 
          name="Test2" 
          component={TestScreen} 
        />{/* Comment after closing tag without space */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Export a function to test different JSX patterns
export const testJSXPatterns = () => {
  console.log('Testing JSX patterns that might cause Text errors:');
  
  // Test 1: JSX with comment after closing tag
  const test1 = (
    <View>
      <Text>Test 1</Text>
    </View> // This comment might cause issues
  );
  
  // Test 2: JSX with text after closing tag
  const test2 = (
    <View>
      <Text>Test 2</Text>
    </View> Text outside of Text component
  );
  
  // Test 3: JSX with comment after self-closing tag
  const test3 = (
    <View>
      <Text /> // This comment might cause issues
    </View>
  );
  
  return { test1, test2, test3 };
};

// Export a function to check for text nodes in JSX
export const findTextNodes = (element) => {
  if (!element) return [];
  
  const textNodes = [];
  
  if (typeof element === 'string' || typeof element === 'number') {
    return [String(element)];
  }
  
  if (Array.isArray(element)) {
    element.forEach(child => {
      textNodes.push(...findTextNodes(child));
    });
    return textNodes;
  }
  
  if (element.props && element.props.children) {
    textNodes.push(...findTextNodes(element.props.children));
  }
  
  return textNodes;
};
