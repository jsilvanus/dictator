-- Privacy and Data Protection Schema
-- Implements comprehensive privacy-first architecture
-- Tables for privacy settings, provider policies, provenance tracking, and audit logging

-- Add new enum types for privacy system
CREATE TYPE "ai_content_source" AS ENUM ('human-dictated', 'human-written', 'ai-generated', 'ai-modified', 'unknown');
CREATE TYPE "ai_request_scope" AS ENUM ('full-document', 'selected-text', 'context-snippet', 'unknown');
CREATE TYPE "data_processing_purpose" AS ENUM ('fulfillment', 'operations', 'analytics', 'improvement', 'marketing', 'legal-compliance');
CREATE TYPE "backup_inclusion_policy" AS ENUM ('always-encrypted', 'never', 'ask-each-time', 'device-only');
--> statement-breakpoint

-- User Privacy Settings table
-- Stores privacy preferences and data collection settings per user
CREATE TABLE "user_privacy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL UNIQUE,
	"telemetry_enabled" boolean DEFAULT false NOT NULL,
	"crash_reports_enabled" boolean DEFAULT false NOT NULL,
	"sensitive_data_detection_enabled" boolean DEFAULT true NOT NULL,
	"warn_before_sending_to_cloud" boolean DEFAULT true NOT NULL,
	"allow_data_for_training" boolean DEFAULT false NOT NULL,
	"backup_encryption_required" boolean DEFAULT true NOT NULL,
	"auto_delete_ai_sessions" boolean DEFAULT false NOT NULL,
	"ai_session_retention_days" integer DEFAULT 30 NOT NULL,
	"prefer_local_processing" boolean DEFAULT true NOT NULL,
	"encrypt_local_storage" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- AI Provider Policies table
-- Documents data handling practices and compliance for each AI provider
CREATE TABLE "ai_provider_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL UNIQUE,
	"display_name" text NOT NULL,
	"data_retention_days" integer,
	"uses_data_for_training" boolean NOT NULL DEFAULT false,
	"training_opt_out_available" boolean DEFAULT false,
	"processing_locations" text[] DEFAULT '{}' NOT NULL,
	"processing_purposes" text[] DEFAULT '{}' NOT NULL,
	"gdpr_compliant" boolean DEFAULT false,
	"privacy_policy_url" text,
	"notes" text,
	"privacy_rating" integer DEFAULT 50,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- AI Turn Provenance table
-- Tracks the source and processing history of AI interactions
CREATE TABLE "ai_turn_provenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turn_id" uuid NOT NULL UNIQUE,
	"source" "ai_content_source" DEFAULT 'unknown' NOT NULL,
	"confidence" numeric(3, 2) DEFAULT 1.00,
	"content_scope" "ai_request_scope" DEFAULT 'unknown' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"provenance_metadata" jsonb,
	"policy_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Deletion Records table
-- Audit trail of data deletion requests for compliance
CREATE TABLE "deletion_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid,
	"ai_session_id" uuid,
	"deletion_type" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending',
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Privacy Audit Log table
-- Comprehensive audit trail for privacy and data protection compliance
CREATE TABLE "privacy_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid,
	"action" text NOT NULL,
	"context" jsonb,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address_hash" text
);
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "user_privacy_settings" ADD CONSTRAINT "user_privacy_settings_user_id_users_id_fk" 
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ai_turn_provenance" ADD CONSTRAINT "ai_turn_provenance_turn_id_ai_turns_id_fk" 
	FOREIGN KEY ("turn_id") REFERENCES "public"."ai_turns"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ai_turn_provenance" ADD CONSTRAINT "ai_turn_provenance_policy_id_ai_provider_policies_id_fk" 
	FOREIGN KEY ("policy_id") REFERENCES "public"."ai_provider_policies"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "deletion_records" ADD CONSTRAINT "deletion_records_user_id_users_id_fk" 
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "privacy_audit_log" ADD CONSTRAINT "privacy_audit_log_user_id_users_id_fk" 
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create indexes for efficient querying
CREATE INDEX "idx_user_privacy_settings_user_id" ON "user_privacy_settings"("user_id");
--> statement-breakpoint

CREATE INDEX "idx_ai_turn_provenance_turn_id" ON "ai_turn_provenance"("turn_id");
--> statement-breakpoint

CREATE INDEX "idx_ai_turn_provenance_policy_id" ON "ai_turn_provenance"("policy_id");
--> statement-breakpoint

CREATE INDEX "idx_deletion_records_user_id" ON "deletion_records"("user_id");
--> statement-breakpoint

CREATE INDEX "idx_deletion_records_status" ON "deletion_records"("status");
--> statement-breakpoint

CREATE INDEX "idx_privacy_audit_log_user_id" ON "privacy_audit_log"("user_id");
--> statement-breakpoint

CREATE INDEX "idx_privacy_audit_log_timestamp" ON "privacy_audit_log"("timestamp");
--> statement-breakpoint

CREATE INDEX "idx_privacy_audit_log_action" ON "privacy_audit_log"("action");
