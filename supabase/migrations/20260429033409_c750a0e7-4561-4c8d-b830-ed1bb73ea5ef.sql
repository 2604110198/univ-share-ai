
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_folder_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bootstrap_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_my_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile(text) TO authenticated;
