import Link from 'next/link';

import { auth } from '@/auth';

import { LogoutButton } from './LogoutButton';

export async function AppTopbar({ title }: { title: string }) {
  const session = await auth();

  return (
    <header className="topbar">
      <div>
        <strong>{title}</strong>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/settings">Settings</Link>
        <span>{session?.user?.name}</span>
        <span className="badge">{session?.user?.role}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
