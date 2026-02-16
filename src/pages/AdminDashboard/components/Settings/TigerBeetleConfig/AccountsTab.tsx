/**
 * TigerBeetle Accounts Tab
 * Ledger ID, asset scale, auto-create toggle, and account code ranges grid.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity } from 'lucide-react';
import type { TigerBeetleAccountsConfig } from '@/hooks/useTigerBeetleConfig';

interface AccountsTabProps {
  config: TigerBeetleAccountsConfig;
  onUpdateConfig: (
    key: keyof TigerBeetleAccountsConfig,
    value: string | number | boolean | TigerBeetleAccountsConfig['account_code_ranges']
  ) => void;
}

export function AccountsTab({ config, onUpdateConfig }: AccountsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Account Structure
        </CardTitle>
        <CardDescription>Configure the chart of accounts and account code ranges</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Ledger ID</Label>
            <Input
              type="number"
              value={config.ledger_id}
              onChange={(e) => onUpdateConfig('ledger_id', Number(e.target.value))}
              min={1}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">TigerBeetle ledger identifier (1 = NAD)</p>
          </div>

          <div className="space-y-4">
            <Label>Asset Scale</Label>
            <Select
              value={String(config.asset_scale)}
              onValueChange={(value) => onUpdateConfig('asset_scale', Number(value))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 - Whole units</SelectItem>
                <SelectItem value="2">2 - Cents (NAD 100.00 = 10000)</SelectItem>
                <SelectItem value="4">4 - Basis points</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Decimal precision for amounts</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Auto-Create Loan Accounts</Label>
            <p className="text-xs text-muted-foreground">
              Automatically create TigerBeetle accounts when loans are approved
            </p>
          </div>
          <Switch
            checked={config.auto_create_loan_accounts}
            onCheckedChange={(checked) => onUpdateConfig('auto_create_loan_accounts', checked)}
          />
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-4">Account Code Ranges</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(config.account_code_ranges).map(([key, range]) => (
              <div key={key} className="p-4 border rounded-lg space-y-3">
                <Label className="capitalize">{key} Accounts</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={range.start}
                    onChange={(e) =>
                      onUpdateConfig('account_code_ranges', {
                        ...config.account_code_ranges,
                        [key]: { ...range, start: Number(e.target.value) },
                      })
                    }
                    className="w-24 bg-background"
                    placeholder="Start"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    value={range.end}
                    onChange={(e) =>
                      onUpdateConfig('account_code_ranges', {
                        ...config.account_code_ranges,
                        [key]: { ...range, end: Number(e.target.value) },
                      })
                    }
                    className="w-24 bg-background"
                    placeholder="End"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Account Code Reference</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="font-mono">1001</span> - Principal Receivable
            </div>
            <div>
              <span className="font-mono">1002</span> - Interest Receivable
            </div>
            <div>
              <span className="font-mono">1003</span> - Fee Receivable
            </div>
            <div>
              <span className="font-mono">2001</span> - Disbursement Clearing
            </div>
            <div>
              <span className="font-mono">2002</span> - Collections Clearing
            </div>
            <div>
              <span className="font-mono">3001</span> - IPS Pending Inbound
            </div>
            <div>
              <span className="font-mono">5001</span> - Interest Income
            </div>
            <div>
              <span className="font-mono">6001</span> - Write-off Expense
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AccountsTab;
