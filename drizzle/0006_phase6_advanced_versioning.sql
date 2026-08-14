-- Phase 6: Advanced Versioning & Sync Orchestration
-- Adds support for version branching, performance metrics, and advanced sync orchestration

-- Version branches for alternative edit paths
CREATE TABLE "version_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"branch_name" text NOT NULL,
	"base_version" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	UNIQUE("document_id", "branch_name")
);
--> statement-breakpoint

-- Sync performance metrics for optimization tracking
CREATE TABLE "sync_performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"sync_time_ms" integer NOT NULL,
	"data_size_bytes" integer NOT NULL,
	"compression_ratio" numeric(5, 2),
	"success" boolean NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints for Phase 6 tables
ALTER TABLE "version_branches" ADD CONSTRAINT "version_branches_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "sync_performance_metrics" ADD CONSTRAINT "sync_performance_metrics_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create indexes for efficient querying
CREATE INDEX "idx_version_branches_document_id" ON "version_branches"("document_id");
--> statement-breakpoint

CREATE INDEX "idx_version_branches_is_main" ON "version_branches"("is_main");
--> statement-breakpoint

CREATE INDEX "idx_sync_performance_metrics_document_id" ON "sync_performance_metrics"("document_id");
--> statement-breakpoint

CREATE INDEX "idx_sync_performance_metrics_timestamp" ON "sync_performance_metrics"("timestamp");
--> statement-breakpoint

CREATE INDEX "idx_sync_performance_metrics_success" ON "sync_performance_metrics"("success");
