CREATE TABLE IF NOT EXISTS connector_secrets (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  secret_ciphertext text NOT NULL,
  secret_iv text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

ALTER TABLE connector_secrets ENABLE ROW LEVEL SECURITY;
-- No permissive policies added: strictly Service Role access only.
