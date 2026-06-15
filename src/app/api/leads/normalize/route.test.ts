import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from './route';
import { setLlmProvider, setActiveSchema } from '@/lib/runtime';
import { FakeLlmProvider } from '@/lib/llm/fake-provider';
import { defaultLeadSchema } from '@/lib/schema/default-lead-schema';

function postReq(body: unknown): Request {
  return new Request('https://x/api/leads/normalize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  setActiveSchema(defaultLeadSchema);
});

describe('POST /api/leads/normalize', () => {
  it('returns 503 when no LLM is configured', async () => {
    setLlmProvider(null);
    const res = await POST(postReq({ text: 'Ramesh, sarees' }));
    expect(res.status).toBe(503);
  });

  it('returns a structured draft when configured', async () => {
    setLlmProvider(
      new FakeLlmProvider([{ name: 'Ramesh', phone: '9876543210', interests: ['sarees'] }]),
    );
    const res = await POST(postReq({ text: 'Ramesh from Surat wants sarees, 9876543210' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean; data: { name: string; phone: string } };
    expect(body.valid).toBe(true);
    expect(body.data.name).toBe('Ramesh');
    expect(body.data.phone).toBe('+919876543210');
  });

  it('rejects empty text (400)', async () => {
    setLlmProvider(new FakeLlmProvider([{}]));
    const res = await POST(postReq({ text: '   ' }));
    expect(res.status).toBe(400);
  });
});
