/**
 * Audit Logging Service
 * Records all API operations for compliance and debugging
 */

import { getServiceClient } from './auth.ts';

export interface AuditEntry {
  user_id: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create audit log entry
 */
export async function createAuditLog(entry: AuditEntry): Promise<void> {
  const supabase = getServiceClient();
  
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: entry.user_id,
      action: entry.action,
      table_name: entry.table_name,
      record_id: entry.record_id || null,
      old_data: entry.old_data || null,
      new_data: entry.new_data || null,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      metadata: entry.metadata || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Audit log error:', error.message);
    }
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}

/**
 * Extract client info from request for audit logging
 */
export function extractClientInfo(req: Request): {
  ip_address: string;
  user_agent: string;
} {
  return {
    ip_address: req.headers.get('x-forwarded-for') || 
                req.headers.get('x-real-ip') || 
                'unknown',
    user_agent: req.headers.get('user-agent') || 'unknown',
  };
}

/**
 * Audit decorator for API operations
 */
export async function withAudit<T>(
  userId: string,
  action: string,
  tableName: string,
  recordId: string | undefined,
  req: Request,
  operation: () => Promise<T>
): Promise<T> {
  const clientInfo = extractClientInfo(req);
  const startTime = Date.now();
  
  try {
    const result = await operation();
    
    // Log successful operation
    await createAuditLog({
      user_id: userId,
      action: `${action}_SUCCESS`,
      table_name: tableName,
      record_id: recordId,
      metadata: {
        duration_ms: Date.now() - startTime,
      },
      ...clientInfo,
    });
    
    return result;
  } catch (err) {
    // Log failed operation
    await createAuditLog({
      user_id: userId,
      action: `${action}_FAILED`,
      table_name: tableName,
      record_id: recordId,
      metadata: {
        duration_ms: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      ...clientInfo,
    });
    
    throw err;
  }
}

/**
 * Log financial operation with before/after states
 */
export async function logFinancialOperation(
  userId: string,
  action: string,
  tableName: string,
  recordId: string,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown>,
  req: Request
): Promise<void> {
  const clientInfo = extractClientInfo(req);
  
  await createAuditLog({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_data: oldData || undefined,
    new_data: newData,
    ...clientInfo,
  });
}
