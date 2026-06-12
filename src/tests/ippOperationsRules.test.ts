import { describe, expect, it } from 'vitest';
import {
  dueDaysForIppCase,
  requiresSettlementAdjustmentForIppCase,
  scoreIpsRiskSignals,
  severityForIppRiskScore,
} from '../../convex/lib/ippOperationsRules';

describe('ippOperationsRules', () => {
  it('maps scheme dispute families to operational response windows', () => {
    expect(dueDaysForIppCase('tcc')).toBe(1);
    expect(dueDaysForIppCase('ret')).toBe(1);
    expect(dueDaysForIppCase('chargeback')).toBe(7);
    expect(dueDaysForIppCase('pre_arbitration')).toBe(15);
    expect(dueDaysForIppCase('arbitration')).toBe(60);
  });

  it('only creates settlement adjustments for accepted money-movement cases', () => {
    expect(requiresSettlementAdjustmentForIppCase('chargeback', 'accepted')).toBe(true);
    expect(requiresSettlementAdjustmentForIppCase('refund', 'resolved')).toBe(true);
    expect(requiresSettlementAdjustmentForIppCase('rrc', 'deemed_accepted')).toBe(true);
    expect(requiresSettlementAdjustmentForIppCase('chargeback', 'opened')).toBe(false);
    expect(requiresSettlementAdjustmentForIppCase('arbitration', 'accepted')).toBe(false);
  });

  it('scores fraud signals into alert and block decisions', () => {
    const alert = scoreIpsRiskSignals({
      amount: 9_500,
      status: 'pending',
      ageMs: 31 * 60 * 1000,
    });
    expect(alert.decision).toBe('alert');
    expect(alert.triggeredRules).toEqual(['large-value-near-limit', 'pending-over-30-minutes']);

    const block = scoreIpsRiskSignals({
      amount: 100,
      status: 'failed',
      errorCode: 'Z9',
      recentHourCount: 5,
      recentHourAmount: 25_000,
      hasActiveHandleListing: true,
    });
    expect(block.decision).toBe('block');
    expect(block.severity).toBe('critical');
    expect(block.triggeredRules).toContain('active-handle-listing');
  });

  it('keeps score severity thresholds stable for operations dashboards', () => {
    expect(severityForIppRiskScore(19)).toBe('low');
    expect(severityForIppRiskScore(35)).toBe('medium');
    expect(severityForIppRiskScore(60)).toBe('high');
    expect(severityForIppRiskScore(80)).toBe('critical');
  });
});
