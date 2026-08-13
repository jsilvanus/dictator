-- Phase 5: Real-time Collaboration & Sync Optimization
-- Adds support for activity logging, notifications, and sync optimization

-- Activity log for tracking sync operations
CREATE TABLE "sync_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"action" text NOT NULL,
	"details" jsonb DEFAULT '{}' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Sync notifications for users
CREATE TABLE "sync_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"type" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Add foreign key constraints for Phase 5 tables
ALTER TABLE "sync_activity_log" ADD CONSTRAINT "sync_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "sync_activity_log" ADD CONSTRAINT "sync_activity_log_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "sync_notifications" ADD CONSTRAINT "sync_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "sync_notifications" ADD CONSTRAINT "sync_notifications_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create indexes for efficient querying
CREATE INDEX "idx_sync_activity_log_user_id" ON "sync_activity_log"("user_id");
--> statement-breakpoint

CREATE INDEX "idx_sync_activity_log_document_id" ON "sync_activity_log"("document_id");
--> statement-breakpoint

CREATE INDEX "idx_sync_activity_log_timestamp" ON "sync_activity_log"("timestamp");
--> statement-breakpoint

CREATE INDEX "idx_sync_notifications_user_id" ON "sync_notifications"("user_id");
--> statement-breakpoint

CREATE INDEX "idx_sync_notifications_document_id" ON "sync_notifications"("document_id");
--> statement-breakpoint

CREATE INDEX "idx_sync_notifications_created_at" ON "sync_notifications"("created_at");
