/**
 * Token-bucket limiter to stay under Google Sheets' per-user quota
 * (60 requests/min). Sustained ~1 req/s with a small burst; callers `await
 * take()` before each Sheets request. Time is injectable for deterministic tests.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly nowMs: () => number = () => Date.now(),
  ) {
    this.tokens = capacity;
    this.lastRefill = nowMs();
  }

  private refill(): void {
    const now = this.nowMs();
    const elapsedSec = (now - this.lastRefill) / 1000;
    if (elapsedSec <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSecond);
    this.lastRefill = now;
  }

  /** Try to consume a token without waiting. Returns false if none available. */
  tryTake(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Milliseconds until at least one token is available. */
  msUntilToken(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    return Math.ceil(((1 - this.tokens) / this.refillPerSecond) * 1000);
  }

  /** Consume a token, waiting if necessary. */
  async take(sleep: (ms: number) => Promise<void> = defaultSleep): Promise<void> {
    while (!this.tryTake()) {
      await sleep(this.msUntilToken());
    }
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
