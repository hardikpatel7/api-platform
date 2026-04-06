-- 006_users_email.sql
-- Adds email column to public.users for admin pre-registration linking.
-- When an admin pre-registers a user slot with an email, the register flow
-- can look up the slot by email and adopt its role for the new signup.

alter table public.users add column if not exists email text unique;
