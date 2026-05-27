import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { assertAdmin, getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    assertAdmin(session.role);

    const { id } = await params;
    const body = (await request.json()) as {
      role?: 'admin' | 'editor';
      deactivated?: boolean;
    };

    const [updated] = await db
      .update(users)
      .set({
        role: body.role,
        ...('deactivated' in body && { deactivatedAt: body.deactivated ? new Date() : null }),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        role: users.role,
        deactivatedAt: users.deactivatedAt,
      });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
