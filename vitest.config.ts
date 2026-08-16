import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    // Background agents run in git worktrees under .claude/worktrees/, which are
    // full checkouts of this repo. Without this, vitest globs their copies of the
    // suite too and reports every count multiplied by the number of worktrees.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.claude/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
