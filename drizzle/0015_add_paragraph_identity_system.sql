-- Migration: 0015_add_paragraph_identity_system
-- Adds paragraph-level provenance infrastructure with stable IDs and content hashing

-- Paragraph Provenances: Tracks complete provenance for each paragraph
CREATE TABLE IF NOT EXISTS paragraph_provenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Stable paragraph identifier (format: p_<uuid>)
  paragraph_id TEXT NOT NULL,
  
  -- Current content hash (SHA-256, hex)
  current_content_hash TEXT NOT NULL,
  
  -- Optional: cached plaintext content at current hash
  -- For verification and display purposes
  current_content TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure only one provenance record per paragraph per document
  UNIQUE(document_id, paragraph_id)
);

-- Paragraph Provenance Events: Chronological history of changes to each paragraph
CREATE TABLE IF NOT EXISTS paragraph_provenance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paragraph_provenance_id UUID NOT NULL REFERENCES paragraph_provenances(id) ON DELETE CASCADE,
  
  -- Event metadata
  -- Type: 'human-dictated', 'human-written', 'human-edit', 'ai-generation',
  --       'ai-modification', 'human-acceptance', 'human-rejection', 'copy-paste'
  event_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Content state
  content_hash TEXT NOT NULL,
  previous_hash TEXT,
  content_hash_algorithm TEXT NOT NULL DEFAULT 'sha256',
  
  -- Source
  -- Values: 'human-dictated', 'human-written', 'ai-generated', 'ai-modified'
  source TEXT NOT NULL,
  confidence NUMERIC(3, 2), -- 0-1 for AI-generated content
  device TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- AI context (if applicable)
  ai_session_id UUID REFERENCES ai_sessions(id),
  ai_turn_id TEXT,
  
  -- Content scope: 'full-document', 'selected-text', 'context-snippet'
  selection_scope TEXT,
  
  -- Copy/paste tracking
  origin_from_paragraph_id TEXT,
  
  -- Review tracking
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_paragraph_provenances_document ON paragraph_provenances(document_id);
CREATE INDEX idx_paragraph_provenances_id ON paragraph_provenances(paragraph_id);
CREATE INDEX idx_paragraph_provenance_events_provenance ON paragraph_provenance_events(paragraph_provenance_id);
CREATE INDEX idx_paragraph_provenance_events_ai_session ON paragraph_provenance_events(ai_session_id);
CREATE INDEX idx_paragraph_provenance_events_user ON paragraph_provenance_events(user_id);
CREATE INDEX idx_paragraph_provenance_events_timestamp ON paragraph_provenance_events(timestamp);
CREATE INDEX idx_paragraph_provenance_events_source ON paragraph_provenance_events(source);
CREATE INDEX idx_paragraph_provenance_events_origin ON paragraph_provenance_events(origin_from_paragraph_id);
