import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

// Import context providers
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import VehicleRequestScreen from './src/screens/VehicleRequestScreen';
import MaintenanceScreen from './src/screens/MaintenanceScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import DocumentViewerScreen from './src/screens/DocumentViewerScreen';

// Create navigation stacks
const Stack = createNativeStackNavigator();

// Keep splash screen visible while we initialize
SplashScreen.preventAutoHideAsync();

// Main navigation component
const Navigation = () => {
  const { user, loading } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Simulate some pre-loading tasks
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    // Hide splash screen once authentication is checked and app is ready
    if (!loading && appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [loading, appIsReady]);

  // If still loading, don't render anything
  if (loading || !appIsReady) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
        }}
      >
        {user ? (
          // User is signed in
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ 
                title: 'Miles Express',
                headerTitleAlign: 'center',
              }}
            />
            <Stack.Screen 
              name="VehicleRequest" 
              component={VehicleRequestScreen} 
              options={{ 
                title: 'Request Vehicle',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="Maintenance" 
              component={MaintenanceScreen} 
              options={{ 
                title: 'Report Maintenance',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="Documents" 
              component={DocumentsScreen} 
              options={{ 
                title: 'Documents',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="DocumentViewer" 
              component={DocumentViewerScreen} 
              options={{ 
                title: 'Document',
                headerBackTitle: 'Back',
              }}
            />
          </>
        ) : (
          // User is not signed in
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// App entry point
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}