'use client';

import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="page-shell" style={{ maxWidth: 480 }}>
      <div className="panel">
        <h1>Login</h1>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setLoading(true);

            const result = await signIn('credentials', {
              email,
              password,
              redirect: false,
            });

            setLoading(false);

            if (result?.error) {
              setError('Invalid email or password.');
              return;
            }

            router.push('/dashboard');
            router.refresh();
          }}
          style={{ display: 'grid', gap: 12 }}
        >
          <label>
            Email
            <input
              required
              style={{ width: '100%' }}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              style={{ width: '100%' }}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p style={{ color: '#b91c1c' }}>{error}</p> : null}
          <button disabled={loading} type="submit">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
