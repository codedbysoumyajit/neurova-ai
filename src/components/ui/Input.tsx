import React from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
          {label}
        </Text>
      )}
      <View
        className={`flex-row items-center bg-white dark:bg-gray-800 border ${
          error ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
        } rounded-xl px-3 py-3 ${className}`}
      >
        {leftIcon && <View className="mr-2">{leftIcon}</View>}
        <TextInput
          className="flex-1 text-base text-gray-900 dark:text-white"
          placeholderTextColor="#9CA3AF"
          {...props}
        />
        {rightIcon && <View className="ml-2">{rightIcon}</View>}
      </View>
      {error && (
        <Text className="text-sm text-red-500 mt-1.5 ml-1">{error}</Text>
      )}
    </View>
  );
}
