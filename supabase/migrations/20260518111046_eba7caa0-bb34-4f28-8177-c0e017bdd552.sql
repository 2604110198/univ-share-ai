
-- Password hints: encrypted copy of the user's current password so we can
-- show a partially-masked version when they forget it.
CREATE TABLE IF NOT EXISTS public.password_hints (
  user_id uuid PRIMARY KEY,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.password_hints ENABLE ROW LEVEL SECURITY;

-- No client RLS access. All reads/writes go through server functions
-- that use the service-role client. (Admin can manage if ever needed.)
CREATE POLICY "Admins manage password hints" ON public.password_hints
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Password recovery requests
CREATE TABLE IF NOT EXISTS public.password_recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  identifier text NOT NULL,
  full_name text,
  role text,
  status text NOT NULL DEFAULT 'pending',
  temp_password text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.password_recovery_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own recovery requests" ON public.password_recovery_requests
  FOR SELECT USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage recovery requests" ON public.password_recovery_requests
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_recovery_status ON public.password_recovery_requests(status, requested_at DESC);
