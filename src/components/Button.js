// src/components/Button.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { COLORS, FONTS, SIZES } from '../utils/theme';

const Button = ({
  title,
  onPress,
  type = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon = null,
  style = {},
  textStyle = {},
  iconPosition = 'left',
  ...props
}) => {
  const buttonStyles = [
    styles.button,
    styles[`${type}Button`],
    styles[`${size}Button`],
    disabled && styles.disabledButton,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${type}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={type === 'primary' ? COLORS.white : COLORS.primary}
          size={size === 'small' ? 'small' : 'small'}
        />
      ) : (
        <View style={styles.contentContainer}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          
          <Text style={textStyles}>{title}</Text>
          
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: SIZES.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Button types
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  textButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  dangerButton: {
    backgroundColor: COLORS.danger,
    borderWidth: 0,
  },
  successButton: {
    backgroundColor: COLORS.success,
    borderWidth: 0,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  
  // Button sizes
  smallButton: {
    paddingVertical: SIZES.xs,
    paddingHorizontal: SIZES.md,
    height: SIZES.buttonHeightSm,
  },
  mediumButton: {
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.lg,
    height: SIZES.buttonHeight,
  },
  largeButton: {
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.xl,
    height: SIZES.buttonHeight + SIZES.md,
  },
  
  // Text styles
  text: {
    fontWeight: FONTS.weight.semiBold,
    textAlign: 'center',
  },
  primaryText: {
    color: COLORS.white,
  },
  secondaryText: {
    color: COLORS.primary,
  },
  textText: {
    color: COLORS.primary,
  },
  dangerText: {
    color: COLORS.white,
  },
  successText: {
    color: COLORS.white,
  },
  outlineText: {
    color: COLORS.primary,
  },
  
  // Text sizes
  smallText: {
    fontSize: FONTS.size.sm,
  },
  mediumText: {
    fontSize: FONTS.size.md,
  },
  largeText: {
    fontSize: FONTS.size.lg,
  },
  
  // Disabled state
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
  
  // Icon positioning
  iconLeft: {
    marginRight: SIZES.xs,
  },
  iconRight: {
    marginLeft: SIZES.xs,
  },
});

export default Button;