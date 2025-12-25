/**
 * Loan Calculator Screen
 * Version: v2.7.0 - Neo-Fintech Design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Calculator, Info, DollarSign, Calendar, Percent } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { formatNAD } from '../../utils/currency';
import { NeoCard } from '../../components/neo/NeoCard';
import { NeoInput } from '../../components/neo/NeoInput';
import { NeoCurrencyCard } from '../../components/neo/NeoCurrencyCard';
import { AmbientGlow } from '../../components/neo/AmbientGlow';

const MAX_APR = 0.32; // 32% APR limit for Namibia

const LoanCalculatorScreen: React.FC = () => {
  const { colors, mode } = useTheme();
  const [amount, setAmount] = useState('10000');
  const [months, setMonths] = useState('3');
  const [apr, setApr] = useState('28');

  const calculateLoan = () => {
    const principal = parseFloat(amount) || 0;
    const termMonths = parseInt(months) || 1;
    const annualRate = Math.min(parseFloat(apr) || 0, 32) / 100;
    const monthlyRate = annualRate / 12;

    // Calculate monthly payment using amortization formula
    const monthlyPayment =
      principal *
      (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    const totalRepayment = monthlyPayment * termMonths;
    const totalInterest = totalRepayment - principal;

    return {
      monthlyPayment: isFinite(monthlyPayment) ? monthlyPayment : 0,
      totalRepayment: isFinite(totalRepayment) ? totalRepayment : 0,
      totalInterest: isFinite(totalInterest) ? totalInterest : 0,
    };
  };

  const results = calculateLoan();

  // Theme styles
  const containerBg = mode === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50';
  const textColor = mode === 'dark' ? 'text-white' : 'text-zinc-900';
  const subTextColor = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
  const iconBg = mode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200';
  const iconColor = mode === 'dark' ? '#71717a' : '#9ca3af';
  const termActiveBg = 'bg-blue-600 border-blue-500';
  const termInactiveBg = mode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';
  const termActiveText = 'text-white';
  const termInactiveText = mode === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
  const resultsCardBg = mode === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200';

  return (
    <View className={`flex-1 ${containerBg}`}>
      {mode === 'dark' && <AmbientGlow position="top" />}
      
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        {/* Header */}
        <View className="items-center mb-8 mt-4">
          <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 border shadow-lg shadow-black/10 ${iconBg}`}>
            <Calculator size={32} color="#3b82f6" />
          </View>
          <Text className={`${textColor} text-3xl font-sans-bold tracking-tight mb-1`}>
            Loan Calculator
          </Text>
          <Text className={`${subTextColor} text-sm font-sans`}>
            Calculate your loan estimates
          </Text>
        </View>

        {/* APR Warning */}
        <View className={`bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-8 flex-row items-start`}>
          <Info size={20} color="#f59e0b" />
          <View className="ml-3 flex-1">
            <Text className="text-yellow-500 text-sm font-sans-bold mb-1">
              APR Limit: 32%
            </Text>
            <Text className={`${mode === 'dark' ? 'text-yellow-500/80' : 'text-yellow-600'} text-xs font-sans leading-5`}>
              Namibian law limits APR to 32% maximum. This calculator enforces that limit.
            </Text>
          </View>
        </View>

        {/* Input Form */}
        <NeoCard variant="glass" className="mb-8 p-5">
          <View className="mb-6">
            <NeoInput
              label="LOAN AMOUNT (NAD)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="10000"
              icon={<DollarSign size={20} color={iconColor} />}
            />
          </View>

          <View className="mb-6">
            <Text className={`${subTextColor} text-xs font-sans-medium mb-3 ml-1 uppercase tracking-wide`}>
              LOAN TERM (MONTHS)
            </Text>
            <View className="flex-row gap-2">
              {[1, 3, 5].map((m) => {
                const active = months === String(m);
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMonths(String(m))}
                    className={`flex-1 py-3 px-2 rounded-xl border ${
                      active ? termActiveBg : termInactiveBg
                    }`}
                  >
                    <Text className={`text-center font-sans-bold ${
                      active ? termActiveText : termInactiveText
                    }`}>
                      {m} {m === 1 ? 'Month' : 'Months'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text className={`${mode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'} text-[10px] mt-2 ml-1 font-sans`}>
              Allowed terms: 1, 3, or 5 months
            </Text>
          </View>

          <View>
            <NeoInput
              label="APR (%) - MAX 32%"
              value={apr}
              onChangeText={(value) => {
                const numValue = parseFloat(value) || 0;
                setApr(Math.min(numValue, 32).toString());
              }}
              keyboardType="numeric"
              placeholder="28"
              icon={<Percent size={20} color={iconColor} />}
            />
          </View>
        </NeoCard>

        {/* Results */}
        <View className="mb-8">
          <Text className={`${textColor} text-lg font-sans-bold tracking-tight mb-4`}>
            Estimated Results
          </Text>

          <View className="flex-row gap-4 mb-4">
            <View className="flex-1">
              <NeoCurrencyCard
                label="MONTHLY PAYMENT"
                primaryValue={formatNAD(results.monthlyPayment)}
                secondaryValue="Per month"
                variant="glass"
              />
            </View>
            <View className="flex-1">
              <NeoCurrencyCard
                label="TOTAL INTEREST"
                primaryValue={formatNAD(results.totalInterest)}
                secondaryValue={`${apr}% APR`}
                variant="glass"
              />
            </View>
          </View>

          <NeoCard className={`${resultsCardBg} flex-row justify-between items-center py-5 px-5`}>
            <Text className={`${subTextColor} text-sm font-sans-medium`}>Total Repayment</Text>
            <Text className="text-blue-500 font-sans-bold text-xl tracking-tight">{formatNAD(results.totalRepayment)}</Text>
          </NeoCard>
        </View>

        {/* Info Note */}
        <Text className={`${mode === 'dark' ? 'text-zinc-600' : 'text-zinc-400'} text-xs text-center px-4 leading-5 font-sans`}>
          These are estimates only. Actual loan terms may vary based on your credit profile
          and income verification.
        </Text>
      </ScrollView>
    </View>
  );
};

export default LoanCalculatorScreen;


