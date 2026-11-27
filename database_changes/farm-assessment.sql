-- Prerequisite: public.farms must already exist (see database_changes/changes.sql).
BEGIN;

ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS farm_size_ha numeric(12, 2),
  ADD COLUMN IF NOT EXISTS expected_production_kg numeric(14, 2),
  ADD COLUMN IF NOT EXISTS photo_paths text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS assessment_notes text,
  ADD COLUMN IF NOT EXISTS assessed_by uuid REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles (user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'farms_size_positive'
      AND conrelid = 'public.farms'::regclass
  ) THEN
    ALTER TABLE public.farms
      ADD CONSTRAINT farms_size_positive
      CHECK (farm_size_ha IS NULL OR farm_size_ha > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'farms_expected_production_positive'
      AND conrelid = 'public.farms'::regclass
  ) THEN
    ALTER TABLE public.farms
      ADD CONSTRAINT farms_expected_production_positive
      CHECK (expected_production_kg IS NULL OR expected_production_kg > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'farms_photo_count_limit'
      AND conrelid = 'public.farms'::regclass
  ) THEN
    ALTER TABLE public.farms
      ADD CONSTRAINT farms_photo_count_limit
      CHECK (cardinality(photo_paths) <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'farms_review_status_valid'
      AND conrelid = 'public.farms'::regclass
  ) THEN
    ALTER TABLE public.farms
      ADD CONSTRAINT farms_review_status_valid
      CHECK (
        review_status IN (
          'draft',
          'pending_assessment',
          'pending_approval',
          'approved',
          'rejected'
        )
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS farms_review_queue_idx
  ON public.farms (review_status, submitted_at)
  WHERE review_status IN ('pending_assessment', 'pending_approval');

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'farm-photos',
  'farm-photos',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS farm_photos_owner_insert ON storage.objects;
CREATE POLICY farm_photos_owner_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'farm-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS farm_photos_owner_read ON storage.objects;
CREATE POLICY farm_photos_owner_read
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'farm-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS farm_photos_owner_delete ON storage.objects;
CREATE POLICY farm_photos_owner_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'farm-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
