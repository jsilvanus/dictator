import { and,eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';

type DocumentSettingsUpdateRequest = {
  systemPromptOverride?: string;
};

export async function GET({ params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;

    // Get document and verify ownership
    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, id), eq(documents.ownerId, session.userId)),
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      systemPromptOverride: doc.systemPromptOverride,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch document settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST({ params }: { params: Promise<{ id: string }> }, request: Request) {
  try {
    const session = await getRequiredSession();
    const { id } = await params;
    const body = (await request.json()) as DocumentSettingsUpdateRequest;

    // Get document and verify ownership
    const doc = await db.query.documents.findFirst({
      where: and(eq(documents.id, id), eq(documents.ownerId, session.userId)),
    });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Validate system prompt override length if provided
    if (body.systemPromptOverride && body.systemPromptOverride.length > 2000) {
      return NextResponse.json(
        { error: 'System prompt override must be 2000 characters or less' },
        { status: 400 }
      );
    }

    // Update document settings
    await db
      .update(documents)
      .set({
        systemPromptOverride: body.systemPromptOverride || null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id));

    return NextResponse.json({
      success: true,
      message: 'Document settings updated',
      systemPromptOverride: body.systemPromptOverride,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update document settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
