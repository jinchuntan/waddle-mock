-- Migration tracking table (must be first)
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename   VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Core negotiation records
CREATE TABLE negotiations (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier     VARCHAR(255) NOT NULL,
  phone        VARCHAR(50)  NOT NULL,
  product      TEXT         NOT NULL,
  quantity     VARCHAR(255) NOT NULL,
  target_price VARCHAR(255) NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'sent'
                            CHECK (status IN ('sent','negotiating','done','failed')),
  summary      TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_negotiations_phone  ON negotiations(phone);
CREATE INDEX idx_negotiations_status ON negotiations(status);

-- Every message exchanged in a negotiation
CREATE TABLE messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id  UUID        NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
  role            VARCHAR(10) NOT NULL CHECK (role IN ('agent','supplier')),
  body            TEXT        NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_negotiation_id ON messages(negotiation_id);
CREATE INDEX idx_messages_sent_at        ON messages(negotiation_id, sent_at);

-- FIFO queue state per negotiation
CREATE TABLE queue_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id  UUID        NOT NULL UNIQUE REFERENCES negotiations(id) ON DELETE CASCADE,
  position        INTEGER     NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','active','waiting_reply','timed_out','done')),
  last_message_at TIMESTAMPTZ,
  timeout_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_queue_status   ON queue_items(status);
CREATE INDEX idx_queue_position ON queue_items(position);
