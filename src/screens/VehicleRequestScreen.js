// src/screens/VehicleRequestScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../utils/theme';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';

const VehicleRequestScreen = ({ navigation }) => {
  const { user, refreshVehicle } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestHistory, setRequestHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
  });
  
  // Form validation
  const [errors, setErrors] = useState({});

  // Load data when component mounts
  useEffect(() => {
    fetchVehicles();
    fetchRequestHistory();
  }, []);

  // Fetch available vehicles
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model, status')
        .eq('status', 'available')
        .order('registration_number');
        
      if (error) throw error;
      
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      Alert.alert('Error', 'Failed to load available vehicles.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch request history
  const fetchRequestHistory = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('vehicle_assignments')
        .select(`
          id,
          vehicle_id,
          start_time,
          end_time,
          notes,
          status,
          created_at,
          admin_notes,
          vehicles:vehicle_id (registration_number, make, model)
        `)
        .eq('driver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      setRequestHistory(data || []);
    } catch (error) {
      console.error('Error fetching request history:', error);
    }
  };

  // Handle form input change
  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    const today = new Date().toISOString().split('T')[0];
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else if (formData.startDate < today) {
      newErrors.startDate = 'Start date cannot be in the past';
    }
    
    if (formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Check if user exists
      if (!user) {
        Alert.alert('Error', 'User not authenticated. Please log in again.');
        return;
      }
      
      // Create the assignment request
      const { error } = await supabase
        .from('vehicle_assignments')
        .insert({
          driver_id: user.id,
          start_time: new Date(formData.startDate).toISOString(),
          end_time: formData.endDate ? new Date(formData.endDate).toISOString() : null,
          notes: formData.notes.trim(),
          is_temporary: true,
          status: 'pending',
        });
        
      if (error) throw error;
      
      // Success
      Alert.alert(
        'Request Submitted',
        'Your vehicle request has been submitted successfully and is awaiting approval.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      
      // Refresh vehicle data in context
      refreshVehicle();
      
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit vehicle request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel a pending request
  const cancelRequest = async (requestId) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('vehicle_assignments')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('driver_id', user.id)
        .eq('status', 'pending');
        
      if (error) throw error;
      
      // Refresh history
      await fetchRequestHistory();
      
      Alert.alert('Success', 'Request cancelled successfully');
    } catch (error) {
      console.error('Error cancelling request:', error);
      Alert.alert('Error', 'Failed to cancel request');
    } finally {
      setLoading(false);
    }
  };

  // Confirm cancellation
  const confirmCancelRequest = (requestId) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this vehicle request?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: () => cancelRequest(requestId) }
      ]
    );
  };

  // Get status badge style
  const getStatusBadgeStyle = (status) => {
    let backgroundColor;
    
    switch (status) {
      case 'approved':
        backgroundColor = COLORS.success;
        break;
      case 'pending':
        backgroundColor = COLORS.warning;
        break;
      case 'rejected':
        backgroundColor = COLORS.danger;
        break;
      case 'cancelled':
        backgroundColor = COLORS.secondary;
        break;
      default:
        backgroundColor = COLORS.secondary;
    }
    
    return {
      ...styles.statusBadge,
      backgroundColor,
    };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Card style={styles.formCard}>
        <Text style={styles.title}>Request a Vehicle</Text>
        <Text style={styles.description}>
          Fill out the form below to request a temporary vehicle assignment.
          Your request will be reviewed by an administrator.
        </Text>
        
        {/* Start Date */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Start Date*</Text>
          <Input
            placeholder="Select start date"
            value={formData.startDate}
            onChangeText={(value) => handleInputChange('startDate', value)}
            error={errors.startDate}
            style={styles.input}
          />
        </View>
        
        {/* End Date */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>End Date (Optional)</Text>
          <Text style={styles.helperText}>
            Leave blank for indefinite requests
          </Text>
          <Input
            placeholder="Select end date"
            value={formData.endDate}
            onChangeText={(value) => handleInputChange('endDate', value)}
            error={errors.endDate}
            style={styles.input}
          />
        </View>
        
        {/* Notes */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Reason for Request</Text>
          <Input
            placeholder="Provide a reason for your request"
            value={formData.notes}
            onChangeText={(value) => handleInputChange('notes', value)}
            multiline
            numberOfLines={4}
            style={styles.input}
          />
        </View>
        
        {/* Submit Button */}
        <Button
          title="Submit Request"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          style={styles.submitButton}
        />
      </Card>
      
      {/* Request History */}
      <TouchableOpacity
        style={styles.historyHeader}
        onPress={() => setShowHistory(!showHistory)}
        activeOpacity={0.7}
      >
        <Text style={styles.historyHeaderText}>
          {showHistory ? 'Hide Request History' : 'Show Request History'}
        </Text>
        <Text style={styles.historyHeaderIcon}>
          {showHistory ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      
      {showHistory && (
        <Card style={styles.historyCard}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
          ) : requestHistory.length === 0 ? (
            <Text style={styles.noHistoryText}>
              No request history found
            </Text>
          ) : (
            requestHistory.map((request) => (
              <View key={request.id} style={styles.historyItem}>
                <View style={styles.historyItemHeader}>
                  <Text style={styles.historyItemTitle}>
                    {request.vehicles?.registration_number || 'Unknown Vehicle'}
                  </Text>
                  <View style={getStatusBadgeStyle(request.status)}>
                    <Text style={styles.statusBadgeText}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.historyItemSubtitle}>
                  {request.vehicles?.make} {request.vehicles?.model}
                </Text>
                
                <View style={styles.historyItemDetails}>
                  <Text style={styles.historyItemDetailText}>
                    <Text style={styles.historyItemDetailLabel}>Period: </Text>
                    {formatDate(request.start_time)} - {request.end_time ? formatDate(request.end_time) : 'Indefinite'}
                  </Text>
                  
                  <Text style={styles.historyItemDetailText}>
                    <Text style={styles.historyItemDetailLabel}>Requested: </Text>
                    {formatDate(request.created_at)}
                  </Text>
                </View>
                
                {request.notes && (
                  <Text style={styles.historyItemNotes}>
                    <Text style={styles.historyItemDetailLabel}>Notes: </Text>
                    {request.notes}
                  </Text>
                )}
                
                {request.admin_notes && (
                  <Text style={styles.historyItemAdminNotes}>
                    <Text style={styles.historyItemDetailLabel}>Admin Response: </Text>
                    {request.admin_notes}
                  </Text>
                )}
                
                {request.status === 'pending' && (
                  <Button
                    title="Cancel Request"
                    onPress={() => confirmCancelRequest(request.id)}
                    type="danger"
                    size="small"
                    style={styles.cancelButton}
                  />
                )}
              </View>
            ))
          )}
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SIZES.md,
  },
  formCard: {
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.bold,
    color: COLORS.textDark,
    marginBottom: SIZES.sm,
  },
  description: {
    fontSize: FONTS.size.md,
    color: COLORS.textLight,
    marginBottom: SIZES.lg,
  },
  inputContainer: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
    color: COLORS.textDark,
    marginBottom: SIZES.xs,
  },
  helperText: {
    fontSize: FONTS.size.sm,
    color: COLORS.textLight,
    marginBottom: SIZES.xs,
  },
  input: {
    backgroundColor: COLORS.white,
  },
  submitButton: {
    marginTop: SIZES.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.sm,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.borderRadius,
    marginBottom: SIZES.sm,
    ...SHADOWS.small,
  },
  historyHeaderText: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.semiBold,
    color: COLORS.primary,
  },
  historyHeaderIcon: {
    fontSize: FONTS.size.md,
    color: COLORS.primary,
  },
  historyCard: {
    marginBottom: SIZES.lg,
  },
  loader: {
    marginVertical: SIZES.xl,
  },
  noHistoryText: {
    fontSize: FONTS.size.md,
    color: COLORS.textLight,
    textAlign: 'center',
    padding: SIZES.lg,
  },
  historyItem: {
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  historyItem: {
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  historyItemTitle: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.semiBold,
    color: COLORS.textDark,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.borderRadiusSm,
  },
  statusBadgeText: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.medium,
    color: COLORS.white,
  },
  historyItemSubtitle: {
    fontSize: FONTS.size.md,
    color: COLORS.textLight,
    marginBottom: SIZES.sm,
  },
  historyItemDetails: {
    marginBottom: SIZES.sm,
  },
  historyItemDetailText: {
    fontSize: FONTS.size.md,
    color: COLORS.textDark,
    marginBottom: 2,
  },
  historyItemDetailLabel: {
    fontWeight: FONTS.weight.semiBold,
  },
  historyItemNotes: {
    fontSize: FONTS.size.md,
    color: COLORS.textDark,
    marginBottom: SIZES.sm,
  },
  historyItemAdminNotes: {
    fontSize: FONTS.size.md,
    color: COLORS.textDark,
    padding: SIZES.sm,
    backgroundColor: COLORS.secondaryLight,
    borderRadius: SIZES.borderRadiusSm,
    marginBottom: SIZES.sm,
  },
  cancelButton: {
    alignSelf: 'flex-start',
  },
});

export default VehicleRequestScreen;