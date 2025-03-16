// src/utils/theme.js - WITHOUT SHADOWS

export const COLORS = {
    // Primary colors
    primary: '#007bff',
    primaryDark: '#0069d9',
    primaryLight: '#e6f2ff',
    
    // Secondary colors
    secondary: '#6c757d',
    secondaryDark: '#5a6268',
    secondaryLight: '#f8f9fa',
    
    // Status colors
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    
    // Neutral colors
    white: '#ffffff',
    black: '#000000',
    gray: '#6c757d',
    lightGray: '#e9ecef',
    darkGray: '#343a40',
    
    // Background colors
    background: '#f5f5f5',
    card: '#ffffff',
    
    // Text colors
    text: '#212529',
    textLight: '#6c757d',
    textDark: '#343a40',
    
    // Border colors
    border: '#ced4da',
    borderLight: '#e9ecef',
    
    // Transparent versions
    transparentPrimary: 'rgba(0, 123, 255, 0.1)',
    transparentBlack: 'rgba(0, 0, 0, 0.5)',
  };
  
  export const FONTS = {
    size: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 24,
      xxxl: 32,
    },
    weight: {
      light: '300',
      regular: '400',
      medium: '500',
      semiBold: '600',
      bold: '700',
    }
  };
  
  export const SIZES = {
    // Padding and margins
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
    
    // Border radius
    borderRadiusSm: 4,
    borderRadius: 8,
    borderRadiusLg: 16,
    
    // Button heights
    buttonHeight: 48,
    buttonHeightSm: 36,
    
    // Input heights
    inputHeight: 48,
    
    // Avatar sizes
    avatarSm: 32,
    avatar: 48,
    avatarLg: 64,
    
    // Icon sizes
    iconSm: 16,
    icon: 24,
    iconLg: 32,
  };
  
  export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  };
  
  export const LAYOUT = {
    // Screen padding
    screenPadding: 16,
    
    // Container widths
    maxContainerWidth: 600,
    
    // Card styles
    cardPadding: 16,
    cardMargin: 8,
  };
  
  // Default export without SHADOWS
  export default {
    COLORS,
    FONTS,
    SIZES,
    SPACING,
    LAYOUT,
  };