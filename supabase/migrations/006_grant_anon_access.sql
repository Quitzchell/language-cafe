-- Temporary: grant broad access to anon role for MVP development.
-- This will be revoked and replaced with Row Level Security policies
-- in a later migration once auth and policy requirements are defined.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;