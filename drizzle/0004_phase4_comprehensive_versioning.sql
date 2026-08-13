-- Phase 4: Comprehensive Versioning
-- Adds support for full version history browsing, point-in-time recovery, and device-specific change tracking

-- Version snapshots for point-in-time recovery
CREATE TABLE "document_version_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" bigint NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_device" text DEFAULT 'web' NOT NULL,
	"tag" text,
	"is_checkpoint" boolean DEFAULT false NOT NULL,
	UNIQUE("document_id", "version_number")
);
--> statement-breakpoint

-- Version metadata and lineage
CREATE TABLE "document_version_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" bigint NOT NULL,
	"parent_version" bigint,
	"change_summary" text,
	"word_count_change" integer,
	"size_bytes" integer,
	"is_major_version" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE("document_id", "version_number")
);
--> statement-breakpoint

-- Device-specific version tracking
CREATE TABLE "device_version_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"device_version" bigint NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'synced' NOT NULL,
	UNIQUE("document_id", "device_id", "device_version")
);
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "document_version_snapshots" ADD CONSTRAINT "document_version_snapshots_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "document_version_metadata" ADD CONSTRAINT "document_version_metadata_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "device_version_history" ADD CONSTRAINT "device_version_history_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create indexes for efficient querying
CREATE INDEX "idx_document_version_snapshots_document_id" ON "document_version_snapshots"("document_id");
--> statement-breakpoint

CREATE INDEX "idx_document_version_snapshots_created_at" ON "document_version_snapshots"("created_at");
--> statement-breakpoint

CREATE INDEX "idx_document_version_metadata_document_id" ON "document_version_metadata"("document_id");
--> statement-breakpoint

CREATE INDEX "idx_document_version_metadata_created_at" ON "document_version_metadata"("created_at");
--> statement-breakpoint

CREATE INDEX "idx_device_version_history_document_id" ON "device_version_history"("document_id");
--> statement-breakpoint

CREATE INDEX "idx_device_version_history_device_id" ON "device_version_history"("device_id");
--> statement-breakpoint

CREATE INDEX "idx_device_version_history_synced_at" ON "device_version_history"("synced_at");
