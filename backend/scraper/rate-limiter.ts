export class RateLimiter {
  private lastCallAt = 0;

  constructor(private readonly minIntervalMs: number) {}

  async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallAt;
    const jitter = Math.random() * 500;
    const wait = Math.max(0, this.minIntervalMs + jitter - elapsed);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastCallAt = Date.now();
  }
}
