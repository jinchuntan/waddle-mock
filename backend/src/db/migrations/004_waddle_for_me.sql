CREATE TABLE waddle_for_me_jobs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  supplier_contact    TEXT        NOT NULL,
  contact_type        TEXT        NOT NULL CHECK (contact_type IN ('phone', 'email')),
  product_description TEXT        NOT NULL,
  quantity            TEXT,
  budget              TEXT,
  notes               TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'in_progress', 'done', 'failed')),
  result              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waddle_for_me_user_id ON waddle_for_me_jobs(user_id);
