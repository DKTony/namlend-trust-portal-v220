import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoanApplicationRequest {
  loan_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { loan_id }: LoanApplicationRequest = await req.json();
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

    // User-scoped client (enforces RLS)
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

    // Admin client for privileged updates after verification
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get loan and profile information as the authenticated user (RLS enforced)
    const { data: loan, error: loanError } = await supabaseUser
      .from("loans")
      .select(`
        id,
        user_id,
        amount,
        status,
        profiles!loans_user_id_fkey (
          first_name,
          last_name,
          phone_number,
          credit_score,
          verified,
          monthly_income
        )
      `)
      .eq("id", loan_id)
      .single();

    if (loanError || !loan) {
      return new Response(
        JSON.stringify({ error: "Loan not found or access denied" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      );
    }

    // Ensure the caller owns the loan
    if (loan.user_id !== currentUser.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 },
      );
    }

    const profile = loan.profiles;
    if (!profile) {
      throw new Error("Profile not found");
    }

    // All applications go to manual review - no auto-approval
    const approval_status = "under_review";
    const review_notes = "Application submitted and pending manual review by loan officer";

    // Update loan status
    const { error: updateError } = await supabaseAdmin
      .from("loans")
      .update({
        status: approval_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loan_id);

    if (updateError) {
      throw updateError;
    }

    // Log the review
    const { error: reviewError } = await supabaseAdmin
      .from("loan_reviews")
      .insert({
        loan_id,
        previous_status: loan.status,
        new_status: approval_status,
        auto_approved: false,
        review_notes,
      });

    if (reviewError) {
      console.error("Error logging review:", reviewError);
    }

    // Create notification for the client
    const notificationTitle = "Loan Application Received";
    const notificationMessage = `Your loan application for N$${loan.amount.toLocaleString()} has been received and is under review. We'll update you soon.`;

    const { error: notificationError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: loan.user_id,
        type: "loan_under_review",
        title: notificationTitle,
        message: notificationMessage,
      });

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        loan_id,
        status: approval_status,
        message: "Loan application processed successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in process-loan-application function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});