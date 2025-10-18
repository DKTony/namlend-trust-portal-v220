-- Documents table and Storage bucket setup (idempotent)
create extension if not exists pgcrypto;

-- Create documents table if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'documents'
  ) THEN
    CREATE TABLE public.documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      document_type text NOT NULL CHECK (document_type IN ('id_card','proof_income','bank_statement','other')),
      file_url text NOT NULL,
      file_name text NOT NULL,
      file_size bigint,
      uploaded_at timestamptz NOT NULL DEFAULT now(),
      verified boolean NOT NULL DEFAULT false,
      verified_at timestamptz,
      verified_by uuid REFERENCES auth.users(id)
    );
  END IF;
END
$$;

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Policies (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents_select_own'
  ) THEN
    CREATE POLICY documents_select_own ON public.documents
    FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents_insert_own'
  ) THEN
    CREATE POLICY documents_insert_own ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents_update_own'
  ) THEN
    CREATE POLICY documents_update_own ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents_delete_own'
  ) THEN
    CREATE POLICY documents_delete_own ON public.documents
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Create Storage bucket 'documents' if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    PERFORM storage.create_bucket('documents', FALSE);
  END IF;
END
$$;

-- Storage policies for 'documents' bucket (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'documents_storage_select_own'
  ) THEN
    CREATE POLICY documents_storage_select_own
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND owner = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'documents_storage_insert_own'
  ) THEN
    CREATE POLICY documents_storage_insert_own
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND owner = auth.uid());
  END IF;
END
$$;
