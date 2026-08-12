CREATE TYPE "public"."sync_conflict_status" AS ENUM('none', 'resolved', 'unresolved');--> statement-breakpoint
CREATE TABLE "document_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"base_version" jsonb NOT NULL,
	"android_version" jsonb NOT NULL,
	"web_version" jsonb NOT NULL,
	"resolved_version" jsonb,
	"status" text DEFAULT 'unresolved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pending_sync_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"change_data" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_metadata" (
	"document_id" uuid PRIMARY KEY NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"local_version" bigint DEFAULT 1 NOT NULL,
	"remote_version" bigint DEFAULT 1 NOT NULL,
	"pending_changes" integer DEFAULT 0 NOT NULL,
	"conflict_status" "sync_conflict_status" DEFAULT 'none' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "device_source" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "device_version" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "last_modified_device" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "device_version" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "document_conflicts" ADD CONSTRAINT "document_conflicts_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_sync_queue" ADD CONSTRAINT "pending_sync_queue_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_sync_queue" ADD CONSTRAINT "pending_sync_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_metadata" ADD CONSTRAINT "sync_metadata_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;