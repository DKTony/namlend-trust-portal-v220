import React from 'react';
import { View, Text } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { NeoCard } from './NeoCard';
import { useTheme } from '../../theme';

interface NeoBalanceCardProps {
  amount: number;
  label: string;
  currency?: string;
  subtitle?: string;
  className?: string;
}

export const NeoBalanceCard: React.FC<NeoBalanceCardProps> = ({
  amount,
  label,
  currency = 'N$',
  subtitle,
  className = '',
}) => {
  const { mode } = useTheme();
  
  const formatAmount = (value: number): string => {
    return value.toLocaleString('en-NA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const labelColor = mode === 'dark' ? 'text-zinc-500' : 'text-zinc-500';
  const subtitleColor = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const currencyColor = mode === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  const amountColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';

  return (
    <NeoCard 
      variant="glass" 
      intensity={mode === 'dark' ? 40 : 80}
      className={`min-h-[160px] justify-between overflow-hidden relative ${className}`}
    >
      {/* Watermark Icon */}
      <View className="absolute -right-4 -bottom-8 opacity-5 z-0">
        <Wallet size={120} color="#3b82f6" />
      </View>

      <View className="z-10">
        <Text className={`${labelColor} text-xs font-sans-medium tracking-wider uppercase mb-1`}>
          {label}
        </Text>
        {subtitle && (
          <Text className={`${subtitleColor} text-xs font-sans tracking-wide`}>
            {subtitle}
          </Text>
        )}
      </View>
      
      <View className="z-10">
        <View className="flex-row items-baseline">
          <Text className={`${currencyColor} text-xl font-sans-medium mr-1`}>
            {currency}
          </Text>
          <Text className={`${amountColor} text-4xl font-sans-bold tracking-tighter`}>
            {formatAmount(amount)}
          </Text>
        </View>
      </View>
    </NeoCard>
  );
};

