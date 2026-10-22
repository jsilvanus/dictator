import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GenericOpenAiProvider } from './generic-openai';
import { ModelProvider } from './types';

export interface AidosDiscoveryInfo {
  status: string;
  port: number;
  baseUrl: string;
  token: string;
  apiVersion?: number;
  pid?: number;
}

/**
 * Aidos Engine AI Provider
 * Connects to a locally running Aidos Engine instance (RFC-0103)
 * Supports auto-discovery via ~/.aidos/engine.json
 */
export class AidosProvider extends GenericOpenAiProvider {
  private discovery: AidosDiscoveryInfo | null = null;

  constructor(baseUrl?: string, apiKey?: string, model: string = 'aidos-default') {
    const discovery = AidosProvider.discoverEngine();
    const effectiveBaseUrl =
      baseUrl ||
      process.env.AIDOS_BASE_URL ||
      (discovery ? `${discovery.baseUrl}/v1` : 'http://127.0.0.1:18080/v1');
    const effectiveApiKey =
      apiKey || process.env.AIDOS_API_KEY || (discovery ? discovery.token : '');

    super(effectiveBaseUrl, effectiveApiKey, model);
    this.discovery = discovery;
  }

  getProviderType(): ModelProvider {
    return 'aidos';
  }

  /**
   * Attempts to discover a running Aidos Engine via ~/.aidos/engine.json
   */
  static discoverEngine(): AidosDiscoveryInfo | null {
    try {
      const discoveryPath =
        process.env.AIDOS_DISCOVERY_FILE ||
        path.join(os.homedir(), '.aidos', 'engine.json');

      if (!fs.existsSync(discoveryPath)) {
        return null;
      }

      const content = fs.readFileSync(discoveryPath, 'utf8');
      const data = JSON.parse(content) as AidosDiscoveryInfo;
      if (data && data.status === 'READY' && data.token && data.baseUrl) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a local Aidos Engine is discovered and ready
   */
  static isDiscovered(): boolean {
    return this.discoverEngine() !== null;
  }

  /**
   * Creates an AidosProvider with discovered or configured credentials
   */
  static create(model: string = 'aidos-default'): AidosProvider {
    return new AidosProvider(undefined, undefined, model);
  }

  /**
   * Send audio to Aidos Engine for Speech-to-Text transcription
   */
  async transcribe(
    audioWavBase64: string,
    options: { language?: string; prompt?: string; model?: string } = {}
  ): Promise<{ text: string }> {
    // Strip trailing /v1 to reach root namespace
    const rootUrl = this['baseUrl'].replace(/\/v1$/, '');
    const url = `${rootUrl}/v1/audio/transcriptions`;

    const body: Record<string, unknown> = {
      file: audioWavBase64,
      model: options.model || this.model,
    };
    if (options.language) {
      body.language = options.language;
    }
    if (options.prompt) {
      body.prompt = options.prompt;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this['apiKey']}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Aidos STT failed: HTTP ${response.status} - ${errorText}`);
    }

    return (await response.json()) as { text: string };
  }
}
