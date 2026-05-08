-- email_otps: temporary OTP records for design page verification
CREATE TABLE IF NOT EXISTS email_otps (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  otp_hash    text        NOT NULL,         -- SHA-256 hex of the 6-digit code
  expires_at  timestamptz NOT NULL,
  verified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_otps_lookup ON email_otps(tenant_id, email, expires_at);
ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;

-- customers: one row per verified email address per tenant
CREATE TABLE IF NOT EXISTS customers (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  email             text        NOT NULL,
  phone             text,
  address           text,
  email_verified_at timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id, created_at DESC);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- No public policies on either table — service role only
