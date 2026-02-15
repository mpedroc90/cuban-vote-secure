
-- RPC function to increment president votes
CREATE OR REPLACE FUNCTION public.increment_president_votes(candidate_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.candidates SET president_votes = president_votes + 1 WHERE id = candidate_id;
END;
$$;

-- RPC function to increment member votes
CREATE OR REPLACE FUNCTION public.increment_member_votes(candidate_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.candidates SET member_votes = member_votes + 1 WHERE id = candidate_id;
END;
$$;
