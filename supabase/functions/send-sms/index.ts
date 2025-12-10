import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  to: string | string[];
  message: string;
  template_code?: string;
  template_data?: Record<string, string>;
  user_id?: string;
  loan_id?: string;
}

interface AfricasTalkingResponse {
  SMSMessageData: {
    Message: string;
    Recipients: Array<{
      statusCode: number;
      number: string;
      status: string;
      cost: string;
      messageId: string;
    }>;
  };
}

// Format phone number to international format (+264...)
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '264' + cleaned.substring(1);
  } else if (!cleaned.startsWith('264') && cleaned.length === 9) {
    cleaned = '264' + cleaned;
  }
  
  return '+' + cleaned;
}

// Validate Namibian phone number
function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  return /^\+264[0-9]{9}$/.test(formatted);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: SMSRequest = await req.json();
    
    // Validate authorization
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Verify user is authenticated and has permission
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check if user has staff role (only staff can send SMS)
    const { data: roleData } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    const role = roleData?.role as string | null;
    if (role !== 'admin' && role !== 'loan_officer') {
      return new Response(
        JSON.stringify({ error: "Forbidden: Staff role required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Normalize recipients
    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    const validRecipients: string[] = [];
    const invalidRecipients: string[] = [];

    for (const phone of recipients) {
      if (isValidPhoneNumber(phone)) {
        validRecipients.push(formatPhoneNumber(phone));
      } else {
        invalidRecipients.push(phone);
      }
    }

    if (validRecipients.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No valid phone numbers provided",
          invalid_numbers: invalidRecipients 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get Africa's Talking credentials
    const atApiKey = Deno.env.get("AFRICASTALKING_API_KEY");
    const atUsername = Deno.env.get("AFRICASTALKING_USERNAME") || "sandbox";
    const atSenderId = Deno.env.get("SMS_SENDER_ID") || "NAMLEND";

    // Admin client for logging
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Prepare message
    let message = request.message;
    
    // If template is provided, fetch and render it
    if (request.template_code && request.template_data) {
      const { data: template } = await supabaseAdmin
        .from('notification_templates')
        .select('body')
        .eq('code', request.template_code)
        .single();
      
      if (template?.body) {
        message = template.body;
        for (const [key, value] of Object.entries(request.template_data)) {
          message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
      }
    }

    // Send SMS via Africa's Talking API
    let smsResult: AfricasTalkingResponse | null = null;
    let smsError: string | null = null;

    if (atApiKey) {
      const apiUrl = atUsername === 'sandbox' 
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'apiKey': atApiKey,
          },
          body: new URLSearchParams({
            username: atUsername,
            to: validRecipients.join(','),
            message: message,
            from: atSenderId,
          }),
        });

        if (response.ok) {
          smsResult = await response.json();
        } else {
          smsError = `API error: ${response.status} ${response.statusText}`;
        }
      } catch (e) {
        smsError = `Network error: ${e.message}`;
      }
    } else {
      // No API key - log only mode
      console.log("SMS (no API key - log only):", {
        to: validRecipients,
        message,
        sender: atSenderId,
      });
    }

    // Log to communication_logs
    const messageId = `SMS-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    for (const phone of validRecipients) {
      await supabaseAdmin.from('communication_logs').insert({
        user_id: request.user_id,
        loan_id: request.loan_id,
        channel: 'sms',
        direction: 'outbound',
        recipient: phone,
        sender: atSenderId,
        content: message,
        template_code: request.template_code,
        template_variables: request.template_data,
        status: smsError ? 'failed' : 'sent',
        provider: 'africastalking',
        provider_message_id: messageId,
        segments: Math.ceil(message.length / 153),
        sent_at: smsError ? null : new Date().toISOString(),
        failed_at: smsError ? new Date().toISOString() : null,
        failure_reason: smsError,
        metadata: { api_response: smsResult },
      });
    }

    return new Response(
      JSON.stringify({
        success: !smsError,
        message_id: messageId,
        recipients_count: validRecipients.length,
        invalid_numbers: invalidRecipients.length > 0 ? invalidRecipients : undefined,
        error: smsError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in send-sms function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
