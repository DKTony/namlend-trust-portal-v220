import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  type: string;
  title: string;
  message: string;
  email?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, type, title, message, email }: NotificationRequest = await req.json();

    // Authenticate the request using the Authorization header
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // User-scoped client to enforce RLS and get user/roles
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 },
      );
    }
    const currentUser = authData.user;

    // Determine permissions: user can notify themselves; admins/loan_officers can notify others
    let canNotify = false;
    if (currentUser.id === user_id) {
      canNotify = true;
    } else {
      const { data: roleData, error: roleError } = await supabaseUser
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (!roleError) {
        const role = roleData?.role as string | null;
        if (role === 'admin' || role === 'loan_officer') {
          canNotify = true;
        }
      }
    }

    if (!canNotify) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 },
      );
    }

    // Admin client for privileged insert (bypasses RLS after explicit checks)
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Insert notification into database
    const { error: notificationError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id,
        type,
        title,
        message,
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      throw notificationError;
    }

    // Send email notification if email is provided
    if (email) {
      // Here you would integrate with an email service like Resend
      // For now, we'll just log the email content
      console.log("Email notification:", {
        to: email,
        subject: title,
        body: message,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});