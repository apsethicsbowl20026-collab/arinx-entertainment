-- Add a role to user accounts for the admin console.
-- Roles: 'user' (default), 'admin' (can moderate content), 'owner' (full access, cannot be demoted or deleted).
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
