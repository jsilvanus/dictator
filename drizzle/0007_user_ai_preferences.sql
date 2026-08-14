-- AI Provider Support
-- Adds user AI provider preferences and configuration

-- Add enum type for AI providers
CREATE TYPE "ai_provider" AS ENUM ('claude', 'openai', 'ollama', 'openai-compatible');
--> statement-breakpoint

-- User AI preferences table
CREATE TABLE "user_ai_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"preferred_provider" "ai_provider" DEFAULT 'claude' NOT NULL,
	"preferred_model" text,
	"custom_temperature" numeric(3, 2),
	"custom_max_tokens" integer,
	"ollama_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_ai_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint

-- Add foreign key constraint
ALTER TABLE "user_ai_preferences" ADD CONSTRAINT "user_ai_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create indexes for efficient querying
CREATE INDEX "idx_user_ai_preferences_user_id" ON "user_ai_preferences"("user_id");
--> statement-breakpoint

CREATE INDEX "idx_user_ai_preferences_preferred_provider" ON "user_ai_preferences"("preferred_provider");
