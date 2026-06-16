import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import type { Id } from '@/types/convex';
import { useMutation, useQuery } from 'convex/react';
import { ChevronDown, ChevronRight, FileText, Package, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export function ProductsDashboard() {
  const products = useQuery(api.ontology.products.listProducts, {});
  const seedProduct = useMutation(api.ontology.products.seedPersonalLoan);
  const { toast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedProduct({});
      toast({ title: 'Seeded', description: 'Personal Loan product created.' });
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

  const loading = products === undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Financial Products
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Product definitions with immutable versioning and eligibility rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
            <RefreshCw className={cn('h-4 w-4 mr-2', seeding && 'animate-spin')} />
            Seed Personal Loan
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading products...
          </CardContent>
        </Card>
      ) : !products || products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Products Defined</p>
            <p className="text-sm text-muted-foreground mb-4">
              Seed the Personal Loan product to enable product-validated loan creation.
            </p>
            <Button onClick={handleSeed} disabled={seeding}>
              <Plus className="h-4 w-4 mr-2" />
              Seed Personal Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const isExpanded = expandedProduct === product._id;
            return (
              <Card key={product._id}>
                <CardHeader
                  className="cursor-pointer pb-3"
                  onClick={() => setExpandedProduct(isExpanded ? null : product._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {product.productCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          product.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
                            : product.status === 'draft'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                              : 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                        }
                      >
                        {product.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    <Separator />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Currency</p>
                        <p className="font-medium">NAD</p>
                      </div>
                      {product.description && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground text-xs">Description</p>
                          <p>{product.description}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs">Created</p>
                        <p>{new Date(product.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Version History */}
                    <ProductVersions productId={product._id} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductVersions({ productId }: { productId: string }) {
  const versions = useQuery(api.ontology.products.getVersionHistory, {
    productId: productId as Id<'productDefinitions'>,
  });

  if (versions === undefined) {
    return <p className="text-xs text-muted-foreground">Loading versions...</p>;
  }

  if (!versions || versions.length === 0) {
    return <p className="text-xs text-muted-foreground">No versions defined.</p>;
  }

  return (
    <div>
      <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        Versions ({versions.length})
      </h4>
      <div className="space-y-2">
        {versions.map((ver) => (
          <div
            key={ver._id}
            className="flex items-center justify-between p-2 rounded border border-border bg-muted/30 text-sm"
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                v{ver.versionNumber}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {new Date(ver.effectiveFrom).toLocaleDateString()}
                {ver.effectiveTo
                  ? ` – ${new Date(ver.effectiveTo).toLocaleDateString()}`
                  : ' – present'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {ver.config?.minAmount != null && ver.config?.maxAmount != null && (
                <span className="text-xs text-muted-foreground">
                  N${ver.config.minAmount.toLocaleString()} – N$
                  {ver.config.maxAmount.toLocaleString()}
                </span>
              )}
              {(ver.config?.defaultInterestRate ?? ver.config?.maxInterestRate) != null && (
                <Badge variant="outline" className="text-xs">
                  {ver.config.defaultInterestRate ?? ver.config.maxInterestRate}% APR
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductsDashboard;
