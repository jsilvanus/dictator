-- Migration: Add dictator provider to ai_provider enum
-- Add 'dictator' to the ai_provider enum type to support Dictator-hosted AI service

ALTER TYPE "ai_provider" ADD VALUE 'dictator';
