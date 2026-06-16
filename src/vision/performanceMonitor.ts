export class PerformanceMonitor {
  private timestamps: number[] = [];
  private readonly windowSize: number;

  constructor(windowSize = 30) {
    this.windowSize = windowSize;
  }

  tick(): void {
    const now = performance.now();
    this.timestamps.push(now);
    if (this.timestamps.length > this.windowSize) {
      this.timestamps.shift();
    }
  }

  getFps(): number {
    if (this.timestamps.length < 2) return 0;
    const oldest = this.timestamps[0];
    const newest = this.timestamps[this.timestamps.length - 1];
    const elapsed = newest - oldest;
    if (elapsed <= 0) return 0;
    return ((this.timestamps.length - 1) / elapsed) * 1000;
  }
}
