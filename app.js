import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Try multiple import strategies to handle various export types
// Strategy 1: Regular imports
import LoginScreenImport from './src/screens/LoginScreen';
import HomeScreenImport from './src/screens/HomeScreen';
import VehicleRequestScreenImport from './src/screens/VehicleRequestScreen';

// Strategy 2: Try with different extensions
try {
  var LoginScreenExt = require('./src/screens/LoginScreen.tsx').default;
  var HomeScreenExt = require('./src/screens/HomeScreen.tsx').default;
  var VehicleRequestScreenExt = require('./src/screens/VehicleRequestScreen.tsx').default;
} catch (e) {
  // Silently fail if files don't exist
}

// Strategy 3: Try with named exports
try {
  var { LoginScreen: LoginScreenNamed } = require('./src/screens/LoginScreen');
  var { HomeScreen: HomeScreenNamed } = require('./src/screens/HomeScreen');
  var { VehicleRequestScreen: VehicleRequestScreenNamed } = require('./src/screens/VehicleRequestScreen');
} catch (e) {
  // Silently fail if files don't exist
}

// Define fallback components
const FallbackLoginScreen = ({ navigation }) => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>Login Screen</Text>
    <TouchableOpacity 
      style={styles.button}
      onPress={() => navigation.navigate('Home')}
    >
      <Text style={styles.buttonText}>Login</Text>
    </TouchableOpacity>
  </View>
);

const FallbackHomeScreen = ({ navigation }) => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>Home Screen</Text>
    <TouchableOpacity 
      style={styles.button}
      onPress={() => navigation.navigate('VehicleRequest')}
    >
      <Text style={styles.buttonText}>Request Vehicle</Text>
    </TouchableOpacity>
  </View>
);

const FallbackVehicleRequestScreen = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>Vehicle Request Screen</Text>
  </View>
);

// Create stack navigator
const Stack = createNativeStackNavigator();

// Determine which components to use (prioritize actual imports, fall back to basic components)
const LoginComponent = LoginScreenImport || LoginScreenExt || LoginScreenNamed || FallbackLoginScreen;
const HomeComponent = HomeScreenImport || HomeScreenExt || HomeScreenNamed || FallbackHomeScreen;
const VehicleRequestComponent = VehicleRequestScreenImport || VehicleRequestScreenExt || VehicleRequestScreenNamed || FallbackVehicleRequestScreen;

// Main App without auth for testing
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#007bff',
              elevation: 5,
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginComponent} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Home" 
            component={HomeComponent} 
            options={{ title: 'Dashboard' }} 
          />
          <Stack.Screen 
            name="VehicleRequest" 
            component={VehicleRequestComponent}
            options={{ title: 'Request Vehicle' }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#007bff',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});