-- Migration: 0017_align_provenance_schema_with_code
--
-- Migrations 0015 and 0016 created the paragraph-provenance and C2PA tables, but
-- the query layer in lib/db/paragraph-provenance-queries.ts was written against a
-- different shape: it reads paragraph_provenances.user_id,
-- paragraph_provenance_events.paragraph_id, c2pa_manifests.user_id,
-- export_history.user_id and export_history.export_format, none of which existed.
-- The tables were also never mirrored into lib/db/schema.ts, so those imports
-- resolved to nothing and the mismatch stayed invisible.
--
-- This migration reconciles the database with the code. Everything here is
-- data-preserving: new columns are added nullable, backfilled from data already
-- present, and only then constrained; mismatched names are renamed rather than
-- duplicated, so no column ends up with two spellings.

-- ---------------------------------------------------------------------------
-- paragraph_provenances.user_id
-- Backfilled from the owning document, which is NOT NULL on both sides, so every
-- existing row gets a value and the column can be constrained afterwards.
-- ---------------------------------------------------------------------------
ALTER TABLE paragraph_provenances
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

UPDATE paragraph_provenances p
   SET user_id = d.owner_id
  FROM documents d
 WHERE p.document_id = d.id
   AND p.user_id IS NULL;

ALTER TABLE paragraph_provenances
  ALTER COLUMN user_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- paragraph_provenance_events.paragraph_id
-- The events table reaches its paragraph through paragraph_provenance_id; the
-- code queries the stable paragraph identifier directly. Backfilled across that
-- FK, which is NOT NULL, so again every row is covered.
-- ---------------------------------------------------------------------------
ALTER TABLE paragraph_provenance_events
  ADD COLUMN IF NOT EXISTS paragraph_id TEXT;

UPDATE paragraph_provenance_events e
   SET paragraph_id = p.paragraph_id
  FROM paragraph_provenances p
 WHERE e.paragraph_provenance_id = p.id
   AND e.paragraph_id IS NULL;

ALTER TABLE paragraph_provenance_events
  ALTER COLUMN paragraph_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Renames. Same column, different name — renaming keeps existing rows intact,
-- where adding a second column would silently strand the data already written.
-- Guarded so a re-run is a no-op.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'c2pa_manifests' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE c2pa_manifests RENAME COLUMN created_by_user_id TO user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'export_history' AND column_name = 'exported_by_user_id'
  ) THEN
    ALTER TABLE export_history RENAME COLUMN exported_by_user_id TO user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'export_history' AND column_name = 'format'
  ) THEN
    ALTER TABLE export_history RENAME COLUMN format TO export_format;
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- Further columns the query layer reads that 0015 never created. All nullable:
-- they carry optional lineage and display metadata, and existing rows have no
-- value to backfill from, so a NOT NULL constraint would be a lie.
-- ---------------------------------------------------------------------------
ALTER TABLE paragraph_provenances
  ADD COLUMN IF NOT EXISTS parent_paragraph_id TEXT;

ALTER TABLE paragraph_provenance_events
  ADD COLUMN IF NOT EXISTS content_hash_after_event TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- content_hash already records the hash at the time of the event; where the code
-- asks for the hash *after* it, the two coincide for existing rows.
UPDATE paragraph_provenance_events
   SET content_hash_after_event = content_hash
 WHERE content_hash_after_event IS NULL;

-- ---------------------------------------------------------------------------
-- Indexes for the new lookup columns, matching how the query layer filters.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_paragraph_provenances_user
  ON paragraph_provenances(user_id);

CREATE INDEX IF NOT EXISTS idx_paragraph_provenance_events_paragraph
  ON paragraph_provenance_events(paragraph_id);
