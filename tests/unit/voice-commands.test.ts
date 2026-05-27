import { describe, expect, it } from 'vitest';

import { parseTriggers } from '@/lib/voice/commands';

describe('parseTriggers', () => {
  it('returns plain text segment when no trigger is present', () => {
    expect(parseTriggers('just plain text', 'Computer', 'Assistant')).toEqual([{ type: 'text', content: 'just plain text' }]);
  });

  it('parses single command trigger', () => {
    expect(parseTriggers('Computer, bold', 'Computer', 'Assistant')).toEqual([{ type: 'command', content: 'bold' }]);
  });

  it('parses single ai trigger', () => {
    expect(parseTriggers('Assistant summarize this', 'Computer', 'Assistant')).toEqual([
      { type: 'ai', content: 'summarize this' },
    ]);
  });

  it('parses interleaved command and ai triggers in order', () => {
    expect(parseTriggers('Hello Computer, bold Assistant, summarize and continue', 'Computer', 'Assistant')).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'command', content: 'bold' },
      { type: 'ai', content: 'summarize and continue' },
    ]);
  });

  it('keeps unknown command payload as command segment', () => {
    expect(parseTriggers('Computer, launch rockets', 'Computer', 'Assistant')).toEqual([
      { type: 'command', content: 'launch rockets' },
    ]);
  });
});
