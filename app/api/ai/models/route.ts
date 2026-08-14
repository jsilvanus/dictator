import { NextResponse } from 'next/server';
import { AiProviderFactory } from '@/lib/ai/providers/factory';
import { getRequiredSession } from '@/lib/auth/session';

export async function GET() {
  try {
    await getRequiredSession();

    const providers = AiProviderFactory.getAvailableProviders();

    return NextResponse.json({
      providers: providers.filter((p) => p.configured),
      all: providers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch available models', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
