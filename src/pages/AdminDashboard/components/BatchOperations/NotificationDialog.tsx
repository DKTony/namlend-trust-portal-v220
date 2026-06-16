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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  notificationMessage: string;
  onMessageChange: (msg: string) => void;
  notificationChannel: string;
  onChannelChange: (ch: string) => void;
  processing: boolean;
  onSend: () => void;
}

export function NotificationDialog({
  open,
  onOpenChange,
  selectedCount,
  notificationMessage,
  onMessageChange,
  notificationChannel,
  onChannelChange,
  processing,
  onSend,
}: NotificationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Bulk Notification</DialogTitle>
          <DialogDescription>
            Send a notification to {selectedCount} selected clients
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={notificationChannel} onValueChange={onChannelChange}>
              <SelectTrigger className="bg-background border-input text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_app">In-App</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={notificationMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Enter your message..."
              rows={4}
              className="bg-background border-input text-foreground"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSend} disabled={processing || !notificationMessage}>
            {processing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send to {selectedCount} Clients
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
