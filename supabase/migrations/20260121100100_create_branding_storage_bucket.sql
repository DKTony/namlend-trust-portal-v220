-- ============================================================================
-- CREATE BRANDING ASSETS STORAGE BUCKET
-- This must be run with elevated permissions (service role or via Dashboard)
-- ============================================================================

-- Create the branding-assets bucket in the storage schema
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'branding-assets',
    'branding-assets',
    TRUE,  -- PUBLIC bucket for serving logos/favicons
    5242880,  -- 5MB max file size
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE RLS POLICIES FOR BRANDING ASSETS
-- Public read, admin-only write
-- ============================================================================

-- Policy: Anyone can read branding assets (public bucket)
CREATE POLICY IF NOT EXISTS "branding_assets_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding-assets');

-- Policy: Only admins can upload branding assets
CREATE POLICY IF NOT EXISTS "branding_assets_admin_insert"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'branding-assets'
    AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Policy: Only admins can update branding assets
CREATE POLICY IF NOT EXISTS "branding_assets_admin_update"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'branding-assets'
    AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Policy: Only admins can delete branding assets
CREATE POLICY IF NOT EXISTS "branding_assets_admin_delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'branding-assets'
    AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);
