// src/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { COLORS, FONTS, SIZES } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';

const LoginScreen = () => {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [loggingIn, setLoggingIn] = useState(false);

  // Check for stored credentials on mount
  useEffect(() => {
    checkStoredCredentials();
  }, []);

  const checkStoredCredentials = async () => {
    try {
      const storedRememberMe = await SecureStore.getItemAsync('rememberMe');
      
      if (storedRememberMe === 'true') {
        const storedEmail = await SecureStore.getItemAsync('userEmail');
        const storedPassword = await SecureStore.getItemAsync('userPassword');
        
        if (storedEmail && storedPassword) {
          setEmail(storedEmail);
          setPassword(storedPassword);
          setRememberMe(true);
        }
      }
    } catch (error) {
      console.error('Error checking stored credentials:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoggingIn(true);
      const { success, error } = await signIn(email, password, rememberMe);
      
      if (success) {
        // Store credentials if remember me is checked
        if (rememberMe) {
          await SecureStore.setItemAsync('userEmail', email);
          await SecureStore.setItemAsync('userPassword', password);
          await SecureStore.setItemAsync('rememberMe', 'true');
        } else {
          // Clear stored credentials if remember me is unchecked
          await SecureStore.deleteItemAsync('userEmail');
          await SecureStore.deleteItemAsync('userPassword');
          await SecureStore.deleteItemAsync('rememberMe');
        }
      } else {
        Alert.alert('Login Failed', error || 'Please check your credentials and try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
    } finally {
      setLoggingIn(false);
    }
  };

  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo-placeholder.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Miles Express</Text>
          <Text style={styles.appSubtitle}>Driver App</Text>
        </View>

        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Driver Login</Text>
          
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            disabled={loggingIn || loading}
          />
          
          <Input
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
            disabled={loggingIn || loading}
          />
          
          <TouchableOpacity
            style={styles.rememberMeContainer}
            onPress={toggleRememberMe}
            activeOpacity={0.7}
            disabled={loggingIn || loading}
          >
            <View
              style={[
                styles.checkbox,
                rememberMe && styles.checkboxChecked,
              ]}
            >
              {rememberMe && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>
          
          <Button
            title="Login"
            onPress={handleLogin}
            loading={loggingIn || loading}
            disabled={loggingIn || loading}
            style={styles.loginButton}
          />
        </Card>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Miles Express
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.xl * 2,
    paddingBottom: SIZES.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: SIZES.md,
  },
  appName: {
    fontSize: FONTS.size.xxl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  appSubtitle: {
    fontSize: FONTS.size.lg,
    color: COLORS.textLight,
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  formTitle: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.semiBold,
    color: COLORS.textDark,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: SIZES.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.bold,
  },
  rememberMeText: {
    fontSize: FONTS.size.md,
    color: COLORS.textDark,
  },
  loginButton: {
    marginTop: SIZES.sm,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: SIZES.lg,
  },
  footerText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textLight,
  },
});

export default LoginScreen;