-- Run once on existing DBs: npm run db:patch
ALTER TABLE orders ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;
