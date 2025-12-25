import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { NeoCard } from './NeoCard';
import { useTheme } from '../../theme';

interface NeoCurrencyCardProps {
  icon?: LucideIcon;
  label: string;
  primaryValue: string;
  secondaryValue?: string;
  onPress?: () => void;
  className?: string;
  variant?: 'default' | 'elevated' | 'glass' | 'ai';
}

export const NeoCurrencyCard: React.FC<NeoCurrencyCardProps> = ({
  icon: Icon,
  label,
  primaryValue,
  secondaryValue,
  onPress,
  className = '',
  variant = 'glass',
}) => {
  const { mode } = useTheme();
  const Container = onPress ? TouchableOpacity : View;

  const labelColor = mode === 'dark' ? 'text-zinc-500' : 'text-zinc-500';
  const primaryColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const secondaryColor = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  
  const iconBg = mode === 'dark' ? 'bg-zinc-800 border-zinc-700/50' : 'bg-blue-50 border-blue-100';

  return (
    <Container onPress={onPress} className={className}>
      <NeoCard variant={variant} className="min-w-[150px] p-5">
        {Icon && (
          <View className={`mb-4 w-10 h-10 rounded-full items-center justify-center border ${iconBg}`}>
            <Icon size={20} color="#3b82f6" />
          </View>
        )}
        
        <Text className={`${labelColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
          {label}
        </Text>
        
        <Text className={`${primaryColor} text-xl font-sans-bold tracking-tight mb-1`} numberOfLines={1}>
          {primaryValue}
        </Text>
        
        {secondaryValue && (
          <Text className={`${secondaryColor} text-xs font-sans`} numberOfLines={1}>
            {secondaryValue}
          </Text>
        )}
      </NeoCard>
    </Container>
  );
};

