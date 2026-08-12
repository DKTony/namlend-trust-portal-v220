import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { toast } from '@/hooks/use-toast';
import { api, type Id } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from 'convex/react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
} from 'lucide-react';
import React, { useState } from 'react';
import { useCommunications } from '../../hooks/useCommunications';

interface ComposerState {
  recipientId: string;
  type: 'email' | 'sms' | 'in_app';
  subject: string;
  message: string;
  inReplyTo?: Id<'communications'>;
}

const EMPTY_COMPOSER: ComposerState = { recipientId: '', type: 'in_app', subject: '', message: '' };

const CommunicationCenter: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [sending, setSending] = useState(false);

  const { communications, loading, error } = useCommunications(activeFilter, searchTerm);
  const clients = useQuery(
    api.users.listUsers,
    showComposer ? { role: 'client', limit: 200 } : 'skip'
  );
  const sendMutation = useMutation(api.communications.sendCommunication);
  const resendMutation = useMutation(api.communications.resendCommunication);

  const openComposer = (prefill?: Partial<ComposerState>) => {
    setComposer({ ...EMPTY_COMPOSER, ...prefill });
    setShowComposer(true);
  };

  const handleSend = async () => {
    if (!composer.recipientId || !composer.subject.trim() || !composer.message.trim()) {
      toast({
        title: 'Missing information',
        description: 'Select a recipient and enter a subject and message.',
        variant: 'destructive',
      });
      return;
    }
    setSending(true);
    try {
      await sendMutation({
        userId: composer.recipientId as Id<'users'>,
        type: composer.type,
        subject: composer.subject,
        message: composer.message,
        inReplyTo: composer.inReplyTo,
      });
      toast({
        title: 'Message sent',
        description:
          composer.type === 'in_app'
            ? 'Delivered to the client’s notification center.'
            : 'Communication logged.',
      });
      setShowComposer(false);
      setComposer(EMPTY_COMPOSER);
    } catch (err) {
      toast({
        title: 'Send failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (communicationId: Id<'communications'>) => {
    try {
      await resendMutation({ communicationId });
      toast({ title: 'Message re-sent' });
    } catch (err) {
      toast({
        title: 'Resend failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      email: <Mail className="h-4 w-4" />,
      sms: <MessageSquare className="h-4 w-4" />,
      call: <Phone className="h-4 w-4" />,
      'in-app': <MessageSquare className="h-4 w-4" />,
    };
    return icons[type as keyof typeof icons] || <MessageSquare className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: 'bg-blue-100  text-blue-800  border-blue-200 ',
      delivered: 'bg-green-100  text-green-800  border-green-200 ',
      read: 'bg-purple-100  text-purple-800  border-purple-200 ',
      replied: 'bg-emerald-100  text-emerald-800  border-emerald-200 ',
      failed: 'bg-red-100  text-red-800  border-red-200 ',
    };

    const icons = {
      sent: <Clock className="h-3 w-3 mr-1" />,
      delivered: <CheckCircle className="h-3 w-3 mr-1" />,
      read: <CheckCircle className="h-3 w-3 mr-1" />,
      replied: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <AlertCircle className="h-3 w-3 mr-1" />,
    };

    return (
      <ThemedBadge className={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </ThemedBadge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'bg-gray-100  text-gray-800  border-gray-200 ',
      medium: 'bg-yellow-100  text-yellow-800  border-yellow-200 ',
      high: 'bg-orange-100  text-orange-800  border-orange-200 ',
      urgent: 'bg-red-100  text-red-800  border-red-200 ',
    };

    return (
      <ThemedBadge className={variants[priority as keyof typeof variants]}>
        <span className="capitalize">{priority}</span>
      </ThemedBadge>
    );
  };

  const filterOptions = [
    { value: 'all', label: 'All Communications', count: communications?.length || 0 },
    {
      value: 'email',
      label: 'Emails',
      count: communications?.filter((c) => c.type === 'email').length || 0,
    },
    {
      value: 'sms',
      label: 'SMS',
      count: communications?.filter((c) => c.type === 'sms').length || 0,
    },
    {
      value: 'call',
      label: 'Calls',
      count: communications?.filter((c) => c.type === 'call').length || 0,
    },
    {
      value: 'pending',
      label: 'Pending',
      count: communications?.filter((c) => c.status === 'sent').length || 0,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <ThemedCard key={i} className="animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
              <div className="h-6 bg-muted rounded w-16"></div>
            </div>
          </ThemedCard>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className={cn('text-lg font-semibold', 'font-sans text-[#274F35]')}>
            Communication Center
          </h3>
          <p className="text-sm text-muted-foreground">Manage client communications and messages</p>
        </div>
        <ThemedButton className="h-9 px-3 text-xs" onClick={() => openComposer()}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          New Message
        </ThemedButton>
      </div>

      {/* Communication Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ThemedCard>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-sm text-muted-foreground truncate">Total Messages</p>
              <p
                className={cn(
                  'text-xl sm:text-2xl font-bold truncate tabular-nums',
                  'font-sans text-[#274F35]'
                )}
              >
                {communications?.length || 0}
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-600  shrink-0" />
          </div>
        </ThemedCard>
        <ThemedCard>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-sm text-muted-foreground truncate">Pending Replies</p>
              <p
                className={cn(
                  'text-xl sm:text-2xl font-bold truncate tabular-nums',
                  'font-sans text-[#274F35]'
                )}
              >
                {communications?.filter((c) => c.status === 'sent').length || 0}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-600  shrink-0" />
          </div>
        </ThemedCard>
        <ThemedCard>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-sm text-muted-foreground truncate">Delivered</p>
              <p
                className={cn(
                  'text-xl sm:text-2xl font-bold truncate tabular-nums',
                  'font-sans text-[#274F35]'
                )}
              >
                {communications?.filter((c) => ['delivered', 'read', 'replied'].includes(c.status))
                  .length || 0}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600  shrink-0" />
          </div>
        </ThemedCard>
        <ThemedCard>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 mr-2">
              <p className="text-sm text-muted-foreground truncate">Failed</p>
              <p
                className={cn(
                  'text-xl sm:text-2xl font-bold truncate tabular-nums',
                  'font-sans text-[#274F35]'
                )}
              >
                {communications?.filter((c) => c.status === 'failed').length || 0}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600  shrink-0" />
          </div>
        </ThemedCard>
      </div>

      {/* Filters and Search */}
      <div className="flex space-x-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <input
            type="text"
            placeholder="Search communications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              'w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground',
              'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
            )}
          />
        </div>
        <div className="flex space-x-2">
          {filterOptions.map((option) => (
            <ThemedButton
              key={option.value}
              variant={activeFilter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(option.value)}
              className="flex items-center space-x-1 shrink-0"
            >
              <span>{option.label}</span>
              {option.count > 0 && (
                <ThemedBadge variant="secondary" className="ml-1 text-xs">
                  {option.count}
                </ThemedBadge>
              )}
            </ThemedButton>
          ))}
        </div>
      </div>

      {/* Communications List */}
      {error ? (
        <ThemedCard className="border-destructive/50 bg-destructive/10">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load communications: {error}</span>
          </div>
        </ThemedCard>
      ) : !communications || communications.length === 0 ? (
        <ThemedCard>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className={cn('text-lg font-medium', 'font-sans text-[#274F35]')}>
              No communications found
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? `No communications match "${searchTerm}"`
                : 'No communications at this time'}
            </p>
          </div>
        </ThemedCard>
      ) : (
        <div className="space-y-4">
          {communications.map((comm) => (
            <ThemedCard key={comm.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                {/* Communication Type Icon */}
                <div className="flex-shrink-0">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center',
                      comm.type === 'email'
                        ? 'bg-blue-100 text-blue-600'
                        : comm.type === 'sms'
                          ? 'bg-purple-100 text-purple-600'
                          : comm.type === 'call'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-orange-100 text-orange-600'
                    )}
                  >
                    {getTypeIcon(comm.type)}
                  </div>
                </div>

                {/* Communication Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <h4 className={cn('font-semibold truncate', 'font-sans text-[#274F35]')}>
                        {comm.clientName}
                      </h4>
                      {getStatusBadge(comm.status)}
                      {getPriorityBadge(comm.priority)}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(comm.createdAt)}
                    </span>
                  </div>
                  <h5 className="text-sm font-medium text-foreground mb-1">{comm.subject}</h5>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{comm.message}</p>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <ThemedButton
                      variant="secondary"
                      className="h-8 px-3 text-xs shrink-0"
                      onClick={() =>
                        openComposer({
                          recipientId: String(comm.clientId),
                          type:
                            comm.type === 'in-app'
                              ? 'in_app'
                              : comm.type === 'sms'
                                ? 'sms'
                                : 'email',
                          subject: comm.subject.startsWith('Re:')
                            ? comm.subject
                            : `Re: ${comm.subject}`,
                          inReplyTo: comm.communicationId,
                        })
                      }
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-2" />
                      Reply
                    </ThemedButton>
                    {comm.status === 'failed' && (
                      <ThemedButton
                        variant="secondary"
                        className="h-8 px-3 text-xs text-red-600  shrink-0"
                        onClick={() => handleResend(comm.communicationId)}
                      >
                        <Send className="h-3.5 w-3.5 mr-2" />
                        Resend
                      </ThemedButton>
                    )}
                  </div>
                </div>
              </div>
            </ThemedCard>
          ))}
        </div>
      )}

      {/* Message Composer Modal */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <ThemedCard className="max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto m-0 p-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={cn('text-lg font-semibold', 'font-sans text-[#274F35]')}>
                  New Message
                </h3>
                <ThemedButton
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowComposer(false)}
                >
                  ×
                </ThemedButton>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">
                    Recipient
                  </label>
                  <select
                    value={composer.recipientId}
                    onChange={(e) => setComposer((c) => ({ ...c, recipientId: e.target.value }))}
                    className={cn(
                      'w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground',
                      'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
                    )}
                  >
                    <option value="">
                      {clients === undefined ? 'Loading clients…' : 'Select a client...'}
                    </option>
                    {(clients ?? []).map((client) => (
                      <option key={String(client.userId)} value={String(client.userId)}>
                        {client.fullName || client.email || String(client.userId)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Type</label>
                  <select
                    value={composer.type}
                    onChange={(e) =>
                      setComposer((c) => ({
                        ...c,
                        type: e.target.value as ComposerState['type'],
                      }))
                    }
                    className={cn(
                      'w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground',
                      'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
                    )}
                  >
                    <option value="in_app">In-App Message (delivered instantly)</option>
                    <option value="email">Email (logged)</option>
                    <option value="sms">SMS (logged)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Subject</label>
                  <input
                    type="text"
                    value={composer.subject}
                    onChange={(e) => setComposer((c) => ({ ...c, subject: e.target.value }))}
                    className={cn(
                      'w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground',
                      'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
                    )}
                    placeholder="Enter subject..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Message</label>
                  <textarea
                    rows={6}
                    value={composer.message}
                    onChange={(e) => setComposer((c) => ({ ...c, message: e.target.value }))}
                    className={cn(
                      'w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground',
                      'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
                    )}
                    placeholder="Enter your message..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <ThemedButton variant="secondary" onClick={() => setShowComposer(false)}>
                    Cancel
                  </ThemedButton>
                  <ThemedButton onClick={handleSend} disabled={sending}>
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Sending…' : 'Send Message'}
                  </ThemedButton>
                </div>
              </div>
            </div>
          </ThemedCard>
        </div>
      )}
    </div>
  );
};

export default CommunicationCenter;
