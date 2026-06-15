import { describe, it, expect } from 'vitest';
import { TokenBucket } from './rate-limit';

describe('TokenBucket', () => {
  it('depletes capacity then refuses', () => {
    let t = 0;
    const bucket = new TokenBucket(3, 1, () => t);
    expect(bucket.tryTake()).toBe(true);
    expect(bucket.tryTake()).toBe(true);
    expect(bucket.tryTake()).toBe(true);
    expect(bucket.tryTake()).toBe(false);
  });

  it('reports time until the next token and refills over time', () => {
    let t = 0;
    const bucket = new TokenBucket(1, 1, () => t);
    expect(bucket.tryTake()).toBe(true);
    expect(bucket.tryTake()).toBe(false);
    expect(bucket.msUntilToken()).toBe(1000);
    t = 1000;
    expect(bucket.tryTake()).toBe(true);
  });

  it('take() waits via the injected sleep until a token is available', async () => {
    let t = 0;
    const bucket = new TokenBucket(1, 1, () => t);
    expect(bucket.tryTake()).toBe(true);
    const sleep = async (ms: number) => {
      t += ms;
    };
    await bucket.take(sleep);
    expect(t).toBe(1000);
  });
});
