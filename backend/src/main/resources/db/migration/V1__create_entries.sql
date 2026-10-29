-- CloudBlitz entries schema (PostgreSQL / Amazon RDS)
CREATE TABLE IF NOT EXISTS entries (
    id          UUID           PRIMARY KEY,
    reference   VARCHAR(24)    NOT NULL,
    title       VARCHAR(160)   NOT NULL,
    category    VARCHAR(32)    NOT NULL,
    status      VARCHAR(16)    NOT NULL,
    amount      NUMERIC(14, 2),
    currency    VARCHAR(3)     NOT NULL DEFAULT 'USD',
    entry_date  DATE           NOT NULL,
    owner       VARCHAR(80),
    notes       VARCHAR(4000),
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    version     BIGINT         NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_entries_reference ON entries (reference);
CREATE INDEX IF NOT EXISTS ix_entries_entry_date ON entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS ix_entries_created_at ON entries (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_entries_status ON entries (status);
CREATE INDEX IF NOT EXISTS ix_entries_category ON entries (category);
CREATE INDEX IF NOT EXISTS ix_entries_title_lower ON entries (lower(title));
