import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../theme';

interface NeoButtonProps extends React.ComponentProps<typeof TouchableOpacity> {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

export const NeoButton: React.FC<NeoButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  className = '',
  textClassName = '',
  ...props
}) => {
  const { mode } = useTheme();
  const baseButton = "flex-row items-center justify-center rounded-full active:opacity-80";
  
  const variants = {
    primary: "bg-blue-600 border border-blue-500 shadow-lg shadow-blue-900/20",
    secondary: "bg-zinc-800 border border-zinc-700",
    ghost: "bg-transparent",
    outline: "bg-transparent border border-zinc-700",
    danger: "bg-red-500/10 border border-red-500/50",
    success: "bg-emerald-500/10 border border-emerald-500/50",
  };

  const lightVariants = {
    primary: "bg-blue-600 border border-blue-500 shadow-lg shadow-blue-500/20",
    secondary: "bg-white border border-zinc-200 shadow-sm",
    ghost: "bg-transparent",
    outline: "bg-transparent border border-zinc-300",
    danger: "bg-red-50 border border-red-200",
    success: "bg-emerald-50 border border-emerald-200",
  };

  const sizes = {
    sm: "py-2 px-4",
    md: "py-3.5 px-6",
    lg: "py-4 px-8",
  };

  const textBase = "font-sans-bold text-center tracking-tight";
  
  const textVariants = {
    primary: "text-white",
    secondary: "text-zinc-100",
    ghost: "text-zinc-400",
    outline: "text-zinc-300",
    danger: "text-red-400",
    success: "text-emerald-400",
  };

  const lightTextVariants = {
    primary: "text-white",
    secondary: "text-zinc-800",
    ghost: "text-zinc-500",
    outline: "text-zinc-600",
    danger: "text-red-600",
    success: "text-emerald-600",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const currentVariants = mode === 'dark' ? variants : lightVariants;
  const currentTextVariants = mode === 'dark' ? textVariants : lightTextVariants;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseButton} ${currentVariants[variant]} ${sizes[size]} ${disabled ? 'opacity-50' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? (mode === 'dark' ? '#a1a1aa' : '#71717a') : '#ffffff'} />
      ) : (
        <>
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={`${textBase} ${currentTextVariants[variant]} ${textSizes[size]} ${textClassName}`}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

