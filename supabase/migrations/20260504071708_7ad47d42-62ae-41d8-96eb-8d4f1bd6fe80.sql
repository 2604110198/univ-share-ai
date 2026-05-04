GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_post_view(uuid) TO authenticated;