import { asc } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AppTopbar } from '@/components/shared/AppTopbar';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      deactivatedAt: users.deactivatedAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));

  return (
    <main className="page-shell">
      <AppTopbar title="Admin" />
      <div className="panel">
        <h1>User management</h1>
        <form
          action="/api/users"
          method="post"
          style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 12 }}
        >
          <input required name="name" placeholder="Name" />
          <input required type="email" name="email" placeholder="Email" />
          <input required type="password" name="password" placeholder="Password" />
          <select name="role" defaultValue="editor">
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit" style={{ gridColumn: '1 / -1' }}>
            Create user
          </button>
        </form>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">Name</th>
              <th align="left">Email</th>
              <th align="left">Role</th>
              <th align="left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.deactivatedAt ? 'deactivated' : 'active'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
