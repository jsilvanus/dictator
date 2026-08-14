-- Add Model Thinking (Extended Thinking) Support
-- Adds columns to aiTurnProvenance table to store thinking content and budget

-- Add thinking columns to ai_turn_provenance table
ALTER TABLE "ai_turn_provenance" ADD COLUMN "thinking_content" text;
ALTER TABLE "ai_turn_provenance" ADD COLUMN "thinking_budget_tokens" integer;

--> statement-breakpoint
