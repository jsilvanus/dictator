import { z } from 'zod';

// Load environment variables from .env file into process.env, but only
// when running on the server (Node). Avoid statically importing
// `dotenv` at module top-level so Next.js doesn't try to bundle it for
// client-side code (which triggers errors resolving Node core modules
// like `path`).
if (typeof window === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env' });
}

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

export const env = envSchema.parse(process.env);
