BEGIN;
-- Supabase exposes public-schema tables via its Data API. These tables are
-- server-only: the PostgreSQL owner used by this app bypasses RLS, while
-- browser anon/authenticated roles must never read credentials or sessions.
DO $$
DECLARE
  table_name TEXT;
  role_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pc_members', 'pc_sessions', 'pc_coaches', 'pc_uploads', 'pc_requests',
    'pc_recipients', 'pc_feedback', 'pc_lessons', 'pc_reviews',
    'pc_upload_blobs', 'pc_credentials', 'pc_auth_limits'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;
COMMIT;
