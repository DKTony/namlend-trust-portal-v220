import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  newStatus: string;
  onStatusChange: (status: string) => void;
  processing: boolean;
  onUpdate: () => void;
}

export function StatusUpdateDialog({
  open,
  onOpenChange,
  selectedCount,
  newStatus,
  onStatusChange,
  processing,
  onUpdate,
}: StatusUpdateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Loan Status</DialogTitle>
          <DialogDescription>Update the status of {selectedCount} selected loans</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select value={newStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="bg-background border-input text-foreground">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disbursed">Disbursed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 bg-yellow-50  border border-yellow-200  rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500  mt-0.5" />
              <div className="text-sm text-yellow-700 ">
                <strong>Warning:</strong> This action will update {selectedCount} loans. This action
                should be audited and may affect client communications.
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onUpdate} disabled={processing || !newStatus}>
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Update {selectedCount} Loans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
