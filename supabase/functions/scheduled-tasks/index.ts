import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Scheduled Tasks Edge Function
 * Runs via pg_cron to:
 * 1. Mark overdue payments
 * 2. Process notification queue
 * 3. Send payment reminders
 * 4. Check and mark broken promises
 */

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tasks: {},
  };

  try {
    // Task 1: Mark overdue payments
    try {
      const { data: overdueResult, error: overdueError } = await supabase.rpc('mark_overdue_payments');
      results.tasks = {
        ...results.tasks as Record<string, unknown>,
        mark_overdue_payments: overdueError ? { error: overdueError.message } : overdueResult,
      };
    } catch (e) {
      results.tasks = {
        ...results.tasks as Record<string, unknown>,
        mark_overdue_payments: { error: (e as Error).message },
      };
    }

    // Task 2: Process notification queue
    try {
      const { data: notifResult, error: notifError } = await supabase.rpc('process_notification_queue');
      results.tasks = {
        ...results.tasks as Record<string, unknown>,
        process_notifications: notifError ? { error: notifError.message } : { processed: notifResult },
      };
    } catch (e) {
      results.tasks = {
        ...results.tasks as Record<string, unknown>,
        process_notifications: { error: (e as Error).message },
      };
    }

    // Task 3: Send payment reminders (7 days, 3 days, 1 day before due)
    try {
      // Get schedules due in 7, 3, or 1 days
      const reminderDays = [7, 3, 1];
      let remindersSent = 0;

      for (const days of reminderDays) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        const dateStr = targetDate.toISOString().split('T')[0];

        const { data: dueSchedules } = await supabase
          .from('payment_schedules')
          .select(`
            id,
            loan_id,
            due_date,
            principal_amount,
            interest_amount,
            fee_amount,
            loans!inner(user_id)
          `)
          .eq('status', 'pending')
          .eq('due_date', dateStr);

        if (dueSchedules && dueSchedules.length > 0) {
          for (const schedule of dueSchedules) {
            const totalAmount = (schedule.principal_amount || 0) + 
                               (schedule.interest_amount || 0) + 
                               (schedule.fee_amount || 0);
            
            const templateCode = days === 7 ? 'PAYMENT_DUE_7_DAYS' :
                                days === 3 ? 'PAYMENT_DUE_3_DAYS' : 'PAYMENT_DUE_1_DAY';

            await supabase.rpc('queue_notification', {
              p_user_id: (schedule.loans as { user_id: string }).user_id,
              p_template_code: templateCode,
              p_data: {
                amount: totalAmount.toFixed(2),
                dueDate: schedule.due_date,
                reference: schedule.loan_id,
              },
            });

            remindersSent++;
          }
        }
      }

      results.tasks = {
        ...results.tasks as Record<string, unknown>,
        payment_reminders: { sent: remindersSent },
      };
    } catch (e) {
      results.tasks = {
        ...results.tasks as Record<string, unknown>,
        payment_reminders: { error: (e as Error).message },
      };
    }

    // Task 4: Mark broken promises (promises past their date that weren't kept)
    try {
      const { data: brokenPromises, error: promiseError } = await supabase
        .from('promise_to_pay')
        .update({ 
          status: 'broken',
          resolved_at: new Date().toISOString(),
        })
        .eq('status', 'pending')
        .lt('promised_date', new Date().toISOString().split('T')[0])
        .select('id');

      results.tasks = {
        ...results.tasks as Record<string, unknown>,
        broken_promises: promiseError 
          ? { error: promiseError.message } 
          : { marked: brokenPromises?.length || 0 },
      };
    } catch (e) {
      results.tasks = {
        ...results.tasks as Record<string, unknown>,
        broken_promises: { error: (e as Error).message },
      };
    }

    // Task 5: Send overdue notifications
    try {
      const { data: overdueLoans } = await supabase
        .from('payment_schedules')
        .select(`
          id,
          loan_id,
          due_date,
          days_overdue,
          principal_amount,
          interest_amount,
          fee_amount,
          amount_paid,
          loans!inner(user_id)
        `)
        .eq('status', 'overdue')
        .gt('days_overdue', 0);

      let overdueNotificationsSent = 0;

      if (overdueLoans && overdueLoans.length > 0) {
        // Group by loan to avoid duplicate notifications
        const loanMap = new Map<string, typeof overdueLoans[0]>();
        for (const schedule of overdueLoans) {
          if (!loanMap.has(schedule.loan_id) || 
              (loanMap.get(schedule.loan_id)?.days_overdue || 0) < schedule.days_overdue) {
            loanMap.set(schedule.loan_id, schedule);
          }
        }

        for (const [loanId, schedule] of loanMap) {
          // Only send if days_overdue is 1, 7, 14, 30, 60, 90 (milestone days)
          const milestoneDays = [1, 7, 14, 30, 60, 90];
          if (milestoneDays.includes(schedule.days_overdue)) {
            const totalAmount = (schedule.principal_amount || 0) + 
                               (schedule.interest_amount || 0) + 
                               (schedule.fee_amount || 0) -
                               (schedule.amount_paid || 0);

            await supabase.rpc('queue_notification', {
              p_user_id: (schedule.loans as { user_id: string }).user_id,
              p_template_code: 'PAYMENT_OVERDUE',
              p_data: {
                amount: totalAmount.toFixed(2),
                dueDate: schedule.due_date,
                daysOverdue: schedule.days_overdue.toString(),
              },
            });

            overdueNotificationsSent++;
          }
        }
      }

      results.tasks = {
        ...results.tasks as Record<string, unknown>,
        overdue_notifications: { sent: overdueNotificationsSent },
      };
    } catch (e) {
      results.tasks = {
        ...results.tasks as Record<string, unknown>,
        overdue_notifications: { error: (e as Error).message },
      };
    }

    // Log task execution
    await supabase.from('audit_logs').insert({
      table_name: 'scheduled_tasks',
      action: 'execute',
      new_values: results,
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in scheduled-tasks function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
