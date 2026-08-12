import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Mail, Smartphone, User } from 'lucide-react';

interface ClientProfileHeaderProps {
  profile: {
    first_name: string;
    last_name: string;
    id_number: string;
    phone_number: string;
  };
  email?: string;
  completionPercent: number;
  isEligible: boolean;
}

export function ClientProfileHeader({
  profile,
  email,
  completionPercent,
  isEligible,
}: ClientProfileHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 shadow-sm">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <User className="h-64 w-64 text-foreground transform rotate-12" />
      </div>
      <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
        <div className="flex items-start gap-6">
          <div className="h-24 w-24 rounded-2xl bg-muted/50 border border-border flex items-center justify-center shadow-inner">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-muted-foreground font-mono text-sm mb-4">ID: {profile.id_number}</p>
            <div className="flex flex-wrap gap-3">
              <Badge
                variant="outline"
                className="bg-muted/50 border-border text-muted-foreground px-3 py-1"
              >
                <Smartphone className="h-3 w-3 mr-2" />
                {profile.phone_number}
              </Badge>
              <Badge
                variant="outline"
                className="bg-muted/50 border-border text-muted-foreground px-3 py-1"
              >
                <Mail className="h-3 w-3 mr-2" />
                {email}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-4 min-w-[240px]">
          <div className="text-right w-full">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Profile Completion</span>
              <span className="text-blue-500 font-medium">{completionPercent}%</span>
            </div>
            <Progress
              value={completionPercent}
              className="h-2 bg-muted"
              indicatorClassName="bg-blue-500"
            />
          </div>
          <div
            className={cn(
              'w-full p-4 rounded-xl border flex items-center justify-between',
              isEligible
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-yellow-500/10 border-yellow-500/20'
            )}
          >
            <span
              className={cn(
                'text-sm font-medium',
                isEligible ? 'text-green-600 ' : 'text-yellow-600 '
              )}
            >
              {isEligible ? 'Loan Eligible' : 'Action Required'}
            </span>
            {isEligible ? (
              <CheckCircle className="h-5 w-5 text-green-500 " />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 " />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
