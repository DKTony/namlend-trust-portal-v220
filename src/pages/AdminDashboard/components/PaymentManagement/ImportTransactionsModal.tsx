import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { importBankTransactions, ImportTransactionInput } from '@/services/reconciliationService';
import { Loader2, Upload, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportTransactionsModal: React.FC<Props> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportTransactionInput[]>([]);
  const { toast } = useToast();

  const handleClose = () => {
    if (!loading) {
      setCsvText('');
      setPreview([]);
      onClose();
    }
  };

  const parseCsv = (text: string): ImportTransactionInput[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const transactions: ImportTransactionInput[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      
      if (parts.length >= 4) {
        transactions.push({
          transaction_reference: parts[0],
          transaction_date: parts[1],
          transaction_amount: parseFloat(parts[2]),
          transaction_type: (parts[3].toLowerCase() === 'credit' ? 'credit' : 'debit'),
          bank_name: parts[4] || undefined,
          account_number: parts[5] || undefined,
          description: parts[6] || undefined
        });
      }
    }

    return transactions;
  };

  const handlePreview = () => {
    try {
      const transactions = parseCsv(csvText);
      
      if (transactions.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'No valid transactions found in CSV',
          variant: 'destructive'
        });
        return;
      }

      setPreview(transactions);
      toast({
        title: 'Preview Generated',
        description: `${transactions.length} transaction(s) ready to import`
      });
    } catch (error) {
      toast({
        title: 'Parse Error',
        description: 'Failed to parse CSV. Please check format.',
        variant: 'destructive'
      });
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast({
        title: 'Error',
        description: 'Please preview transactions first',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await importBankTransactions(preview);

      if (result.success) {
        toast({
          title: 'Success',
          description: (
            <div>
              <p>Imported: {result.imported_count} transactions</p>
              {result.duplicate_count && result.duplicate_count > 0 && (
                <p className="text-yellow-600">Duplicates skipped: {result.duplicate_count}</p>
              )}
            </div>
          )
        });
        setCsvText('');
        setPreview([]);
        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Import Failed',
          description: result.error || 'Failed to import transactions',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-blue-600" />
            <span>Import Bank Transactions</span>
          </DialogTitle>
          <DialogDescription>
            Paste CSV data with columns: Reference, Date, Amount, Type, Bank, Account, Description
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* CSV Format Help */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Expected CSV Format:</p>
                <code className="text-xs bg-white px-2 py-1 rounded block">
                  Reference,Date,Amount,Type,Bank,Account,Description<br/>
                  TXN001,2025-10-07,5000.00,credit,FNB,123456,Payment received
                </code>
              </div>
            </div>
          </div>

          {/* CSV Input */}
          <div className="space-y-2">
            <Label htmlFor="csv-data" className="text-sm font-medium">
              CSV Data <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="csv-data"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
              placeholder="Paste CSV data here..."
              disabled={loading}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {csvText.split('\n').filter(l => l.trim()).length - 1} rows
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={!csvText.trim() || loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Preview ({preview.length} transactions)</Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 text-xs">Reference</th>
                        <th className="text-left p-2 text-xs">Date</th>
                        <th className="text-right p-2 text-xs">Amount</th>
                        <th className="text-left p-2 text-xs">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((txn, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2 font-mono text-xs">{txn.transaction_reference}</td>
                          <td className="p-2 text-xs">{txn.transaction_date}</td>
                          <td className="p-2 text-right text-xs">NAD {txn.transaction_amount.toFixed(2)}</td>
                          <td className="p-2 text-xs">
                            <span className={txn.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                              {txn.transaction_type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.length > 10 && (
                  <div className="bg-gray-50 p-2 text-xs text-center text-gray-600">
                    ... and {preview.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important:</p>
              <p className="mt-1">
                Duplicate transactions (same reference) will be automatically skipped.
                Review the preview before importing.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={loading || preview.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {preview.length} Transaction{preview.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTransactionsModal;
