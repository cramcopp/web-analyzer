ALTER TABLE users ADD COLUMN add_ons_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN stripe_addon_subscriptions_json TEXT NOT NULL DEFAULT '{}';
