import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticateCredentials } from '@/lib/auth/credentials';

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('authenticateCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session-like user when password is valid', async () => {
    const { db } = await import('@/lib/db');
    const bcrypt = (await import('bcrypt')).default;

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1',
      name: 'Jane',
      email: 'jane@example.com',
      role: 'editor',
      passwordHash: 'hash',
      deactivatedAt: null,
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authenticateCredentials('jane@example.com', 'secret');

    expect(result).toMatchObject({ id: 'user-1', email: 'jane@example.com' });
  });

  it('returns null for wrong password', async () => {
    const { db } = await import('@/lib/db');
    const bcrypt = (await import('bcrypt')).default;

    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'user-1',
      name: 'Jane',
      email: 'jane@example.com',
      role: 'editor',
      passwordHash: 'hash',
      deactivatedAt: null,
    } as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await authenticateCredentials('jane@example.com', 'bad');

    expect(result).toBeNull();
  });
});
