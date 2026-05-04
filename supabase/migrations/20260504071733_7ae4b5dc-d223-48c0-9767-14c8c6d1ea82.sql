REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_my_profile(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_post_view(uuid) FROM anon;