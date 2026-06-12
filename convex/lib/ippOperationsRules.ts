export type IppRiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IppRiskDecision = 'pass' | 'alert' | 'block' | 'simulation';

export interface IpsRiskSignals {
  amount: number;
  status?: string;
  errorCode?: string;
  ageMs?: number;
  recentHourCount?: number;
  recentHourAmount?: number;
  hasActiveHandleListing?: boolean;
}

export function dueDaysForIppCase(caseType: string) {
  switch (caseType) {
    case 'tcc':
    case 'ret':
    case 'drc':
    case 'rrc':
      return 1;
    case 'chargeback':
    case 'complaint':
      return 7;
    case 'pre_arbitration':
      return 15;
    case 'arbitration':
    case 'refund':
      return 60;
    default:
      return 7;
  }
}

export function requiresSettlementAdjustmentForIppCase(caseType: string, status: string) {
  if (!['accepted', 'resolved', 'deemed_accepted'].includes(status)) return false;
  return ['refund', 'chargeback', 'ret', 'rrc', 'complaint'].includes(caseType);
}

export function severityForIppRiskScore(score: number): IppRiskSeverity {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function scoreIpsRiskSignals(signals: IpsRiskSignals): {
  score: number;
  severity: IppRiskSeverity;
  decision: IppRiskDecision;
  triggeredRules: string[];
} {
  let score = 0;
  const triggeredRules: string[] = [];

  if (signals.amount >= 9_000) {
    score += 25;
    triggeredRules.push('large-value-near-limit');
  }

  if (signals.status === 'timeout') {
    score += 35;
    triggeredRules.push('timeout-deemed-resolution');
  } else if (signals.status === 'failed' && signals.errorCode) {
    score += 20;
    triggeredRules.push('terminal-failure-code');
  }

  if (
    (signals.status === 'pending' || signals.status === 'processing') &&
    (signals.ageMs ?? 0) > 30 * 60 * 1000
  ) {
    score += 20;
    triggeredRules.push('pending-over-30-minutes');
  }

  if ((signals.recentHourCount ?? 0) >= 5) {
    score += 30;
    triggeredRules.push('velocity-count-hour');
  }

  if ((signals.recentHourAmount ?? 0) >= 20_000) {
    score += 20;
    triggeredRules.push('velocity-amount-hour');
  }

  if (signals.hasActiveHandleListing) {
    score += 100;
    triggeredRules.push('active-handle-listing');
  }

  const severity = severityForIppRiskScore(score);
  const decision =
    score >= 80 ? 'block' : score >= 35 ? 'alert' : score >= 20 ? 'simulation' : 'pass';
  return { score, severity, decision, triggeredRules };
}
