CREATE TABLE IF NOT EXISTS documents (
  name       TEXT PRIMARY KEY,
  state      BYTEA NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snapshots (
  id            BIGSERIAL PRIMARY KEY,
  document_name TEXT NOT NULL REFERENCES documents(name) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('manual','auto')),
  label         TEXT,
  state         BYTEA NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snapshots_doc_created_idx
  ON snapshots(document_name, created_at DESC);

CREATE INDEX IF NOT EXISTS snapshots_doc_kind_created_idx
  ON snapshots(document_name, kind, created_at DESC);
