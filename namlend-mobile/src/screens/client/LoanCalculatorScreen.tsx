/**
 * Loan Calculator Screen
 * Version: v2.7.0 - Perpetio-inspired redesign
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Calculator, Info } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { formatNAD } from '../../utils/currency';
import { CurrencyCard } from '../../components/ui';

const MAX_APR = 0.32; // 32% APR limit for Namibia

const LoanCalculatorScreen: React.FC = () => {
  const { colors, tokens } = useTheme();
  const [amount, setAmount] = useState('10000');
  const [months, setMonths] = useState('12');
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: tokens.spacing.base }]}>
        <Calculator size={32} color={colors.primary} />
        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
              fontSize: tokens.typography.h1.fontSize,
              fontWeight: tokens.typography.h1.fontWeight,
              marginTop: tokens.spacing.sm,
            },
          ]}
        >
          Loan Calculator
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textSecondary,
              fontSize: tokens.typography.body.fontSize,
              marginTop: tokens.spacing.xs,
            },
          ]}
        >
          Calculate your loan estimates
        </Text>
      </View>

      {/* APR Warning */}
      <View
        style={[
          styles.warningCard,
          {
            backgroundColor: `${colors.warning}1A`,
            borderRadius: tokens.radius.md,
            padding: tokens.spacing.base,
            marginHorizontal: tokens.spacing.base,
            marginBottom: tokens.spacing.lg,
          },
        ]}
      >
        <View style={styles.warningHeader}>
          <Info size={20} color={colors.warning} />
          <Text
            style={[
              styles.warningTitle,
              { color: colors.warning, fontSize: tokens.typography.bodyMedium.fontSize },
            ]}
          >
            APR Limit: 32%
          </Text>
        </View>
        <Text
          style={[
            styles.warningText,
            { color: colors.textSecondary, fontSize: tokens.typography.caption.fontSize },
          ]}
        >
          Namibian law limits APR to 32% maximum. This calculator enforces that limit.
        </Text>
      </View>

      {/* Input Form */}
      <View style={[styles.form, { paddingHorizontal: tokens.spacing.base }]}>
        {/* Loan Amount */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              {
                color: colors.textPrimary,
                fontSize: tokens.typography.body.fontSize,
                marginBottom: tokens.spacing.xs,
              },
            ]}
          >
            Loan Amount (NAD)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.divider,
                color: colors.textPrimary,
                borderRadius: tokens.radius.sm,
                padding: tokens.spacing.md,
              },
            ]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="10000"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Loan Term */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              {
                color: colors.textPrimary,
                fontSize: tokens.typography.body.fontSize,
                marginBottom: tokens.spacing.xs,
              },
            ]}
          >
            Loan Term (Months)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.divider,
                color: colors.textPrimary,
                borderRadius: tokens.radius.sm,
                padding: tokens.spacing.md,
              },
            ]}
            value={months}
            onChangeText={setMonths}
            keyboardType="numeric"
            placeholder="12"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* APR */}
        <View style={styles.inputGroup}>
          <Text
            style={[
              styles.label,
              {
                color: colors.textPrimary,
                fontSize: tokens.typography.body.fontSize,
                marginBottom: tokens.spacing.xs,
              },
            ]}
          >
            APR (%) - Max 32%
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.divider,
                color: colors.textPrimary,
                borderRadius: tokens.radius.sm,
                padding: tokens.spacing.md,
              },
            ]}
            value={apr}
            onChangeText={(value) => {
              const numValue = parseFloat(value) || 0;
              setApr(Math.min(numValue, 32).toString());
            }}
            keyboardType="numeric"
            placeholder="28"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </View>

      {/* Results */}
      <View style={[styles.results, { paddingHorizontal: tokens.spacing.base }]}>
        <Text
          style={[
            styles.resultsTitle,
            {
              color: colors.textPrimary,
              fontSize: tokens.typography.h2.fontSize,
              fontWeight: tokens.typography.h2.fontWeight,
              marginBottom: tokens.spacing.base,
            },
          ]}
        >
          Estimated Results
        </Text>

        <CurrencyCard
          label="Monthly Payment"
          primaryValue={formatNAD(results.monthlyPayment)}
          secondaryValue="Per month"
          style={{ marginBottom: tokens.spacing.base }}
        />

        <CurrencyCard
          label="Total Repayment"
          primaryValue={formatNAD(results.totalRepayment)}
          secondaryValue={`Over ${months} months`}
          style={{ marginBottom: tokens.spacing.base }}
        />

        <CurrencyCard
          label="Total Interest"
          primaryValue={formatNAD(results.totalInterest)}
          secondaryValue={`${apr}% APR`}
          style={{ marginBottom: tokens.spacing.base }}
        />
      </View>

      {/* Info Note */}
      <View style={[styles.noteCard, { paddingHorizontal: tokens.spacing.base }]}>
        <Text
          style={[
            styles.noteText,
            {
              color: colors.textTertiary,
              fontSize: tokens.typography.caption.fontSize,
              textAlign: 'center',
            },
          ]}
        >
          These are estimates only. Actual loan terms may vary based on your credit profile
          and income verification.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  warningCard: {
    // Styles applied inline with theme
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    marginLeft: 8,
    fontWeight: '600',
  },
  warningText: {
    marginLeft: 28,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
  },
  results: {
    marginBottom: 24,
  },
  resultsTitle: {
    // Styles applied inline with theme
  },
  noteCard: {
    marginBottom: 32,
  },
  noteText: {
    lineHeight: 20,
  },
});

export default LoanCalculatorScreen;
