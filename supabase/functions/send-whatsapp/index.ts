import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  to: string;
  template_name?: string;
  template_data?: Record<string, string>;
  message?: string;
  user_id?: string;
  loan_id?: string;
}

interface WhatsAppAPIResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

// Format phone number for WhatsApp (no + prefix)
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '264' + cleaned.substring(1);
  } else if (!cleaned.startsWith('264') && cleaned.length === 9) {
    cleaned = '264' + cleaned;
  }
  
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: WhatsAppRequest = await req.json();
    
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

    // Check if user has staff role
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

    // Get WhatsApp Business API credentials
    const waPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const waAccessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const waBusinessId = Deno.env.get("WHATSAPP_BUSINESS_ID");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const formattedPhone = formatPhoneNumber(request.to);
    const messageId = `WA-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    let waResult: WhatsAppAPIResponse | null = null;
    let waError: string | null = null;
    let messageContent = request.message || '';

    if (waPhoneNumberId && waAccessToken) {
      const apiUrl = `https://graph.facebook.com/v18.0/${waPhoneNumberId}/messages`;

      try {
        let requestBody: Record<string, unknown>;

        if (request.template_name) {
          // Send template message
          const components: Array<Record<string, unknown>> = [];
          
          if (request.template_data && Object.keys(request.template_data).length > 0) {
            components.push({
              type: "body",
              parameters: Object.values(request.template_data).map(value => ({
                type: "text",
                text: value,
              })),
            });
          }

          requestBody = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
              name: request.template_name,
              language: { code: "en" },
              components: components.length > 0 ? components : undefined,
            },
          };

          messageContent = `Template: ${request.template_name}`;
        } else if (request.message) {
          // Send text message
          requestBody = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "text",
            text: { body: request.message },
          };
        } else {
          throw new Error("Either template_name or message is required");
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          waResult = await response.json();
        } else {
          const errorData = await response.json();
          waError = `API error: ${response.status} - ${JSON.stringify(errorData)}`;
        }
      } catch (e) {
        waError = `Network error: ${e.message}`;
      }
    } else {
      // No API credentials - log only mode
      console.log("WhatsApp (no API credentials - log only):", {
        to: formattedPhone,
        template: request.template_name,
        message: request.message,
      });
    }

    // Log to communication_logs
    await supabaseAdmin.from('communication_logs').insert({
      user_id: request.user_id,
      loan_id: request.loan_id,
      channel: 'whatsapp',
      direction: 'outbound',
      recipient: formattedPhone,
      content: messageContent,
      template_code: request.template_name,
      template_variables: request.template_data,
      status: waError ? 'failed' : 'sent',
      provider: 'meta_whatsapp',
      provider_message_id: waResult?.messages?.[0]?.id || messageId,
      sent_at: waError ? null : new Date().toISOString(),
      failed_at: waError ? new Date().toISOString() : null,
      failure_reason: waError,
      metadata: { 
        api_response: waResult,
        wa_id: waResult?.contacts?.[0]?.wa_id,
      },
    });

    // Update or create WhatsApp conversation record
    await supabaseAdmin.from('whatsapp_conversations').upsert({
      user_id: request.user_id,
      phone_number: formattedPhone,
      wa_id: waResult?.contacts?.[0]?.wa_id,
      status: 'active',
      last_message_at: new Date().toISOString(),
      last_message_direction: 'outbound',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hour window
    }, {
      onConflict: 'phone_number',
    });

    return new Response(
      JSON.stringify({
        success: !waError,
        message_id: waResult?.messages?.[0]?.id || messageId,
        wa_id: waResult?.contacts?.[0]?.wa_id,
        error: waError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in send-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
