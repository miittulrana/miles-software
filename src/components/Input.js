// src/components/Input.js
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SIZES } from '../utils/theme';

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  error = null,
  multiline = false,
  numberOfLines = 1,
  icon = null,
  iconPosition = 'right',
  onIconPress = null,
  disabled = false,
  style = {},
  inputStyle = {},
  labelStyle = {},
  errorStyle = {},
  autoCapitalize = 'none',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
        </Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focusedInput,
          error && styles.errorInput,
          disabled && styles.disabledInput,
          multiline && styles.multilineInput,
        ]}
      >
        {icon && iconPosition === 'left' && (
          <View style={styles.iconLeft}>
            {icon}
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            iconPosition === 'left' && styles.inputWithLeftIcon,
            iconPosition === 'right' && styles.inputWithRightIcon,
            secureTextEntry && styles.secureInput,
            multiline && styles.multilineTextInput,
            inputStyle,
          ]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          autoCapitalize={autoCapitalize}
          placeholderTextColor={COLORS.textLight}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={togglePasswordVisibility}
            activeOpacity={0.7}
          >
            <Text style={styles.passwordToggle}>
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
        
        {icon && iconPosition === 'right' && !secureTextEntry && (
          <TouchableOpacity 
            style={styles.iconRight}
            onPress={onIconPress}
            disabled={!onIconPress}
            activeOpacity={onIconPress ? 0.7 : 1}
          >
            {icon}
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={[styles.errorText, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.medium,
    color: COLORS.textDark,
    marginBottom: SIZES.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.white,
    height: SIZES.inputHeight,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: SIZES.md,
    fontSize: FONTS.size.md,
    color: COLORS.text,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  secureInput: {
    paddingRight: 0,
  },
  iconLeft: {
    paddingLeft: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRight: {
    paddingRight: SIZES.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordToggle: {
    color: COLORS.primary,
    fontSize: FONTS.size.sm,
  },
  focusedInput: {
    borderColor: COLORS.primary,
  },
  errorInput: {
    borderColor: COLORS.danger,
  },
  disabledInput: {
    backgroundColor: COLORS.lightGray,
    opacity: 0.7,
  },
  errorText: {
    fontSize: FONTS.size.sm,
    color: COLORS.danger,
    marginTop: SIZES.xs,
  },
  multilineInput: {
    height: null,
    minHeight: SIZES.inputHeight,
  },
  multilineTextInput: {
    textAlignVertical: 'top',
    paddingTop: SIZES.sm,
    paddingBottom: SIZES.sm,
  },
});

export default Input;