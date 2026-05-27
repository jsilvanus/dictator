import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticateCredentials } from '@/lib/auth/credentials';

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('authenticateCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session-like user when password is valid', async () => {
    const bcrypt = (await import('bcryptjs')).default;
    const deps = {
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Jane',
        email: 'jane@example.com',
        role: 'editor',
        passwordHash: 'hash',
        deactivatedAt: null,
      }),
    };

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await authenticateCredentials('jane@example.com', 'secret', deps);

    expect(result).toMatchObject({ id: 'user-1', email: 'jane@example.com' });
  });

  it('returns null for wrong password', async () => {
    const bcrypt = (await import('bcryptjs')).default;
    const deps = {
      findByEmail: vi.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Jane',
        email: 'jane@example.com',
        role: 'editor',
        passwordHash: 'hash',
        deactivatedAt: null,
      }),
    };

    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const result = await authenticateCredentials('jane@example.com', 'bad', deps);

    expect(result).toBeNull();
  });
});
