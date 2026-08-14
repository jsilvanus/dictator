import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { AiProviderFactory } from '@/lib/ai/providers/factory';
import { getRequiredSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { userAiPreferences } from '@/lib/db/schema';

type PreferencesUpdateRequest = {
  preferredProvider: 'claude' | 'openai' | 'ollama' | 'openai-compatible' | 'dictator';
  preferredModel?: string;
  customTemperature?: number;
  customMaxTokens?: number;
  ollamaUrl?: string;
  thinkingBudgetTokens?: number;
  systemPrompt?: string;
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
        thinkingBudgetTokens: prefs.thinkingBudgetTokens,
        systemPrompt: prefs.systemPrompt,
      });
    }

    // Return defaults
    return NextResponse.json({
      preferredProvider: 'claude',
      preferredModel: null,
      customTemperature: null,
      customMaxTokens: null,
      ollamaUrl: null,
      thinkingBudgetTokens: null,
      systemPrompt: null,
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

    // Validate thinking budget tokens if provided
    if (body.thinkingBudgetTokens !== undefined && (body.thinkingBudgetTokens < 1024 || body.thinkingBudgetTokens > 10000)) {
      return NextResponse.json(
        { error: 'Thinking budget tokens must be between 1024 and 10000' },
        { status: 400 }
      );
    }

    // Validate system prompt length if provided
    if (body.systemPrompt && body.systemPrompt.length > 2000) {
      return NextResponse.json(
        { error: 'System prompt must be 2000 characters or less' },
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
        thinkingBudgetTokens: body.thinkingBudgetTokens,
        systemPrompt: body.systemPrompt || null,
      })
      .onConflictDoUpdate({
        target: [userAiPreferences.userId],
        set: {
          preferredProvider: body.preferredProvider,
          preferredModel: body.preferredModel,
          customTemperature: body.customTemperature ? String(body.customTemperature) : null,
          customMaxTokens: body.customMaxTokens,
          ollamaUrl: body.ollamaUrl,
          thinkingBudgetTokens: body.thinkingBudgetTokens,
          systemPrompt: body.systemPrompt || null,
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
        thinkingBudgetTokens: body.thinkingBudgetTokens,
        systemPrompt: body.systemPrompt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update preferences', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
