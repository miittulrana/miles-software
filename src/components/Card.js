// src/components/Card.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../utils/theme';

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
  
  // Elevation styles
  noneElevation: {
    ...SHADOWS.none,
  },
  smallElevation: {
    ...SHADOWS.small,
  },
  mediumElevation: {
    ...SHADOWS.medium,
  },
  largeElevation: {
    ...SHADOWS.large,
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