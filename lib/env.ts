import { z } from 'zod';

// Environment variable validation.
//
// `next build` imports every route module to collect page data, and does so with
// no runtime environment present — CI has no .env file, and a Docker image is
// built before its secrets exist. Validating at import time therefore failed a
// build that was otherwise correct. During the build phase we validate against
// placeholders for the three required values and let anything genuinely set in
// the environment override them; the real check still runs on the first request,
// which is when these values are actually needed.

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().min(1),
  DB_PORT: z.string().default('5432'),
  // AI Provider Configuration - at least one must be configured
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-6').optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o').optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434').optional(),
  OLLAMA_MODEL: z.string().default('mistral').optional(),
  OPENAI_COMPATIBLE_BASE_URL: z.string().optional(),
  OPENAI_COMPATIBLE_API_KEY: z.string().optional(),
  OPENAI_COMPATIBLE_MODEL: z.string().optional(),
  // General Configuration
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(1).optional(),
  COMMAND_TRIGGER_DEFAULT: z.string().default('Computer'),
  AI_TRIGGER_DEFAULT: z.string().default('Assistant'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

const source = isBuildPhase
  ? {
      DATABASE_URL: 'postgresql://build:build@localhost:5432/build',
      NEXTAUTH_SECRET: 'build-time-placeholder',
      NEXTAUTH_URL: 'http://localhost:3000',
      ...process.env,
    }
  : process.env;

export const env = envSchema.parse(source);
