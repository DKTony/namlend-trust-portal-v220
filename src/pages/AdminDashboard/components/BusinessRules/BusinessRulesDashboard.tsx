import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from 'convex/react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit3,
  History,
  RefreshCw,
  Settings,
  X,
} from 'lucide-react';
import { useState } from 'react';

const CATEGORY_LABELS: Record<string, string> = {
  regulatory: 'Regulatory',
  scoring: 'Credit Scoring',
  routing: 'Payment Routing',
};

const CATEGORY_COLORS: Record<string, string> = {
  regulatory: 'bg-red-100  text-red-800  border-red-200 ',
  scoring: 'bg-blue-100  text-blue-800  border-blue-200 ',
  routing: 'bg-purple-100  text-purple-800  border-purple-200 ',
};

export function BusinessRulesDashboard() {
  const rules = useQuery(api.ontology.businessRules.listAllRules);
  const updateRule = useMutation(api.ontology.businessRules.updateRule);
  const seedRules = useMutation(api.ontology.businessRules.seedDefaultRules);
  const { toast } = useToast();
  const { isPlatformSupport } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const handleSeed = async () => {
    if (isPlatformSupport) return;
    setSeeding(true);
    try {
      await seedRules();
      toast({ title: 'Seeded', description: 'Default business rules created.' });
    } catch (err) {
      toast({
        title: 'Seed Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async (ruleCode: string) => {
    if (isPlatformSupport) return;
    try {
      await updateRule({ ruleCode, value: editValue });
      toast({ title: 'Updated', description: `Rule ${ruleCode} updated successfully.` });
      setEditingRule(null);
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const loading = rules === undefined;

  interface BusinessRule {
    _id: string;
    ruleCode: string;
    category: string;
    displayName: string;
    description?: string;
    valueType: string;
    value: string;
    effectiveFrom: number;
    effectiveTo?: number;
    version: number;
  }

  // Group active rules by category
  const allRules = (rules ?? []) as BusinessRule[];
  const activeRules = allRules.filter((r: BusinessRule) => r.effectiveTo === undefined);
  const historicalRules = allRules.filter((r: BusinessRule) => r.effectiveTo !== undefined);

  const grouped = activeRules.reduce<Record<string, BusinessRule[]>>((acc, rule) => {
    const cat = rule.category ?? 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(rule);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Business Rules
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data-driven rules with close-and-insert versioning. Changes take effect immediately — no
            deploy needed.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSeed}
          disabled={seeding || isPlatformSupport}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', seeding && 'animate-spin')} />
          Seed Defaults
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading business rules...
          </CardContent>
        </Card>
      ) : activeRules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Business Rules Defined</p>
            <p className="text-sm text-muted-foreground mb-4">
              Seed the default rules (APR limit, credit scoring thresholds, rail weights) to enable
              data-driven behavior.
            </p>
            <Button onClick={handleSeed} disabled={seeding || isPlatformSupport}>
              Seed Default Rules
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catRules]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={CATEGORY_COLORS[category] ?? ''}>
                    {CATEGORY_LABELS[category] ?? category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {catRules.length} rule{catRules.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {catRules.map((rule) => {
                  const isEditing = editingRule === rule.ruleCode;
                  const isExpanded = expandedRule === rule.ruleCode;
                  const ruleHistory = historicalRules
                    .filter((r) => r.ruleCode === rule.ruleCode)
                    .sort((a, b) => (b.effectiveFrom ?? 0) - (a.effectiveFrom ?? 0));

                  return (
                    <div key={rule._id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedRule(isExpanded ? null : rule.ruleCode)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <div>
                            <p className="text-sm font-medium">{rule.displayName}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {rule.ruleCode}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-7 w-40 text-xs"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleSave(rule.ruleCode)}
                                disabled={isPlatformSupport}
                              >
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingRule(null)}
                              >
                                <X className="h-3.5 w-3.5 text-red-600" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="secondary" className="text-xs font-mono">
                                {rule.valueType === 'json'
                                  ? 'JSON'
                                  : rule.value.length > 30
                                    ? rule.value.slice(0, 30) + '...'
                                    : rule.value}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  setEditingRule(rule.ruleCode);
                                  setEditValue(rule.value);
                                }}
                                disabled={isPlatformSupport}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {rule.description && (
                        <p className="text-xs text-muted-foreground pl-6">{rule.description}</p>
                      )}

                      {isExpanded && (
                        <div className="pl-6 pt-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <Badge variant="outline" className="text-xs">
                              v{rule.version}
                            </Badge>
                            <span>
                              Effective from {new Date(rule.effectiveFrom).toLocaleDateString()}
                            </span>
                          </div>

                          {rule.valueType === 'json' && (
                            <pre className="text-xs bg-muted/50 p-2 rounded border border-border overflow-auto max-h-32 font-mono">
                              {(() => {
                                try {
                                  return JSON.stringify(JSON.parse(rule.value), null, 2);
                                } catch {
                                  return rule.value;
                                }
                              })()}
                            </pre>
                          )}

                          {ruleHistory.length > 0 && (
                            <>
                              <Separator className="my-2" />
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                                <History className="h-3 w-3" />
                                Version History ({ruleHistory.length})
                              </div>
                              <div className="space-y-1">
                                {ruleHistory.map((hist) => (
                                  <div
                                    key={hist._id}
                                    className="flex items-center justify-between text-xs text-muted-foreground"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs px-1">
                                        v{hist.version}
                                      </Badge>
                                      <span className="font-mono">
                                        {hist.value.length > 20
                                          ? hist.value.slice(0, 20) + '...'
                                          : hist.value}
                                      </span>
                                    </div>
                                    <span>
                                      {new Date(hist.effectiveFrom).toLocaleDateString()} –{' '}
                                      {hist.effectiveTo
                                        ? new Date(hist.effectiveTo).toLocaleDateString()
                                        : 'present'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default BusinessRulesDashboard;
