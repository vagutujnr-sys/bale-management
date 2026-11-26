-- Phone-first accounts, resumable onboarding, and multiple farms per farmer.
-- Safe to run more than once. Existing farmers columns and profile links remain intact.

BEGIN;

-- Store the normalized phone on the account so incomplete accounts can be found
-- before a farmer or driver business record exists.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_e164 text;

-- Phone-first farmer accounts have no farmer record until onboarding is complete.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_check;

-- Keep existing operational roles and allow the phone-first driver roles.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check CHECK (
    role IN (
      'unassigned',
      'farmer',
      'farmer_registrar',
      'contract_officer',
      'transport_clerk',
      'delivery_clerk',
      'grower_verification_clerk',
      'gate_clerk',
      'receiving_clerk',
      'quality_grader',
      'price_officer',
      'buyer_supervisor',
      'finance_officer',
      'warehouse_clerk',
      'dispatch_officer',
      'destination_receiver',
      'management',
      'system_administrator',
      'driver',
      'transporter'
    )
  );

-- Backfill phone-based accounts from the email alias used by the current auth flow.
UPDATE public.profiles AS profile
SET phone_e164 = '+' || regexp_replace(lower(auth_user.email), '@phone\.auth\.invalid$', '')
FROM auth.users AS auth_user
WHERE auth_user.id = profile.user_id
  AND lower(auth_user.email) ~ '^[0-9]+@phone\.auth\.invalid$'
  AND profile.phone_e164 IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_e164_unique_idx
  ON public.profiles (phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- Save registration progress independently of the complete operational records.
CREATE TABLE IF NOT EXISTS public.account_onboarding (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (user_id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('farmer', 'driver', 'transporter')),
  current_step text NOT NULL DEFAULT 'profile',
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(form_data) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.account_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_onboarding_owner_access ON public.account_onboarding;
CREATE POLICY account_onboarding_owner_access
  ON public.account_onboarding
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.account_onboarding FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_onboarding TO authenticated;
GRANT ALL ON public.account_onboarding TO service_role;

-- A farmer account can own multiple farms. farmer_id remains nullable while
-- onboarding is incomplete and can be linked to the legacy farmer record later.
CREATE TABLE IF NOT EXISTS public.farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_user_id uuid NOT NULL
    REFERENCES public.profiles (user_id) ON DELETE CASCADE,
  farmer_id uuid
    REFERENCES public.farmers (id) ON DELETE SET NULL,
  farm_name text NOT NULL CHECK (length(btrim(farm_name)) > 0),
  province text,
  district text,
  ward text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farms_profile_user_id_idx
  ON public.farms (profile_user_id);

CREATE INDEX IF NOT EXISTS farms_farmer_id_idx
  ON public.farms (farmer_id)
  WHERE farmer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS farms_one_primary_per_profile_idx
  ON public.farms (profile_user_id)
  WHERE is_primary;

-- Preserve each existing account's current farm as its primary farm.
INSERT INTO public.farms (
  profile_user_id,
  farmer_id,
  farm_name,
  province,
  district,
  ward,
  is_primary
)
SELECT
  profile.user_id,
  farmer.id,
  farmer.farm_name,
  farmer.province,
  farmer.district,
  farmer.ward,
  true
FROM public.profiles AS profile
JOIN public.farmers AS farmer
  ON farmer.id = profile.farmer_id
WHERE profile.role = 'farmer'
  AND nullif(btrim(farmer.farm_name), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.farms AS existing_farm
    WHERE existing_farm.profile_user_id = profile.user_id
      AND existing_farm.is_primary
  );

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS farms_owner_access ON public.farms;
CREATE POLICY farms_owner_access
  ON public.farms
  FOR ALL
  TO authenticated
  USING (profile_user_id = (SELECT auth.uid()))
  WITH CHECK (
    profile_user_id = (SELECT auth.uid())
    AND (
      farmer_id IS NULL
      OR farmer_id = (
        SELECT profile.farmer_id
        FROM public.profiles AS profile
        WHERE profile.user_id = (SELECT auth.uid())
          AND profile.role = 'farmer'
      )
    )
  );

REVOKE ALL ON public.farms FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farms TO authenticated;
GRANT ALL ON public.farms TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;