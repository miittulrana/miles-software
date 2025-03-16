// src/utils/helpers.js

// Format date to display in user-friendly format
export const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format date with time
  export const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format time only
  export const formatTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status color
  export const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#28a745'; // green
      case 'pending':
        return '#ffc107'; // yellow
      case 'rejected':
        return '#dc3545'; // red
      case 'cancelled':
        return '#6c757d'; // gray
      case 'active':
        return '#28a745'; // green
      case 'completed':
        return '#17a2b8'; // teal
      case 'available':
        return '#28a745'; // green
      case 'assigned':
        return '#007bff'; // blue
      case 'maintenance':
        return '#ffc107'; // yellow
      case 'inactive':
        return '#6c757d'; // gray
      default:
        return '#6c757d'; // gray
    }
  };
  
  // Validate email format
  export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };
  
  // Calculate days between two dates
  export const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Get initials from name
  export const getInitials = (name) => {
    if (!name) return '?';
    
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Truncate text if too long
  export const truncateText = (text, maxLength = 30) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
  };
  
  // Format a priority level
  export const formatPriority = (priority) => {
    switch (priority) {
      case 'high':
        return { text: 'High', color: '#dc3545' }; // red
      case 'medium':
        return { text: 'Medium', color: '#ffc107' }; // yellow
      case 'low':
        return { text: 'Low', color: '#17a2b8' }; // teal
      default:
        return { text: priority || 'Normal', color: '#6c757d' }; // gray
    }
  };
  
  // Get document type display text
  export const getDocumentTypeText = (type) => {
    switch (type) {
      case 'registration':
        return 'Registration';
      case 'insurance':
        return 'Insurance';
      case 'maintenance':
        return 'Maintenance Record';
      case 'inspection':
        return 'Inspection Certificate';
      case 'license':
        return 'Driver\'s License';
      case 'id_card':
        return 'ID Card';
      case 'other':
        return 'Other';
      default:
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown';
    }
  };
  
  // Generate random ID
  export const generateId = (prefix = 'id') => {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
  };