-- Collectra Phase 1: core schema (PostgreSQL)

-- Create the status enum type conditionally to avoid errors if it already exists
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('stored', 'collected', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'security' -- 'admin' or 'security'
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(20) UNIQUE NOT NULL, -- e.g., SP-K82X1
    receiver_name VARCHAR(100) NOT NULL,
    phone_number BIGINT NOT NULL CHECK (phone_number >= 1000000000 AND phone_number <= 9999999999),
    description TEXT,
    location VARCHAR(100),
    rack_number VARCHAR(20),
    status order_status DEFAULT 'stored',
    qr_code_base64 TEXT,
    otp_code TEXT,
    otp_expires_at TIMESTAMP,
    otp_verified BOOLEAN DEFAULT FALSE,
    otp_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    collected_at TIMESTAMP,
    last_reminded_at TIMESTAMP,
    created_by INTEGER REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders (order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders (phone_number);
