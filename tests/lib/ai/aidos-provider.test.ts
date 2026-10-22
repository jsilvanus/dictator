import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AidosProvider } from '@/lib/ai/providers/aidos';
import { AiProviderFactory } from '@/lib/ai/providers/factory';

describe('AidosProvider', () => {
  const tmpDir = path.join(os.tmpdir(), `aidos-test-${Date.now()}`);
  const discoveryFile = path.join(tmpDir, 'engine.json');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    process.env.AIDOS_DISCOVERY_FILE = discoveryFile;
    delete process.env.AIDOS_BASE_URL;
    delete process.env.AIDOS_API_KEY;
  });

  afterEach(() => {
    delete process.env.AIDOS_DISCOVERY_FILE;
    delete process.env.AIDOS_BASE_URL;
    delete process.env.AIDOS_API_KEY;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    vi.restoreAllMocks();
  });

  it('discovers running engine from engine.json', () => {
    fs.writeFileSync(
      discoveryFile,
      JSON.stringify({
        status: 'READY',
        port: 18080,
        baseUrl: 'http://127.0.0.1:18080',
        token: 'test-token-12345',
        apiVersion: 1,
        pid: 9999,
      })
    );

    expect(AidosProvider.isDiscovered()).toBe(true);
    const discovery = AidosProvider.discoverEngine();
    expect(discovery?.port).toBe(18080);
    expect(discovery?.token).toBe('test-token-12345');

    const provider = new AidosProvider();
    expect(provider.isConfigured()).toBe(true);
    expect(provider.getProviderType()).toBe('aidos');
  });

  it('creates provider via AiProviderFactory by type', () => {
    const provider = AiProviderFactory.createProvider({
      type: 'aidos',
      baseUrl: 'http://127.0.0.1:18080/v1',
      apiKey: 'manual-token',
      model: 'whisper-small',
    });

    expect(provider.getProviderType()).toBe('aidos');
    expect(provider.getModelName()).toBe('whisper-small');
    expect(provider.isConfigured()).toBe(true);
  });

  it('auto-creates from environment when engine is discovered', () => {
    fs.writeFileSync(
      discoveryFile,
      JSON.stringify({
        status: 'READY',
        port: 18080,
        baseUrl: 'http://127.0.0.1:18080',
        token: 'discovered-token',
      })
    );

    // Clear Anthropic/OpenAI keys to test discovery fallback
    const origAnthropic = process.env.ANTHROPIC_API_KEY;
    const origOpenai = process.env.OPENAI_API_KEY;
    const origOllama = process.env.OLLAMA_BASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_BASE_URL;

    try {
      const provider = AiProviderFactory.createFromEnv();
      expect(provider.getProviderType()).toBe('aidos');
    } finally {
      if (origAnthropic) process.env.ANTHROPIC_API_KEY = origAnthropic;
      if (origOpenai) process.env.OPENAI_API_KEY = origOpenai;
      if (origOllama) process.env.OLLAMA_BASE_URL = origOllama;
    }
  });

  it('sends transcription request to Aidos STT endpoint', async () => {
    const provider = new AidosProvider('http://127.0.0.1:18080/v1', 'mock-token', 'liturgos-auditor');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Herra olkoon teidän kanssanne' }),
    });
    global.fetch = mockFetch;

    const result = await provider.transcribe('base64wavdata==', {
      language: 'fi',
      prompt: 'liturginen',
    });

    expect(result.text).toBe('Herra olkoon teidän kanssanne');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:18080/v1/audio/transcriptions');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer mock-token');

    const sentBody = JSON.parse(options.body);
    expect(sentBody.file).toBe('base64wavdata==');
    expect(sentBody.model).toBe('liturgos-auditor');
    expect(sentBody.language).toBe('fi');
    expect(sentBody.prompt).toBe('liturginen');
  });
});
