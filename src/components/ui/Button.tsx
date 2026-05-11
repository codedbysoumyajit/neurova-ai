import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle = "flex-row items-center justify-center rounded-xl active:opacity-80";
  
  const variants = {
    primary: "bg-primary dark:bg-primary-dark",
    secondary: "bg-gray-200 dark:bg-gray-800",
    outline: "border-2 border-primary dark:border-primary-dark bg-transparent",
    ghost: "bg-transparent",
  };

  const sizes = {
    sm: "px-3 py-1.5",
    md: "px-4 py-3",
    lg: "px-6 py-4",
  };

  const textVariants = {
    primary: "text-white font-semibold",
    secondary: "text-gray-900 dark:text-white font-semibold",
    outline: "text-primary dark:text-primary-dark font-semibold",
    ghost: "text-primary dark:text-primary-dark font-semibold",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <TouchableOpacity
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${disabled || isLoading ? 'opacity-50' : ''} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#0066FF'} />
      ) : (
        <>
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={`${textVariants[variant]} ${textSizes[size]}`}>
            {children}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
