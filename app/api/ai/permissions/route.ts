/**
 * API endpoints: GET/POST/DELETE /api/ai/permissions
 * Manages user tool permissions
 */

import { and,eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { toolPermissions } from '@/lib/db/schema';

type PermissionRequest = {
  target: string;
  toolType: 'http' | 'mcp';
  mode: 'once' | 'per-document' | 'always';
  documentId?: string;
};

type PermissionRevokeRequest = {
  target: string;
};

/**
 * GET /api/ai/permissions
 * List all permissions for the current user
 */
export async function GET() {
  try {
    const session = await getRequiredSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Query permissions from database
    const userPermissions = await db.query.toolPermissions.findMany({
      where: eq(toolPermissions.userId, session.userId),
    });

    // Filter out expired permissions
    const activePermissions = userPermissions.filter(
      (perm) => !perm.expiresAt || new Date(perm.expiresAt) > new Date(),
    );

    return NextResponse.json({
      permissions: activePermissions.map((perm) => ({
        target: perm.target,
        toolType: perm.toolType,
        mode: perm.mode,
        documentId: perm.documentId,
        createdAt: perm.createdAt.toISOString(),
        expiresAt: perm.expiresAt ? perm.expiresAt.toISOString() : undefined,
      })),
      count: activePermissions.length,
    });
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve permissions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ai/permissions
 * Grant a new permission
 */
export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = (await request.json()) as PermissionRequest;

    // Validate request
    if (!body.target) {
      return NextResponse.json(
        { error: 'Missing required field: target' },
        { status: 400 },
      );
    }

    if (!['http', 'mcp'].includes(body.toolType)) {
      return NextResponse.json(
        { error: 'Invalid toolType: must be "http" or "mcp"' },
        { status: 400 },
      );
    }

    if (!['once', 'per-document', 'always'].includes(body.mode)) {
      return NextResponse.json(
        { error: 'Invalid mode: must be "once", "per-document", or "always"' },
        { status: 400 },
      );
    }

    // For per-document and once modes, documentId is required
    if (['per-document', 'once'].includes(body.mode) && !body.documentId) {
      return NextResponse.json(
        { error: `documentId is required for mode "${body.mode}"` },
        { status: 400 },
      );
    }

    // Check if permission already exists
    const existing = await db.query.toolPermissions.findFirst({
      where: and(
        eq(toolPermissions.userId, session.userId),
        eq(toolPermissions.target, body.target),
        eq(toolPermissions.toolType, body.toolType),
      ),
    });

    if (existing) {
      // Update existing permission
      await db
        .update(toolPermissions)
        .set({
          mode: body.mode,
          documentId: body.documentId,
          expiresAt: null,
        })
        .where(eq(toolPermissions.id, existing.id));
    } else {
      // Create new permission
      await db.insert(toolPermissions).values({
        userId: session.userId,
        target: body.target,
        toolType: body.toolType,
        mode: body.mode,
        documentId: body.documentId,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Permission granted',
      permission: {
        target: body.target,
        toolType: body.toolType,
        mode: body.mode,
        documentId: body.documentId,
      },
    });
  } catch (error) {
    console.error('Failed to grant permission:', error);
    return NextResponse.json(
      {
        error: 'Failed to grant permission',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ai/permissions
 * Revoke a permission
 */
export async function DELETE(request: Request) {
  try {
    const session = await getRequiredSession();

    if (!session.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = (await request.json()) as PermissionRevokeRequest;

    if (!body.target) {
      return NextResponse.json(
        { error: 'Missing required field: target' },
        { status: 400 },
      );
    }

    // Delete all permissions for this target for the user
    await db
      .delete(toolPermissions)
      .where(
        and(
          eq(toolPermissions.userId, session.userId),
          eq(toolPermissions.target, body.target),
        ),
      );

    return NextResponse.json({
      success: true,
      message: 'Permission revoked',
      target: body.target,
    });
  } catch (error) {
    console.error('Failed to revoke permission:', error);
    return NextResponse.json(
      {
        error: 'Failed to revoke permission',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
