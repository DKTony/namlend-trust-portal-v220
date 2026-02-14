-- ============================================================================
-- BRANDING CONFIGURATION AND STORAGE
-- White-label customization for NamLend backoffice
-- Migration: 20260120_branding_configuration.sql
-- ============================================================================

-- Insert default branding configuration into system_configuration
INSERT INTO system_configuration (config_key, config_value, description, category, is_sensitive)
VALUES
(
    'branding.general',
    '{
        "company_name": "NamLend",
        "company_tagline": "Trust & Finance",
        "support_email": "support@namlend.com",
        "support_phone": "+264 61 123 456"
    }'::jsonb,
    'General company branding information',
    'branding',
    FALSE
),
(
    'branding.colors',
    '{
        "primary_color": "#0EA5E9",
        "secondary_color": "#10B981",
        "accent_color": "#8b5cf6",
        "use_custom_colors": false
    }'::jsonb,
    'Custom color scheme settings',
    'branding',
    FALSE
),
(
    'branding.assets',
    '{
        "logo_url": null,
        "favicon_url": null,
        "logo_width": 120,
        "logo_height": 40,
        "show_company_name_with_logo": true
    }'::jsonb,
    'Logo and favicon asset URLs and display settings',
    'branding',
    FALSE
),
(
    'branding.meta',
    '{
        "page_title_template": "{company_name} - {page_name}",
        "meta_description": "Professional loan management platform",
        "og_image_url": null
    }'::jsonb,
    'Page metadata and SEO settings',
    'branding',
    FALSE
)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- CREATE PUBLIC BRANDING ASSETS STORAGE BUCKET
-- ============================================================================

DO $$
BEGIN
    -- Create branding-assets bucket if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'branding-assets') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'branding-assets',
            'branding-assets',
            TRUE,  -- PUBLIC bucket for serving logos/favicons
            5242880,  -- 5MB max file size
            ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
        );
    END IF;
END
$$;

-- ============================================================================
-- STORAGE POLICIES FOR BRANDING ASSETS
-- Admin-only upload/modify, public read
-- ============================================================================

-- Policy: Anyone can read branding assets (public bucket)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname = 'branding_assets_public_read'
    ) THEN
        CREATE POLICY branding_assets_public_read
        ON storage.objects FOR SELECT
        USING (bucket_id = 'branding-assets');
    END IF;
END
$$;

-- Policy: Only admins can upload branding assets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname = 'branding_assets_admin_insert'
    ) THEN
        CREATE POLICY branding_assets_admin_insert
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'branding-assets'
            AND EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END
$$;

-- Policy: Only admins can update branding assets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname = 'branding_assets_admin_update'
    ) THEN
        CREATE POLICY branding_assets_admin_update
        ON storage.objects FOR UPDATE
        USING (
            bucket_id = 'branding-assets'
            AND EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END
$$;

-- Policy: Only admins can delete branding assets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname = 'branding_assets_admin_delete'
    ) THEN
        CREATE POLICY branding_assets_admin_delete
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'branding-assets'
            AND EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END
$$;

-- ============================================================================
-- RPC FUNCTION: Get Public Branding Configuration
-- Available to all authenticated users (not just admins)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_public_branding_config()
RETURNS TABLE (
    config_key TEXT,
    config_value JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Public branding config is readable by any authenticated user
    -- No admin check needed - this is intentional for branding to display
    RETURN QUERY
    SELECT
        sc.config_key,
        sc.config_value
    FROM system_configuration sc
    WHERE sc.category = 'branding'
    AND sc.is_sensitive = FALSE
    ORDER BY sc.config_key;
END;
$$;

-- Grant execute to all authenticated users
GRANT EXECUTE ON FUNCTION get_public_branding_config() TO authenticated;

-- ============================================================================
-- AUDIT TRIGGER FOR BRANDING CHANGES
-- Logs all branding configuration updates
-- ============================================================================

CREATE OR REPLACE FUNCTION log_branding_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log branding category changes
    IF NEW.category = 'branding' THEN
        INSERT INTO audit_logs (
            action,
            entity_type,
            entity_id,
            old_state,
            new_state,
            user_id
        ) VALUES (
            'update',
            'system_configuration',
            NEW.id,
            jsonb_build_object('config_key', OLD.config_key, 'config_value', OLD.config_value),
            jsonb_build_object('config_key', NEW.config_key, 'config_value', NEW.config_value),
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'branding_config_audit_trigger'
    ) THEN
        CREATE TRIGGER branding_config_audit_trigger
        AFTER UPDATE ON system_configuration
        FOR EACH ROW
        EXECUTE FUNCTION log_branding_config_change();
    END IF;
END
$$;
