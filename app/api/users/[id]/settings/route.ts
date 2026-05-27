import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { settingsSchema } from '@/lib/validation/settings';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;

    if (session.userId !== id && session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = settingsSchema.parse(await request.json());

    const [updated] = await db
      .update(users)
      .set({ settings: parsed })
      .where(eq(users.id, id))
      .returning({ settings: users.settings });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
