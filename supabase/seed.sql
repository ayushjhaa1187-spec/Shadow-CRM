-- Shadow CRM: Seed Data
-- This file seeds demo data for development.
-- NOTE: In production, user_id would come from auth.users.
-- For local dev, replace 'DEMO_USER_ID' with an actual user UUID after signup.

-- You can run this after creating a user in the auth system:
-- UPDATE the variable below with your user's UUID.

-- Example contacts
-- INSERT INTO contacts (user_id, name, email, phone, company, status, notes, tags, last_contacted_at)
-- VALUES
--   ('YOUR_USER_UUID', 'Sarah Chen', 'sarah@acmecorp.com', '+1-415-555-0101', 'Acme Corp', 'customer', 'Enterprise client, renewed Q1 2024. Key decision maker for APAC expansion.', ARRAY['enterprise', 'apac', 'renewal'], '2024-12-15T10:00:00Z'),
--   ('YOUR_USER_UUID', 'Marcus Johnson', 'marcus.j@techflow.io', '+1-650-555-0102', 'TechFlow', 'prospect', 'Interested in our analytics platform. Demo scheduled for next week.', ARRAY['saas', 'analytics', 'demo-scheduled'], '2024-12-20T14:30:00Z'),
--   ('YOUR_USER_UUID', 'Elena Rodriguez', 'elena@brightpath.co', '+1-212-555-0103', 'BrightPath Consulting', 'lead', 'Inbound from website. Downloaded CRM whitepaper.', ARRAY['consulting', 'inbound', 'whitepaper'], NULL),
--   ('YOUR_USER_UUID', 'David Kim', 'david.kim@nexgen.dev', '+1-310-555-0104', 'NexGen Development', 'prospect', 'Referred by Marcus Johnson. Looking for pipeline management solution.', ARRAY['referral', 'pipeline', 'developer-tools'], '2024-12-18T09:15:00Z'),
--   ('YOUR_USER_UUID', 'Priya Patel', 'priya@cloudnine.ai', '+1-408-555-0105', 'CloudNine AI', 'customer', 'Long-term customer since 2023. Upgraded to Enterprise plan.', ARRAY['ai', 'enterprise', 'upsell'], '2025-01-02T16:00:00Z'),
--   ('YOUR_USER_UUID', 'James Wilson', 'jwilson@retrofit.com', NULL, 'Retrofit Inc', 'churned', 'Churned Q4 2024. Price sensitivity. Open to re-engagement if pricing changes.', ARRAY['price-sensitive', 'win-back'], '2024-10-30T11:00:00Z'),
--   ('YOUR_USER_UUID', 'Aisha Okafor', 'aisha@datapulse.ng', '+234-801-555-0107', 'DataPulse', 'lead', 'Met at SaaS Connect conference. Strong fit for our African expansion.', ARRAY['conference', 'africa', 'expansion'], NULL),
--   ('YOUR_USER_UUID', 'Tom Baker', 'tom@steelbridge.co.uk', '+44-20-5555-0108', 'Steel Bridge Partners', 'prospect', 'Financial services firm. Needs compliance features. Budget approved.', ARRAY['finserv', 'compliance', 'budget-approved'], '2024-12-22T13:45:00Z');

-- Example deals (reference contact IDs after inserting contacts)
-- INSERT INTO deals (user_id, contact_id, title, value, currency, stage, expected_close_date, notes)
-- VALUES
--   ('YOUR_USER_UUID', 'CONTACT_1_UUID', 'Acme Corp - Enterprise Renewal', 120000, 'USD', 'negotiation', '2025-02-28T00:00:00Z', 'Annual renewal with 20% uplift. Discussing multi-year commitment.'),
--   ('YOUR_USER_UUID', 'CONTACT_2_UUID', 'TechFlow Analytics Platform', 45000, 'USD', 'proposal', '2025-03-15T00:00:00Z', 'Sent proposal Dec 20. Awaiting feedback from CTO.'),
--   ('YOUR_USER_UUID', 'CONTACT_4_UUID', 'NexGen Pipeline Tool', 28000, 'USD', 'discovery', '2025-04-01T00:00:00Z', 'Initial discovery call completed. Need to map requirements.'),
--   ('YOUR_USER_UUID', 'CONTACT_5_UUID', 'CloudNine AI - Expansion', 200000, 'USD', 'closed_won', '2025-01-15T00:00:00Z', 'Expanded to 500 seats. Largest deal this quarter.'),
--   ('YOUR_USER_UUID', 'CONTACT_8_UUID', 'Steel Bridge Compliance Suite', 85000, 'GBP', 'proposal', '2025-03-30T00:00:00Z', 'Compliance module + API access. Legal review in progress.');

-- Example activities
-- INSERT INTO activities (user_id, contact_id, deal_id, type, description, scheduled_at, completed_at)
-- VALUES
--   ('YOUR_USER_UUID', 'CONTACT_1_UUID', 'DEAL_1_UUID', 'meeting', 'Quarterly business review with Sarah and VP of Sales', '2025-01-15T10:00:00Z', '2025-01-15T11:00:00Z'),
--   ('YOUR_USER_UUID', 'CONTACT_2_UUID', 'DEAL_2_UUID', 'email', 'Sent follow-up on proposal with updated pricing tiers', NULL, '2024-12-21T09:30:00Z'),
--   ('YOUR_USER_UUID', 'CONTACT_3_UUID', NULL, 'call', 'Initial outreach call - left voicemail', NULL, '2024-12-19T14:00:00Z'),
--   ('YOUR_USER_UUID', 'CONTACT_4_UUID', 'DEAL_3_UUID', 'meeting', 'Discovery call - requirements gathering session', '2024-12-23T15:00:00Z', '2024-12-23T16:00:00Z'),
--   ('YOUR_USER_UUID', 'CONTACT_5_UUID', 'DEAL_4_UUID', 'note', 'Contract signed. Onboarding scheduled for Jan 20.', NULL, '2025-01-10T10:00:00Z'),
--   ('YOUR_USER_UUID', 'CONTACT_2_UUID', 'DEAL_2_UUID', 'meeting', 'Technical deep-dive with TechFlow engineering team', '2025-01-08T14:00:00Z', NULL),
--   ('YOUR_USER_UUID', 'CONTACT_8_UUID', 'DEAL_5_UUID', 'email', 'Sent compliance documentation and security questionnaire responses', NULL, '2024-12-22T16:30:00Z');

-- NOTE: Uncomment above and replace UUIDs after creating your first user account.
-- The seed data represents a realistic CRM state with contacts at various stages.
