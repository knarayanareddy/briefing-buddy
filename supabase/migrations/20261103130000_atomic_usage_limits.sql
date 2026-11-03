-- Atomic daily usage limits.
-- The previous implementation did SELECT-then-UPSERT in application code,
-- which is racy (two concurrent requests could both pass the check) and
-- failed open on errors. This function performs check-and-increment in one
-- statement under a row lock, so concurrent callers serialize correctly.

CREATE OR REPLACE FUNCTION public.consume_daily_usage(
  p_user_id uuid,
  p_type text,      -- 'generate' | 'render'
  p_limit int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF p_type NOT IN ('generate', 'render') THEN
    RAISE EXCEPTION 'invalid usage type: %', p_type;
  END IF;

  IF p_type = 'generate' THEN
    INSERT INTO public.briefing_usage_limits (user_id, day, generate_count, render_count)
    VALUES (p_user_id, CURRENT_DATE, 1, 0)
    ON CONFLICT (user_id, day) DO UPDATE
      SET generate_count = public.briefing_usage_limits.generate_count + 1
      WHERE public.briefing_usage_limits.generate_count < p_limit
    RETURNING generate_count INTO v_count;

    IF v_count IS NULL THEN
      SELECT generate_count INTO v_count
      FROM public.briefing_usage_limits
      WHERE user_id = p_user_id AND day = CURRENT_DATE;
      RETURN jsonb_build_object('exceeded', true, 'current', COALESCE(v_count, p_limit));
    END IF;
  ELSE
    INSERT INTO public.briefing_usage_limits (user_id, day, generate_count, render_count)
    VALUES (p_user_id, CURRENT_DATE, 0, 1)
    ON CONFLICT (user_id, day) DO UPDATE
      SET render_count = public.briefing_usage_limits.render_count + 1
      WHERE public.briefing_usage_limits.render_count < p_limit
    RETURNING render_count INTO v_count;

    IF v_count IS NULL THEN
      SELECT render_count INTO v_count
      FROM public.briefing_usage_limits
      WHERE user_id = p_user_id AND day = CURRENT_DATE;
      RETURN jsonb_build_object('exceeded', true, 'current', COALESCE(v_count, p_limit));
    END IF;
  END IF;

  RETURN jsonb_build_object('exceeded', false, 'current', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_daily_usage(uuid, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_daily_usage(uuid, text, int) FROM anon;
REVOKE ALL ON FUNCTION public.consume_daily_usage(uuid, text, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_daily_usage(uuid, text, int) TO service_role;
