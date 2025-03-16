// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SIZES } from '../utils/theme';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import Card from '../components/Card';
import Button from '../components/Button';
import socketService from '../services/socketService';

const HomeScreen = ({ navigation }) => {
  const { user, profile, vehicle, signOut, refreshProfile, refreshVehicle } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Inactive');
  const [locationPermission, setLocationPermission] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      handleRefresh();
      
      // Set up event listeners for socket
      const connectionChangeListener = socketService.addEventListener(
        'connection_change',
        handleConnectionChange
      );
      
      const trackingStatusListener = socketService.addEventListener(
        'tracking_status',
        handleTrackingStatus
      );
      
      // Initialize location tracking if not already active
      if (socketService.trackingActive === false) {
        socketService.startLocationTracking();
      }
      
      // Set initial states
      setSocketConnected(socketService.isConnected);
      setLocationStatus(socketService.trackingActive ? 'Active' : 'Inactive');
      
      return () => {
        // Clean up listeners on blur
        connectionChangeListener();
        trackingStatusListener();
      };
    }, [])
  );

  // Handle connection change
  const handleConnectionChange = (data) => {
    setSocketConnected(data.connected);
  };

  // Handle tracking status change
  const handleTrackingStatus = (data) => {
    setLocationStatus(data.active ? 'Active' : 'Inactive');
    setLocationPermission(data.active);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Refresh user data
      await refreshProfile();
      await refreshVehicle();
      
      // Check socket connection
      if (!socketService.isConnected) {
        await socketService.connect();
      }
      
      // Check location tracking
      if (!socketService.trackingActive) {
        await socketService.startLocationTracking();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  // Navigate to screens
  const goToVehicleRequest = () => {
    navigation.navigate('VehicleRequest');
  };

  const goToMaintenance = () => {
    navigation.navigate('Maintenance');
  };

  const goToDocuments = () => {
    navigation.navigate('Documents');
  };

  // Function to manually restart tracking
  const restartTracking = async () => {
    try {
      // First disconnect and reconnect socket
      socketService.disconnect();
      await socketService.connect();
      
      // Then restart location tracking
      await socketService.startLocationTracking();
      
      Alert.alert('Success', 'Tracking service restarted');
    } catch (error) {
      console.error('Error restarting tracking:', error);
      Alert.alert('Error', 'Failed to restart tracking service');
    }
  };
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* User Profile Card */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatarContainer}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitials}>
                {profile?.full_name 
                  ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                  : 'DR'}
              </Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.full_name || 'Driver'}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.email || 'driver@example.com'}
            </Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.statusSection}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Location Tracking</Text>
            <View style={styles.statusValueContainer}>
              <View style={[
                styles.statusIndicator,
                locationStatus === 'Active' ? styles.statusActive : styles.statusInactive
              ]} />
              <Text style={styles.statusValue}>{locationStatus}</Text>
            </View>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Server Connection</Text>
            <View style={styles.statusValueContainer}>
              <View style={[
                styles.statusIndicator,
                socketConnected ? styles.statusActive : styles.statusInactive
              ]} />
              <Text style={styles.statusValue}>
                {socketConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
        </View>
        
        {(!locationPermission || !socketConnected) && (
          <Button
            title="Restart Tracking"
            onPress={restartTracking}
            type="secondary"
            size="small"
            style={styles.restartButton}
          />
        )}
      </Card>

      {/* Vehicle Information */}
      <Card style={styles.vehicleCard}>
        <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
        
        {vehicle ? (
          <View style={styles.vehicleInfo}>
            <View style={styles.vehicleIconContainer}>
              <Image
                source={require('../assets/vehicle-icon.png')}
                style={styles.vehicleIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleRegistration}>
                {vehicle.registration_number}
              </Text>
              <Text style={styles.vehicleModel}>
                {vehicle.make} {vehicle.model}
              </Text>
              <View style={styles.vehicleStatusContainer}>
                <Text style={styles.vehicleStatusLabel}>Status:</Text>
                <View style={[
                  styles.vehicleStatusBadge,
                  { backgroundColor: getStatusColor(vehicle.status) }
                ]}>
                  <Text style={styles.vehicleStatusText}>
                    {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                  </Text>
                </View>
              </View>
              
              {vehicle.is_temporary && (
                <View style={styles.temporaryInfo}>
                  <Text style={styles.temporaryLabel}>Temporary Assignment</Text>
                  <Text style={styles.temporaryDates}>
                    {formatDate(vehicle.start_time)} - {vehicle.end_time ? formatDate(vehicle.end_time) : 'Ongoing'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noVehicleContainer}>
            <Text style={styles.noVehicleText}>No vehicle currently assigned</Text>
            <Button
              title="Request Vehicle"
              onPress={goToVehicleRequest}
              type="primary"
              size="small"
              style={styles.requestButton}
            />
          </View>
        )}
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={goToVehicleRequest}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.actionIconText}>🚗</Text>
            </View>
            <Text style={styles.actionText}>Request Vehicle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={goToMaintenance}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.warning }]}>
              <Text style={styles.actionIconText}>🔧</Text>
            </View>
            <Text style={styles.actionText}>Report Maintenance</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={goToDocuments}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.info }]}>
              <Text style={styles.actionIconText}>📄</Text>
            </View>
            <Text style={styles.actionText}>Documents</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.danger }]}>
              <Text style={styles.actionIconText}>🚪</Text>
            </View>
            <Text style={styles.actionText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

// Helper function to get status color
const getStatusColor = (status) => {
  switch (status) {
    case 'available':
      return COLORS.success;
    case 'assigned':
      return COLORS.primary;
    case 'maintenance':
      return COLORS.warning;
    case 'inactive':
      return COLORS.secondary;
    default:
      return COLORS.secondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SIZES.md,
  },
  profileCard: {
    marginBottom: SIZES.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  profileAvatarContainer: {
    marginRight: SIZES.md,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: COLORS.white,
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: FONTS.size.md,
    color: COLORS.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SIZES.sm,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.xs,
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    fontSize: FONTS.size.sm,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  statusValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SIZES.xs,
  },
  statusActive: {
    backgroundColor: COLORS.success,
  },
  statusInactive: {
    backgroundColor: COLORS.danger,
  },
  statusValue: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
    color: COLORS.textDark,
  },
  restartButton: {
    marginTop: SIZES.md,
  },
  vehicleCard: {
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.semiBold,
    color: COLORS.textDark,
    marginBottom: SIZES.md,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconContainer: {
    marginRight: SIZES.md,
  },
  vehicleIcon: {
    width: 60,
    height: 60,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleRegistration: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  vehicleModel: {
    fontSize: FONTS.size.md,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  vehicleStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleStatusLabel: {
    fontSize: FONTS.size.md,
    color: COLORS.textLight,
    marginRight: SIZES.xs,
  },
  vehicleStatusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.borderRadiusSm,
  },
  vehicleStatusText: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.medium,
    color: COLORS.white,
  },
  temporaryInfo: {
    backgroundColor: COLORS.primaryLight,
    padding: SIZES.sm,
    borderRadius: SIZES.borderRadiusSm,
    marginTop: SIZES.sm,
  },
  temporaryLabel: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.semiBold,
    color: COLORS.primary,
    marginBottom: 2,
  },
  temporaryDates: {
    fontSize: FONTS.size.sm,
    color: COLORS.textDark,
  },
  noVehicleContainer: {
    alignItems: 'center',
    padding: SIZES.md,
  },
  noVehicleText: {
    fontSize: FONTS.size.md,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  requestButton: {
    minWidth: 150,
  },
  actionButtonsContainer: {
    marginBottom: SIZES.lg,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: SIZES.xs,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionText: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
    color: COLORS.textDark,
    textAlign: 'center',
  },
});

export default HomeScreen;