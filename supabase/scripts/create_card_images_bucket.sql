-- =============================================================================
-- Create storage bucket for card banner images
-- Run this in Supabase SQL Editor (storage schema not in normal migrations)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'card-images',
  'card-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view (public bucket)
CREATE POLICY "Public read access for card images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'card-images');

-- Authenticated operators can upload
CREATE POLICY "Operators can upload card images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'card-images'
    AND (SELECT get_user_role()) IN ('super_admin', 'admin', 'operator')
  );

-- Operators can delete their uploads
CREATE POLICY "Operators can delete card images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'card-images'
    AND (SELECT get_user_role()) IN ('super_admin', 'admin', 'operator')
  );
