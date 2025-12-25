import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface NeoInputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerClassName?: string;
}

export const NeoInput = ({
  label,
  error,
  icon,
  containerClassName = '',
  secureTextEntry,
  ...props
}: NeoInputProps) => {
  const { mode } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const isPassword = secureTextEntry !== undefined;
  
  const shouldBeSecured = secureTextEntry && !isPasswordVisible;

  // Theme-based styles
  const labelColor = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const containerBg = mode === 'dark' ? 'bg-zinc-900' : 'bg-white';
  const borderColor = isFocused 
    ? 'border-blue-500' 
    : error 
      ? (mode === 'dark' ? 'border-red-500/50' : 'border-red-500') 
      : (mode === 'dark' ? 'border-zinc-800' : 'border-zinc-200');
  
  const textColor = mode === 'dark' ? 'text-zinc-100' : 'text-zinc-900';
  const placeholderColor = mode === 'dark' ? '#71717a' : '#94a3b8'; // zinc-500 : slate-400
  const iconColor = mode === 'dark' ? '#71717a' : '#94a3b8';

  return (
    <View className={`w-full mb-4 ${containerClassName}`}>
      {label && (
        <Text className={`${labelColor} text-xs font-sans-medium mb-1.5 ml-1`}>
          {label}
        </Text>
      )}
      
      <View 
        className={`
          flex-row items-center ${containerBg} border rounded-xl px-4 py-3.5
          ${borderColor}
        `}
      >
        {icon && <View className="mr-3">{icon}</View>}
        
        <TextInput
          placeholderTextColor={placeholderColor}
          className={`flex-1 ${textColor} font-sans-medium text-base leading-5 p-0 tracking-tight`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={shouldBeSecured}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity onPress={togglePasswordVisibility} className="ml-2">
            {isPasswordVisible ? (
              <EyeOff size={20} color={iconColor} />
            ) : (
              <Eye size={20} color={iconColor} />
            )}
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text className="text-red-400 text-xs mt-1 ml-1 font-sans">
          {error}
        </Text>
      )}
    </View>
  );
};

