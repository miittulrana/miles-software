// src/components/Card.js - WITH INLINE SHADOWS
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SIZES } from '../utils/theme';

const Card = ({
  children,
  onPress,
  style = {},
  contentStyle = {},
  elevation = 'small',
  padding = 'medium',
  margin = 'small',
  borderRadius = 'medium',
  ...props
}) => {
  const containerStyle = [
    styles.container,
    styles[`${elevation}Elevation`],
    styles[`${padding}Padding`],
    styles[`${margin}Margin`],
    styles[`${borderRadius}Radius`],
    style,
  ];

  const content = (
    <View style={[styles.content, contentStyle]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.8}
        {...props}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle} {...props}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  content: {
    width: '100%',
  },
  
  // Elevation styles with inline shadow definitions
  noneElevation: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  smallElevation: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  mediumElevation: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  largeElevation: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  
  // Padding styles
  smallPadding: {
    padding: SIZES.sm,
  },
  mediumPadding: {
    padding: SIZES.md,
  },
  largePadding: {
    padding: SIZES.lg,
  },
  nonePadding: {
    padding: 0,
  },
  
  // Margin styles
  smallMargin: {
    margin: SIZES.sm,
  },
  mediumMargin: {
    margin: SIZES.md,
  },
  largeMargin: {
    margin: SIZES.lg,
  },
  noneMargin: {
    margin: 0,
  },
  
  // Border radius styles
  smallRadius: {
    borderRadius: SIZES.borderRadiusSm,
  },
  mediumRadius: {
    borderRadius: SIZES.borderRadius,
  },
  largeRadius: {
    borderRadius: SIZES.borderRadiusLg,
  },
  noneRadius: {
    borderRadius: 0,
  },
});

export default Card;