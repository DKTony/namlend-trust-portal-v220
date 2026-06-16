import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Interaction {
  id: string;
  interaction_type: string;
  outcome?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

interface CollectionsTabProps {
  interactions: Interaction[];
}

export function CollectionsTab({ interactions }: CollectionsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections Interactions</CardTitle>
      </CardHeader>
      <CardContent>
        {interactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No collections activity</div>
        ) : (
          <div className="space-y-3">
            {interactions.map((interaction) => (
              <div key={interaction.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{interaction.interaction_type}</Badge>
                  {interaction.outcome && <Badge variant="secondary">{interaction.outcome}</Badge>}
                </div>
                {interaction.notes && <p className="text-sm mb-2">{interaction.notes}</p>}
                <div className="text-xs text-muted-foreground">
                  {new Date(interaction.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
