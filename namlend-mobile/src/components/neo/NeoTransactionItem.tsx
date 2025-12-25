import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface NeoTransactionItemProps {
  title: string;
  subtitle?: string;
  amount: number;
  type: 'income' | 'expense';
  icon?: LucideIcon;
  currency?: string;
  onPress?: () => void;
  className?: string;
}

export const NeoTransactionItem: React.FC<NeoTransactionItemProps> = ({
  title,
  subtitle,
  amount,
  type,
  icon: Icon,
  currency = 'N$',
  onPress,
  className = '',
}) => {
  const { mode } = useTheme();
  const IconComponent = Icon || (type === 'income' ? ArrowUpRight : ArrowDownLeft);
  const isIncome = type === 'income';
  
  const iconBgColor = isIncome 
    ? (mode === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50') 
    : (mode === 'dark' ? 'bg-red-500/10' : 'bg-red-50');
    
  const iconColor = isIncome 
    ? (mode === 'dark' ? '#10b981' : '#059669') 
    : (mode === 'dark' ? '#ef4444' : '#dc2626');
    
  const amountColor = isIncome 
    ? (mode === 'dark' ? 'text-emerald-500' : 'text-emerald-600') 
    : (mode === 'dark' ? 'text-zinc-100' : 'text-zinc-900');

  const titleColor = mode === 'dark' ? 'text-zinc-100' : 'text-zinc-900';
  const subtitleColor = mode === 'dark' ? 'text-zinc-500' : 'text-zinc-500';
  const borderColor = mode === 'dark' ? 'border-zinc-800' : 'border-zinc-100';

  const formatAmount = (value: number): string => {
    const formatted = Math.abs(value).toLocaleString('en-NA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return isIncome ? `+${formatted}` : `-${formatted}`;
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container 
      onPress={onPress}
      className={`flex-row items-center py-4 border-b ${borderColor} ${className}`}
    >
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${iconBgColor}`}>
        <IconComponent size={20} color={iconColor} />
      </View>

      <View className="flex-1 mr-4">
        <Text className={`${titleColor} text-sm font-sans-medium mb-0.5`} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text className={`${subtitleColor} text-xs font-sans`} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <Text className={`${amountColor} text-sm font-sans-bold tracking-tight`}>
        {currency} {formatAmount(amount)}
      </Text>
    </Container>
  );
};

