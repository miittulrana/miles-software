// src/navigation/AppNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../utils/theme';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import VehicleRequestScreen from '../screens/VehicleRequestScreen';

// Create stack navigator
const Stack = createNativeStackNavigator();

// App navigator for authenticated users
const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Driver Dashboard' }}
      />
      <Stack.Screen 
        name="VehicleRequest" 
        component={VehicleRequestScreen} 
        options={{ title: 'Request Vehicle' }}
      />
      {/* Add more screens as needed */}
    </Stack.Navigator>
  );
};

export default AppNavigator;