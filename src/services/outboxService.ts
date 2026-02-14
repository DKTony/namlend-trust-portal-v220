/**
 * TigerBeetle Outbox Service
 * 
 * Handles the outbox pattern for reliable TigerBeetle event posting.
 * Extracted from ledgerService.ts for better separation of concerns.
 * 
 * The outbox pattern ensures:
 * - Atomic writes to Supabase + TigerBeetle queue
 * - Retry logic with exponential backoff
 * - Dead-letter queue for failed events
 * - Browser-safe operation (no direct TigerBeetle client needed)
 * 
 * @module outboxService
 */

import { supabase } from '@/integrations/supabase/client';
import type { LedgerResult, TBEventType, OutboxStatus } from './ledgerService';

/** Outbox entry structure */
export interface OutboxEntry {
  id: string;
  event_type: TBEventType;
  source_table: string;
  source_id: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  last_error?: string;
  tb_transfer_ids?: string[];
  processed_at?: string;
  created_at: string;
}

/** Outbox statistics */
export interface OutboxStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

// ============================================================================
// Outbox Queue Operations
// ============================================================================

/**
 * Queues an event in the TigerBeetle outbox via RPC
 * This is the primary method for browser-safe TigerBeetle operations
 */
export async function queueEvent(
  eventType: TBEventType,
  sourceTable: string,
  sourceId: string,
  payload: Record<string, unknown>
): Promise<LedgerResult<{ outboxId: string }>> {
  try {
    const { data, error } = await supabase.rpc('queue_tigerbeetle_event', {
      p_event_type: eventType,
      p_source_table: sourceTable,
      p_source_id: sourceId,
      p_payload: payload,
    });

    if (error) throw error;
    return { success: true, data: { outboxId: data as string } };
  } catch (error) {
    console.error('❌ queueEvent failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Gets pending outbox entries for processing
 * Used by background workers to process the queue
 */
export async function getPendingEntries(
  limit: number = 100
): Promise<LedgerResult<OutboxEntry[]>> {
  try {
    const { data, error } = await supabase
      .from('tigerbeetle_outbox')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('retry_count', 5)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { success: true, data: data as OutboxEntry[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Gets entries ready for retry (past their next_retry_at time)
 */
export async function getRetryableEntries(
  limit: number = 50
): Promise<LedgerResult<OutboxEntry[]>> {
  try {
    const { data, error } = await supabase
      .from('tigerbeetle_outbox')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 5)
      .lte('next_retry_at', new Date().toISOString())
      .order('next_retry_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { success: true, data: data as OutboxEntry[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Gets dead-letter entries for manual review
 */
export async function getDeadLetterEntries(
  limit: number = 100
): Promise<LedgerResult<OutboxEntry[]>> {
  try {
    const { data, error } = await supabase
      .from('tigerbeetle_outbox')
      .select('*')
      .eq('status', 'dead_letter')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, data: data as OutboxEntry[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Outbox Status Updates
// ============================================================================

/**
 * Marks an entry as processing (claim for work)
 */
export async function claimEntry(
  outboxId: string
): Promise<LedgerResult> {
  try {
    const { error } = await supabase
      .from('tigerbeetle_outbox')
      .update({
        status: 'processing',
      })
      .eq('id', outboxId)
      .eq('status', 'pending'); // Only claim if still pending

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Marks an outbox entry as completed
 */
export async function completeEntry(
  outboxId: string,
  transferIds: string[] = []
): Promise<LedgerResult> {
  try {
    const { error } = await supabase
      .from('tigerbeetle_outbox')
      .update({
        status: 'completed',
        tb_transfer_ids: transferIds,
        processed_at: new Date().toISOString(),
      })
      .eq('id', outboxId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Marks an outbox entry as failed with retry scheduling
 * Uses exponential backoff: 1min, 2min, 4min, 8min, 16min
 */
export async function failEntry(
  outboxId: string,
  errorMessage: string
): Promise<LedgerResult> {
  try {
    // Get current retry count
    const { data: entry } = await supabase
      .from('tigerbeetle_outbox')
      .select('retry_count, max_retries')
      .eq('id', outboxId)
      .single();

    const retryCount = (entry?.retry_count || 0) + 1;
    const maxRetries = entry?.max_retries || 5;
    const nextRetry = new Date(Date.now() + Math.pow(2, retryCount) * 60000);

    const { error } = await supabase
      .from('tigerbeetle_outbox')
      .update({
        status: retryCount >= maxRetries ? 'dead_letter' : 'failed',
        retry_count: retryCount,
        next_retry_at: nextRetry.toISOString(),
        last_error: errorMessage,
      })
      .eq('id', outboxId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Requeue a dead-letter entry for manual retry
 */
export async function requeueDeadLetter(
  outboxId: string
): Promise<LedgerResult> {
  try {
    const { error } = await supabase
      .from('tigerbeetle_outbox')
      .update({
        status: 'pending',
        retry_count: 0,
        last_error: null,
        next_retry_at: null,
      })
      .eq('id', outboxId)
      .eq('status', 'dead_letter');

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Outbox Statistics
// ============================================================================

/**
 * Gets outbox queue statistics
 */
export async function getStats(): Promise<LedgerResult<OutboxStats>> {
  try {
    const { data, error } = await supabase
      .from('tigerbeetle_outbox')
      .select('status');

    if (error) throw error;

    const stats: OutboxStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      deadLetter: 0,
    };

    for (const entry of data || []) {
      switch (entry.status) {
        case 'pending': stats.pending++; break;
        case 'processing': stats.processing++; break;
        case 'completed': stats.completed++; break;
        case 'failed': stats.failed++; break;
        case 'dead_letter': stats.deadLetter++; break;
      }
    }

    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Cleanup old completed entries (retention policy)
 */
export async function cleanupOldEntries(
  daysToKeep: number = 30
): Promise<LedgerResult<{ deleted: number }>> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await supabase
      .from('tigerbeetle_outbox')
      .delete()
      .eq('status', 'completed')
      .lt('processed_at', cutoffDate.toISOString())
      .select('id');

    if (error) throw error;
    return { success: true, data: { deleted: data?.length || 0 } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Queue operations
  queueEvent,
  getPendingEntries,
  getRetryableEntries,
  getDeadLetterEntries,
  
  // Status updates
  claimEntry,
  completeEntry,
  failEntry,
  requeueDeadLetter,
  
  // Statistics
  getStats,
  cleanupOldEntries,
};
