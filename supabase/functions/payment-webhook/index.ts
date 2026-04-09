import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createHmac } from 'https://deno.land/std@0.190.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-paytoday-signature, x-mtc-signature, x-tn-signature',
};

interface PaymentWebhookPayload {
  provider: string;
  event_type: string;
  reference: string;
  amount?: number;
  status: string;
  transaction_id?: string;
  phone_number?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

// Verify webhook signature based on provider
async function verifySignature(
  provider: string,
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === expectedSignature;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const rawBody = await req.text();
    const payload: PaymentWebhookPayload = JSON.parse(rawBody);

    // Determine provider from headers or payload
    const provider =
      payload.provider ||
      (req.headers.get('x-paytoday-signature')
        ? 'paytoday'
        : req.headers.get('x-mtc-signature')
          ? 'mtc_momo'
          : req.headers.get('x-tn-signature')
            ? 'tn_mobile'
            : 'unknown');

    // Get provider-specific signature and secret
    let signature: string | null = null;
    let secret: string | null = null;

    switch (provider) {
      case 'paytoday':
        signature = req.headers.get('x-paytoday-signature');
        secret = Deno.env.get('PAYTODAY_WEBHOOK_SECRET') ?? null;
        break;
      case 'mtc_momo':
        signature = req.headers.get('x-mtc-signature');
        secret = Deno.env.get('MTC_MOMO_WEBHOOK_SECRET') ?? null;
        break;
      case 'tn_mobile':
        signature = req.headers.get('x-tn-signature');
        secret = Deno.env.get('TN_MOBILE_WEBHOOK_SECRET') ?? null;
        break;
    }

    // Verify signature - FAIL CLOSED in production if secret is not configured
    let signatureValid = true;
    if (secret) {
      signatureValid = await verifySignature(provider, rawBody, signature, secret);
    } else {
      // No secret configured - check environment to determine behavior
      // ENVIRONMENT=production explicitly marks production
      // ENVIRONMENT=staging or ENVIRONMENT=development allows missing secrets with warning
      const environment = Deno.env.get('ENVIRONMENT') ?? 'production';
      const isStrictMode = environment === 'production';

      if (isStrictMode) {
        console.error(
          `SECURITY: Webhook secret not configured for provider ${provider} in production`
        );
        return new Response(
          JSON.stringify({ success: false, error: 'Webhook secret not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      console.warn(
        `[${environment}]: Webhook signature verification skipped for ${provider} - no secret configured`
      );
    }

    // Log webhook receipt
    const { data: webhookLog, error: logError } = await supabase
      .from('payment_webhooks')
      .insert({
        provider,
        event_type: payload.event_type,
        reference_number: payload.reference,
        payload: payload,
        signature,
        signature_valid: signatureValid,
        processed: false,
        received_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Error logging webhook:', logError);
    }

    // If signature is invalid, log but don't process
    if (!signatureValid) {
      console.warn('Invalid webhook signature for provider:', provider);
      return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Process the webhook
    const processingResult: Record<string, unknown> = {};
    let processingError: string | null = null;

    try {
      // Map provider status to our status
      const statusMap: Record<string, string> = {
        success: 'completed',
        successful: 'completed',
        completed: 'completed',
        paid: 'completed',
        failed: 'failed',
        failure: 'failed',
        cancelled: 'cancelled',
        canceled: 'cancelled',
        pending: 'pending',
        processing: 'processing',
      };

      const normalizedStatus = statusMap[payload.status?.toLowerCase()] || 'pending';

      // Update payment transaction
      const { data: transaction, error: txError } = await supabase
        .from('payment_transactions')
        .update({
          status: normalizedStatus,
          provider_transaction_id: payload.transaction_id,
          webhook_received_at: new Date().toISOString(),
          webhook_data: payload,
          completed_at: normalizedStatus === 'completed' ? new Date().toISOString() : null,
          failed_at: normalizedStatus === 'failed' ? new Date().toISOString() : null,
          failure_reason:
            normalizedStatus === 'failed' ? (payload.metadata?.error as string) : null,
        })
        .eq('reference_number', payload.reference)
        .select('id, loan_id, user_id, amount')
        .single();

      if (txError) {
        processingError = `Transaction update failed: ${txError.message}`;
      } else if (transaction) {
        processingResult.transaction_id = transaction.id;

        // If payment completed, update the payment record and apply to schedule
        if (normalizedStatus === 'completed') {
          // P0-003 FIX: Update payment record AND capture the payment ID
          const { data: paymentRecord, error: paymentError } = await supabase
            .from('payments')
            .update({
              status: 'completed',
              paid_at: new Date().toISOString(),
            })
            .eq('reference_number', payload.reference)
            .select('id')
            .single();

          if (paymentError) {
            console.error('Error updating payment record:', paymentError);
          }

          // P0-003 FIX: Use payments.id (not payment_transactions.id) for schedule application
          const paymentId = paymentRecord?.id || transaction.id;

          // Apply payment to schedule using RPC with correct payment ID
          const { data: applyResult, error: applyError } = await supabase.rpc(
            'apply_payment_to_schedule',
            {
              p_payment_id: paymentId,
              p_amount: payload.amount || transaction.amount,
            }
          );

          if (applyError) {
            console.error('Error applying payment to schedule:', applyError);
          } else {
            processingResult.schedule_update = applyResult;
          }

          // Send notification to user
          await supabase.rpc('queue_notification', {
            p_user_id: transaction.user_id,
            p_template_code: 'PAYMENT_RECEIVED',
            p_data: {
              amount: (payload.amount || transaction.amount).toString(),
              date: new Date().toLocaleDateString('en-ZA'),
              reference: payload.reference,
              balance: applyResult?.remaining_amount?.toString() || '0',
            },
          });

          processingResult.notification_sent = true;
        }
      }
    } catch (e) {
      processingError = `Processing error: ${(e as Error).message}`;
    }

    // Update webhook log with processing result
    if (webhookLog?.id) {
      await supabase
        .from('payment_webhooks')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          processing_result: processingResult,
          error: processingError,
        })
        .eq('id', webhookLog.id);
    }

    return new Response(
      JSON.stringify({
        success: !processingError,
        webhook_id: webhookLog?.id,
        result: processingResult,
        error: processingError,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in payment-webhook function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
