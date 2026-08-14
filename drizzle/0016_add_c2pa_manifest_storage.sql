-- Migration: 0016_add_c2pa_manifest_storage
-- Adds storage for C2PA manifests and signed document versions

-- C2PA Manifests: Stores generated (but not yet signed) C2PA manifests
CREATE TABLE IF NOT EXISTS c2pa_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Export format this manifest is for
  format TEXT NOT NULL, -- 'json', 'markdown', 'html', 'pdf'
  
  -- Manifest version (for document evolution tracking)
  document_version BIGINT NOT NULL,
  
  -- Unsigned manifest JSON (C2PA spec compliant)
  manifest_json JSONB NOT NULL,
  
  -- Content being claimed (hash of the actual exported content)
  content_hash TEXT NOT NULL,
  content_hash_algorithm TEXT NOT NULL DEFAULT 'sha256',
  
  -- Status of manifest
  status TEXT NOT NULL DEFAULT 'unsigned', -- 'unsigned', 'signed', 'failed'
  
  -- Signing information
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by_key_id TEXT, -- Which signing key was used
  signature TEXT, -- The cryptographic signature
  
  -- User who initiated export
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Error tracking (if signing failed)
  error_message TEXT,
  failed_at TIMESTAMP WITH TIME ZONE
);

-- Document Versions with Provenance: Tracks full document state with provenance
CREATE TABLE IF NOT EXISTS document_versions_with_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_version BIGINT NOT NULL,
  
  -- Document state
  content JSONB NOT NULL,
  
  -- Paragraph provenance snapshot at this version
  paragraph_provenances JSONB NOT NULL, -- Array of ParagraphProvenance objects
  
  -- Content hash of entire document
  content_hash TEXT NOT NULL,
  content_hash_algorithm TEXT NOT NULL DEFAULT 'sha256',
  
  -- Metadata
  created_by_device TEXT NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Export History: Track what has been exported and with what provenance
CREATE TABLE IF NOT EXISTS export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Export details
  format TEXT NOT NULL, -- 'json', 'markdown', 'html', 'pdf'
  document_version BIGINT NOT NULL,
  
  -- What was exported
  included_paragraphs INT NOT NULL, -- Number of paragraphs
  included_ai_turns INT NOT NULL, -- Number of AI turns referenced
  
  -- C2PA info
  has_c2pa_manifest BOOLEAN NOT NULL DEFAULT FALSE,
  c2pa_manifest_id UUID REFERENCES c2pa_manifests(id),
  is_signed BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- File info
  filename TEXT,
  file_size_bytes INT,
  
  -- User who exported
  exported_by_user_id UUID NOT NULL REFERENCES users(id),
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_c2pa_manifests_document ON c2pa_manifests(document_id);
CREATE INDEX idx_c2pa_manifests_status ON c2pa_manifests(status);
CREATE INDEX idx_c2pa_manifests_format ON c2pa_manifests(format);
CREATE INDEX idx_c2pa_manifests_created_at ON c2pa_manifests(created_at);

CREATE INDEX idx_document_versions_provenance_document ON document_versions_with_provenance(document_id);
CREATE INDEX idx_document_versions_provenance_version ON document_versions_with_provenance(document_version);

CREATE INDEX idx_export_history_document ON export_history(document_id);
CREATE INDEX idx_export_history_format ON export_history(format);
CREATE INDEX idx_export_history_exported_at ON export_history(exported_at);
CREATE INDEX idx_export_history_has_c2pa ON export_history(has_c2pa_manifest);
