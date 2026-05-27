import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { assertAdmin, getRequiredSession } from '@/lib/auth/session';
import { defaultSettings } from '@/lib/data/default-settings';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET() {
  try {
    const session = await getRequiredSession();
    assertAdmin(session.role);

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    assertAdmin(session.role);

    const body = (await request.json()) as {
      name: string;
      email: string;
      password: string;
      role: 'admin' | 'editor';
    };

    if (!body.name?.trim() || !body.email?.trim() || !body.password || !['admin', 'editor'].includes(body.role)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const [created] = await db
      .insert(users)
      .values({
        name: body.name,
        email: body.email,
        passwordHash,
        role: body.role,
        settings: defaultSettings,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json({ error: await error.text() }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
