import { NextResponse } from 'next/server';
import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { userAiPreferences } from '@/lib/db/schema';
import { AiProviderFactory } from '@/lib/ai/providers/factory';
import { eq } from 'drizzle-orm';

type PreferencesUpdateRequest = {
  preferredProvider: 'claude' | 'openai' | 'ollama' | 'openai-compatible';
  preferredModel?: string;
  customTemperature?: number;
  customMaxTokens?: number;
  ollamaUrl?: string;
};

export async function GET() {
  try {
    const session = await getRequiredSession();

    // Get existing preferences or return defaults
    const prefs = await db.query.userAiPreferences.findFirst({
      where: eq(userAiPreferences.userId, session.userId),
    });

    if (prefs) {
      return NextResponse.json({
        preferredProvider: prefs.preferredProvider,
        preferredModel: prefs.preferredModel,
        customTemperature: prefs.customTemperature ? Number(prefs.customTemperature) : null,
        customMaxTokens: prefs.customMaxTokens,
        ollamaUrl: prefs.ollamaUrl,
      });
    }

    // Return defaults
    return NextResponse.json({
      preferredProvider: 'claude',
      preferredModel: null,
      customTemperature: null,
      customMaxTokens: null,
      ollamaUrl: null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch preferences', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getRequiredSession();
    const body = (await request.json()) as PreferencesUpdateRequest;

    // Validate the provider and configuration
    const validation = AiProviderFactory.validateConfig({
      type: body.preferredProvider,
      apiKey: process.env[`${body.preferredProvider.toUpperCase()}_API_KEY`],
      baseUrl: body.ollamaUrl || process.env[`${body.preferredProvider.toUpperCase()}_BASE_URL`],
      model: body.preferredModel,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid provider configuration', errors: validation.errors },
        { status: 400 }
      );
    }

    // Upsert user preferences
    await db
      .insert(userAiPreferences)
      .values({
        userId: session.userId,
        preferredProvider: body.preferredProvider,
        preferredModel: body.preferredModel,
        customTemperature: body.customTemperature ? String(body.customTemperature) : null,
        customMaxTokens: body.customMaxTokens,
        ollamaUrl: body.ollamaUrl,
      })
      .onConflictDoUpdate({
        target: [userAiPreferences.userId],
        set: {
          preferredProvider: body.preferredProvider,
          preferredModel: body.preferredModel,
          customTemperature: body.customTemperature ? String(body.customTemperature) : null,
          customMaxTokens: body.customMaxTokens,
          ollamaUrl: body.ollamaUrl,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Preferences updated',
      preferences: {
        preferredProvider: body.preferredProvider,
        preferredModel: body.preferredModel,
        customTemperature: body.customTemperature,
        customMaxTokens: body.customMaxTokens,
        ollamaUrl: body.ollamaUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update preferences', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
