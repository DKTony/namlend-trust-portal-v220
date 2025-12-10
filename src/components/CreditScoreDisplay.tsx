/**
 * Credit Score Display Component
 * Visual representation of AI credit scoring results
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Lightbulb,
  DollarSign,
  Percent,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import {
  calculateCreditScore,
  getLoanRecommendation,
  CREDIT_SCORE_RANGES,
  type CreditFactors,
  type CreditScore,
  type LoanRecommendation
} from '@/services/creditScoring';
import { formatNAD } from '@/utils/currency';
import { cn } from '@/lib/utils';

interface CreditScoreDisplayProps {
  factors: CreditFactors;
  showRecommendation?: boolean;
  onRefresh?: () => void;
  compact?: boolean;
}

const SCORE_COLORS: Record<string, string> = {
  EXCELLENT: 'text-green-600',
  GOOD: 'text-blue-600',
  FAIR: 'text-yellow-600',
  POOR: 'text-red-600'
};

const SCORE_BG_COLORS: Record<string, string> = {
  EXCELLENT: 'bg-green-500',
  GOOD: 'bg-blue-500',
  FAIR: 'bg-yellow-500',
  POOR: 'bg-red-500'
};

export function CreditScoreDisplay({
  factors,
  showRecommendation = true,
  onRefresh,
  compact = false
}: CreditScoreDisplayProps) {
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<CreditScore | null>(null);
  const [recommendation, setRecommendation] = useState<LoanRecommendation | null>(null);

  useEffect(() => {
    calculateScore();
  }, [factors]);

  const calculateScore = () => {
    setLoading(true);
    
    // Simulate async calculation
    setTimeout(() => {
      const calculatedScore = calculateCreditScore(factors);
      setScore(calculatedScore);
      
      if (showRecommendation) {
        const rec = getLoanRecommendation(factors, calculatedScore);
        setRecommendation(rec);
      }
      
      setLoading(false);
    }, 500);
  };

  if (loading) {
    return (
      <Card className={cn(compact && 'p-4')}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Calculating credit score...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Unable to calculate credit score</p>
        </CardContent>
      </Card>
    );
  }

  const scorePercentage = ((score.score - 300) / 550) * 100;

  if (compact) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Shield className={cn('h-5 w-5', SCORE_COLORS[score.scoreRange])} />
                <span className={cn('text-2xl font-bold', SCORE_COLORS[score.scoreRange])}>
                  {score.score}
                </span>
                <Badge variant="outline" className={SCORE_COLORS[score.scoreRange]}>
                  {CREDIT_SCORE_RANGES[score.scoreRange].label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Risk: {score.riskLevel.replace('_', ' ')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">
                {formatNAD(score.maxApprovedAmount)}
              </div>
              <p className="text-xs text-muted-foreground">Max approved</p>
            </div>
          </div>
          <Progress 
            value={scorePercentage} 
            className={cn('h-2 mt-3', SCORE_BG_COLORS[score.scoreRange])}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Score Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                AI Credit Score
              </CardTitle>
              <CardDescription>
                Intelligent risk assessment powered by machine learning
              </CardDescription>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalculate
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Score Display */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              {/* Score Circle */}
              <div className={cn(
                'w-40 h-40 rounded-full flex items-center justify-center',
                'border-8',
                score.scoreRange === 'EXCELLENT' && 'border-green-500',
                score.scoreRange === 'GOOD' && 'border-blue-500',
                score.scoreRange === 'FAIR' && 'border-yellow-500',
                score.scoreRange === 'POOR' && 'border-red-500'
              )}>
                <div className="text-center">
                  <div className={cn('text-4xl font-bold', SCORE_COLORS[score.scoreRange])}>
                    {score.score}
                  </div>
                  <div className={cn('text-sm font-medium', SCORE_COLORS[score.scoreRange])}>
                    {CREDIT_SCORE_RANGES[score.scoreRange].label}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Score Range */}
          <div className="relative mb-6">
            <div className="flex h-3 rounded-full overflow-hidden">
              <div className="bg-red-500 flex-1" />
              <div className="bg-yellow-500 flex-1" />
              <div className="bg-blue-500 flex-1" />
              <div className="bg-green-500 flex-1" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>300</span>
              <span>580</span>
              <span>670</span>
              <span>750</span>
              <span>850</span>
            </div>
            {/* Score marker */}
            <div 
              className="absolute top-0 w-1 h-5 bg-black rounded"
              style={{ left: `${scorePercentage}%`, transform: 'translateX(-50%)' }}
            />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted rounded-lg">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <div className="text-lg font-bold">{formatNAD(score.maxApprovedAmount)}</div>
              <div className="text-xs text-muted-foreground">Max Approved</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Percent className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <div className="text-lg font-bold">{score.suggestedInterestRate}%</div>
              <div className="text-xs text-muted-foreground">Interest Rate</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-600" />
              <div className="text-lg font-bold">{score.debtToIncomeRatio.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">DTI Ratio</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Shield className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <div className="text-lg font-bold capitalize">{score.riskLevel.replace('_', ' ')}</div>
              <div className="text-xs text-muted-foreground">Risk Level</div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Score Factors */}
          <div className="mb-6">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Score Factors
            </h4>
            <div className="space-y-2">
              {score.factors.map((factor, index) => (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        'flex items-center justify-between p-2 rounded-lg border',
                        factor.impact === 'positive' && 'bg-green-50 border-green-200',
                        factor.impact === 'negative' && 'bg-red-50 border-red-200',
                        factor.impact === 'neutral' && 'bg-gray-50 border-gray-200'
                      )}>
                        <div className="flex items-center gap-2">
                          {factor.impact === 'positive' && <TrendingUp className="h-4 w-4 text-green-600" />}
                          {factor.impact === 'negative' && <TrendingDown className="h-4 w-4 text-red-600" />}
                          {factor.impact === 'neutral' && <Minus className="h-4 w-4 text-gray-600" />}
                          <span className="text-sm font-medium">{factor.factor}</span>
                        </div>
                        <Badge variant="outline" className={cn(
                          'text-xs',
                          factor.impact === 'positive' && 'text-green-700',
                          factor.impact === 'negative' && 'text-red-700'
                        )}>
                          {factor.category}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{factor.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {score.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Recommendations to Improve Score
              </h4>
              <ul className="space-y-2">
                {score.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Recommendation Card */}
      {showRecommendation && recommendation && (
        <Card className={cn(
          'border-2',
          recommendation.approved ? 'border-green-500' : 'border-red-500'
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {recommendation.approved ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-700">Loan Approved</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-700">Loan Not Approved</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recommendation.approved ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-700">
                      {formatNAD(recommendation.approvedAmount)}
                    </div>
                    <div className="text-xs text-green-600">Approved Amount</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-700">
                      {recommendation.suggestedTerm} months
                    </div>
                    <div className="text-xs text-blue-600">Term</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-700">
                      {formatNAD(recommendation.monthlyPayment)}
                    </div>
                    <div className="text-xs text-purple-600">Monthly Payment</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-xl font-bold text-orange-700">
                      {recommendation.interestRate}%
                    </div>
                    <div className="text-xs text-orange-600">APR</div>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Repayment</span>
                    <span className="font-bold">{formatNAD(recommendation.totalRepayment)}</span>
                  </div>
                </div>

                {recommendation.conditions && recommendation.conditions.length > 0 && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h5 className="font-medium text-yellow-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Conditions
                    </h5>
                    <ul className="space-y-1">
                      {recommendation.conditions.map((condition, index) => (
                        <li key={index} className="text-sm text-yellow-700 flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {condition}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {recommendation.reasons.map((reason, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-red-700">
                    <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CreditScoreDisplay;
