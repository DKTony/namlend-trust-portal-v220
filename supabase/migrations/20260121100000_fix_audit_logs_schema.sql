-- ============================================================================
-- FIX: Add missing audit_logs columns for branding configuration updates
-- This adds columns that were supposed to be added by 20251009100000 migration
-- ============================================================================

-- Add missing columns to audit_logs table (safe - only adds if missing)
DO $$
BEGIN
  -- Add entity_type column (used by update_config RPC)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
    AND column_name = 'entity_type'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN entity_type TEXT;
  END IF;

  -- Add entity_id column (replaces record_id in new schema)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
    AND column_name = 'entity_id'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN entity_id UUID;
  END IF;

  -- Add old_state column (replaces old_values in new schema)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
    AND column_name = 'old_state'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN old_state JSONB;
  END IF;

  -- Add new_state column (replaces new_values in new schema)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
    AND column_name = 'new_state'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN new_state JSONB;
  END IF;

  -- Add user_role column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
    AND column_name = 'user_role'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN user_role TEXT;
  END IF;

  -- Add session_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN session_id TEXT;
  END IF;

  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes for better query performance (safe - creates only if missing)
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);

-- Refresh schema cache to ensure PostgREST recognizes the new columns
NOTIFY pgrst, 'reload schema';
