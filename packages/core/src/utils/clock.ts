export interface Clock {
  nowMs(): number;
}

export class SystemClock implements Clock {
  public nowMs(): number {
    return Date.now();
  }
}

export class FixedClock implements Clock {
  private currentMs: number;

  public constructor(initialMs: number) {
    this.currentMs = initialMs;
  }

  public nowMs(): number {
    return this.currentMs;
  }

  public setNowMs(nextMs: number): void {
    this.currentMs = nextMs;
  }

  public advanceMs(deltaMs: number): void {
    this.currentMs += deltaMs;
  }
}
