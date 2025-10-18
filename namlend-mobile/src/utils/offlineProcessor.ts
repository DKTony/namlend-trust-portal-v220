import { AppState } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { processQueueWith } from './offlineQueue';

async function flushOnce() {
  await processQueueWith({
    loan_application: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not_authenticated');
      
      const { error } = await supabase
        .from('approval_requests')
        .insert({
          user_id: payload.user_id || user.id,
          request_type: 'loan_application',
          request_data: payload.loan_details || payload,
          status: 'pending',
          priority: 'normal',
          created_at: new Date().toISOString(),
        });
      
      if (error) throw error;
    },
    approve_request: async (payload: { requestId: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not_authenticated');
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'approved',
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: payload?.notes || null,
        })
        .eq('id', payload.requestId);
      if (error) throw error;
    },
    reject_request: async (payload: { requestId: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not_authenticated');
      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'rejected',
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: payload?.notes || null,
        })
        .eq('id', payload.requestId);
      if (error) throw error;
    },
    initiate_payment: async (payload: { loanId: string; amount: number; paymentMethod: string; referenceNumber?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not_authenticated');
      const { error } = await supabase
        .from('payments')
        .insert({
          loan_id: payload.loanId,
          amount: payload.amount,
          payment_method: payload.paymentMethod,
          paid_at: new Date().toISOString(),
          status: 'pending',
          reference_number: payload.referenceNumber,
        });
      if (error) throw error;
    },
    upload_document: async (payload: { user_id: string; document_type: string; file_uri: string; file_name: string; content_type: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not_authenticated');
      const res = await fetch(payload.file_uri);
      const blob = await res.blob();
      const path = `${payload.user_id}/${Date.now()}-${payload.file_name}`;
      const upload = await supabase.storage.from('documents').upload(path, blob, { contentType: payload.content_type });
      if (upload.error) throw upload.error;
      await supabase.from('documents').insert({
        user_id: payload.user_id,
        document_type: payload.document_type,
        file_url: path,
        file_name: payload.file_name,
        file_size: (blob as any).size || null,
        uploaded_at: new Date().toISOString(),
        verified: false,
      });
    },
  });
}

let intervalId: NodeJS.Timer | undefined;
let appStateSub: { remove: () => void } | undefined;

export function startOfflineProcessor() {
  if (intervalId || appStateSub) return;
  intervalId = setInterval(async () => {
    await flushOnce();
  }, 30000);
  appStateSub = AppState.addEventListener('change', async (status) => {
    if (status === 'active') {
      await flushOnce();
    }
  });
  flushOnce();
}
