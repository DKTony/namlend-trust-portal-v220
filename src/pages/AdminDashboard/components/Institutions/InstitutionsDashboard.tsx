import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from 'convex/react';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export function InstitutionsDashboard() {
  const institutions = useQuery(api.ontology.institutions.listInstitutions, {});
  const seedTenant = useMutation(api.ontology.institutions.seedOgFinancialServices);
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedTenant({});
      toast({ title: 'Seeded', description: 'OG Financial Services institution created.' });
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

  const loading = institutions === undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Institutions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-institution model with temporal configuration
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
            <RefreshCw className={cn('h-4 w-4 mr-2', seeding && 'animate-spin')} />
            Seed OG Financial Services
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading institutions...
          </CardContent>
        </Card>
      ) : !institutions || institutions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Institutions</p>
            <p className="text-sm text-muted-foreground mb-4">
              Seed the default OG Financial Services institution to get started.
            </p>
            <Button onClick={handleSeed} disabled={seeding}>
              <Plus className="h-4 w-4 mr-2" />
              Seed OG Financial Services
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {institutions.map((inst) => (
            <Card key={inst._id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{inst.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      inst.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                    }
                  >
                    {inst.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code</span>
                  <span className="font-mono">{inst.shortCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{inst.type}</span>
                </div>
                {inst.registrationNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reg. Number</span>
                    <span>{inst.registrationNumber}</span>
                  </div>
                )}
                {inst.metadata?.country && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Country</span>
                    <span>{inst.metadata.country}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(inst.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default InstitutionsDashboard;
