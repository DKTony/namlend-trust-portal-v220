/**
 * Rail Selector -- pure function for intelligent payment rail selection.
 *
 * Ontology: Rule primitive -- governs disbursement/collection rail routing.
 *
 * Scoring factors (0-100 each, weighted):
 *   - Cost efficiency (40%): lower fee = higher score
 *   - Speed (30%): lower latency = higher score
 *   - Availability (20%): currently available = full score
 *   - Reliability (10%): recent health status
 *
 * This is a pure function with no side effects -- suitable for use in
 * mutations without violating Convex's determinism rules.
 */

/**
 * Minimal rail shape needed for selection (avoids importing Convex types).
 */
export interface RailCandidate {
  _id: string;
  railCode: string;
  displayName: string;
  status: string;
  availability: {
    businessHoursOnly: boolean;
    startTime?: string;
    endTime?: string;
    excludeWeekends: boolean;
    excludeHolidays: boolean;
  };
  costModel: {
    fixedFeeNAD?: number;
    percentageFee?: number;
    minFeeNAD?: number;
    maxFeeNAD?: number;
  };
  settlementLatencyMinutes?: number;
  supportedDirections: string[];
  lastHealthStatus?: string;
}

export interface RailSelection {
  railId: string;
  railCode: string;
  displayName: string;
  score: number;
  estimatedFeeNAD: number;
  estimatedLatencyMinutes: number;
  reasoning: string;
}

/**
 * Calculate the fee for a given amount on a rail.
 */
function calculateFee(costModel: RailCandidate['costModel'], amount: number): number {
  const fixedFee = costModel.fixedFeeNAD ?? 0;
  const percentageFee = costModel.percentageFee ? (costModel.percentageFee / 100) * amount : 0;

  let totalFee = fixedFee + percentageFee;

  if (costModel.minFeeNAD && totalFee < costModel.minFeeNAD) {
    totalFee = costModel.minFeeNAD;
  }
  if (costModel.maxFeeNAD && totalFee > costModel.maxFeeNAD) {
    totalFee = costModel.maxFeeNAD;
  }

  return Math.round(totalFee * 100) / 100;
}

/**
 * Check if a rail is currently available based on time-of-day rules.
 * Uses a simple hour check -- does not account for Namibian public holidays.
 */
function isCurrentlyAvailable(availability: RailCandidate['availability'], now: Date): boolean {
  if (!availability.businessHoursOnly) return true;

  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  if (availability.excludeWeekends && (day === 0 || day === 6)) return false;

  if (availability.startTime && availability.endTime) {
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();
    const currentMinutes = hour * 60 + minute;

    const [startH, startM] = availability.startTime.split(':').map(Number);
    const [endH, endM] = availability.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Namibia is UTC+2, but times are stored as local
    // For simplicity, compare directly (rail times should be in UTC)
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) return false;
  }

  return true;
}

/** Default weights — used when no RAIL_WEIGHTS business rule is seeded. */
export const DEFAULT_RAIL_WEIGHTS = { cost: 0.4, speed: 0.3, availability: 0.2, reliability: 0.1 };

export interface RailWeights {
  cost: number;
  speed: number;
  availability: number;
  reliability: number;
}

/**
 * Select the optimal payment rail for a transaction.
 *
 * @param rails - All candidate rails (typically all active rails from DB)
 * @param amount - Transaction amount in NAD
 * @param direction - "disbursement" or "collection"
 * @param preferredRailCode - Optional preferred rail (user/system hint)
 * @param weights - Optional scoring weights (from businessRules); defaults to 0.4/0.3/0.2/0.1
 * @returns Ranked list of rail selections, best first. Empty if none available.
 */
export function selectOptimalRail(
  rails: RailCandidate[],
  amount: number,
  direction: 'disbursement' | 'collection',
  preferredRailCode?: string,
  weights?: RailWeights
): RailSelection[] {
  const now = new Date();

  // Step 1: Filter eligible rails
  const eligible = rails.filter((rail) => {
    // Must be active or degraded (degraded = usable but penalized)
    if (rail.status !== 'active' && rail.status !== 'degraded') return false;

    // Must support this direction
    const supportsDirection = rail.supportedDirections.some((d) => d === direction || d === 'both');
    if (!supportsDirection) return false;

    return true;
  });

  if (eligible.length === 0) return [];

  // Step 2: Score each rail
  const maxLatency = Math.max(
    ...eligible.map((r) => r.settlementLatencyMinutes ?? 1440),
    1 // prevent division by zero
  );
  const maxFee = Math.max(...eligible.map((r) => calculateFee(r.costModel, amount)), 1);

  const scored: RailSelection[] = eligible.map((rail) => {
    const fee = calculateFee(rail.costModel, amount);
    const latency = rail.settlementLatencyMinutes ?? 1440;

    // Cost score: 0-100 (lower fee = higher score)
    const costScore = maxFee > 0 ? ((maxFee - fee) / maxFee) * 100 : 100;

    // Speed score: 0-100 (lower latency = higher score)
    const speedScore = maxLatency > 0 ? ((maxLatency - latency) / maxLatency) * 100 : 100;

    // Availability score: 0 or 100
    const availabilityScore = isCurrentlyAvailable(rail.availability, now) ? 100 : 0;

    // Reliability score: based on health status and rail status
    let reliabilityScore = 50; // default
    if (rail.status === 'active' && rail.lastHealthStatus === 'healthy') {
      reliabilityScore = 100;
    } else if (rail.status === 'active') {
      reliabilityScore = 75;
    } else if (rail.status === 'degraded') {
      reliabilityScore = 25;
    }

    // Weighted total (uses data-driven weights when provided)
    const w = weights ?? DEFAULT_RAIL_WEIGHTS;
    let score =
      costScore * w.cost +
      speedScore * w.speed +
      availabilityScore * w.availability +
      reliabilityScore * w.reliability;

    // Preferred rail bonus (+15 points, capped at 100)
    if (preferredRailCode && rail.railCode === preferredRailCode) {
      score = Math.min(score + 15, 100);
    }

    score = Math.round(score * 10) / 10;

    // Build reasoning
    const reasons: string[] = [];
    if (fee === 0) reasons.push('no fee');
    else reasons.push(`fee N$${fee.toFixed(2)}`);
    if (latency === 0) reasons.push('instant');
    else if (latency < 60) reasons.push(`${latency}min settlement`);
    else reasons.push(`${Math.round(latency / 60)}h settlement`);
    if (availabilityScore === 0) reasons.push('currently unavailable');
    if (rail.status === 'degraded') reasons.push('degraded');
    if (preferredRailCode === rail.railCode) reasons.push('preferred');

    return {
      railId: rail._id,
      railCode: rail.railCode,
      displayName: rail.displayName,
      score,
      estimatedFeeNAD: fee,
      estimatedLatencyMinutes: latency,
      reasoning: reasons.join(', '),
    };
  });

  // Step 3: Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  return scored;
}
