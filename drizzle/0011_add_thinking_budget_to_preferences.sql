-- Add thinking budget support to user AI preferences

ALTER TABLE "user_ai_preferences" ADD COLUMN "thinking_budget_tokens" integer;

--> statement-breakpoint
