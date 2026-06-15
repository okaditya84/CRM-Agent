import { describe, it, expect } from 'vitest';
import { normalizeLead } from './normalize';
import { buildNormalizeSystemPrompt } from './prompt';
import { FakeLlmProvider } from './fake-provider';
import { defaultLeadSchema } from '../schema/default-lead-schema';

describe('buildNormalizeSystemPrompt', () => {
  it('renders the field catalog with keys and allowed enum values', () => {
    const prompt = buildNormalizeSystemPrompt(defaultLeadSchema);
    expect(prompt).toContain('"name"');
    expect(prompt).toContain('"interests"');
    expect(prompt).toContain('dress_materials');
    expect(prompt).toContain('Output ONLY the JSON object');
  });
});

describe('normalizeLead', () => {
  it('returns valid data when the model output passes validation', async () => {
    const provider = new FakeLlmProvider([
      { name: 'Ramesh', phone: '+919876543210', interests: ['sarees'] },
    ]);
    const result = await normalizeLead({ schema: defaultLeadSchema, text: 'note', provider });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.data.name).toBe('Ramesh');
  });

  it('coerces a bare phone number to E.164 before validating', async () => {
    const provider = new FakeLlmProvider([
      { name: 'Ramesh', phone: '9876543210', interests: ['sarees'] },
    ]);
    const result = await normalizeLead({ schema: defaultLeadSchema, text: 'note', provider });
    expect(result.valid).toBe(true);
    expect(result.data.phone).toBe('+919876543210');
  });

  it('repairs an invalid enum on a second attempt', async () => {
    const provider = new FakeLlmProvider([
      { name: 'Ramesh', phone: '+919876543210', interests: ['shoes'] }, // invalid enum
      { name: 'Ramesh', phone: '+919876543210', interests: ['sarees'] }, // fixed
    ]);
    const result = await normalizeLead({ schema: defaultLeadSchema, text: 'note', provider });
    expect(result.valid).toBe(true);
    expect(provider.calls).toHaveLength(2);
    // The repair turn references the failing field and the prior attempt.
    expect(provider.calls[1]?.userText).toContain('Previous attempt');
    expect(provider.calls[1]?.userText).toContain('interests');
  });

  it('returns a flagged partial draft after exhausting repairs', async () => {
    // Always missing the required name.
    const provider = new FakeLlmProvider(() => ({
      phone: '+919876543210',
      interests: ['sarees'],
    }));
    const result = await normalizeLead({
      schema: defaultLeadSchema,
      text: 'note',
      provider,
      maxRepairs: 1,
    });
    expect(result.valid).toBe(false);
    expect(provider.calls).toHaveLength(2); // initial + 1 repair
    expect(result.issues.some((i) => i.field === 'name')).toBe(true);
  });

  it('tolerates a non-object model response without throwing', async () => {
    const provider = new FakeLlmProvider(['not an object']);
    const result = await normalizeLead({
      schema: defaultLeadSchema,
      text: 'note',
      provider,
      maxRepairs: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.data).toEqual({});
  });
});
