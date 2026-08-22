-- Update custom_roles to add granular permissions
alter table public.custom_roles
add column if not exists perm_manage_users boolean default false,
add column if not exists perm_manage_roles boolean default false,
add column if not exists perm_post_announcements boolean default false,
add column if not exists perm_create_channels boolean default false;
