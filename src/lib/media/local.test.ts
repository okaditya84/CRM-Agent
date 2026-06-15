import { describe, it, expect } from 'vitest';
import { LocalMediaStore } from './local';

describe('LocalMediaStore', () => {
  it('stores and retrieves bytes with the right mime and extension', async () => {
    const store = new LocalMediaStore();
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const stored = await store.put(bytes, 'image/png');

    expect(stored.key).toMatch(/\.png$/);
    expect(stored.mime).toBe('image/png');
    expect(stored.size).toBe(4);
    expect(stored.url).toBe(`/api/media/${encodeURIComponent(stored.key)}`);

    const got = await store.get(stored.key);
    expect(got).not.toBeNull();
    expect(Array.from(got!.bytes)).toEqual([1, 2, 3, 4]);
    expect(got!.mime).toBe('image/png');
  });

  it('returns null for an unknown key', async () => {
    const store = new LocalMediaStore();
    expect(await store.get('missing.png')).toBeNull();
  });
});
