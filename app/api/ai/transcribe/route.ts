import { NextResponse } from 'next/server';

import { AidosProvider } from '@/lib/ai/providers/aidos';
import { getRequiredSession } from '@/lib/auth/session';

type TranscribeRequest = {
  audio?: string;
  file?: string;
  language?: string;
  prompt?: string;
  model?: string;
};

export async function POST(request: Request) {
  try {
    try {
      await getRequiredSession();
    } catch {
      // Return 401 if unauthorized
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as TranscribeRequest;
    const base64Wav = body.audio || body.file;

    if (!base64Wav) {
      return NextResponse.json(
        { error: 'Missing audio data in request body (expected "audio" or "file" base64 string)' },
        { status: 400 }
      );
    }

    const aidos = AidosProvider.create();
    if (!aidos.isConfigured() && !AidosProvider.isDiscovered()) {
      return NextResponse.json(
        {
          error:
            'Aidos Engine STT is not available. Ensure Aidos Engine is running locally on 127.0.0.1.',
        },
        { status: 503 }
      );
    }

    const result = await aidos.transcribe(base64Wav, {
      language: body.language,
      prompt: body.prompt,
      model: body.model,
    });

    return NextResponse.json({ text: result.text });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
