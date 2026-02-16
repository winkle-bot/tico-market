-- Bump expiry for all expired listings to 30 days from now
update public.listings
set expires_at = now() + interval '30 days'
where expires_at < now() or expires_at is null;
