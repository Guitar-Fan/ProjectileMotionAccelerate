import { LaunchRecord } from '../physics/types';

export class Timeline {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private panel: HTMLElement;

  constructor(root: HTMLElement) {
    this.panel = document.createElement('div');
    this.panel.className = 'timeline-panel';
    const heading = document.createElement('p');
    heading.textContent = 'Trajectory Stack';
    heading.style.margin = '0 0 0.5rem';
    heading.style.fontSize = '0.8rem';
    heading.style.letterSpacing = '0.1em';
    heading.style.opacity = '0.6';
    this.panel.appendChild(heading);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 120;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to create timeline context');
    }
    this.ctx = ctx;
    this.panel.appendChild(this.canvas);
    root.appendChild(this.panel);
  }

  update(records: LaunchRecord[]): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    records.slice(-5).forEach((record, index) => {
      if (!record.samples.length) return;
      const stroke = record.color;
      this.ctx.beginPath();
      record.samples.forEach((sample, sampleIndex) => {
        const x = (sample.time / (record.summary?.flightTime ?? Math.max(sample.time, 1))) * this.canvas.width;
        const y = this.canvas.height - (sample.altitude / Math.max(record.summary?.maxHeight ?? 1, 1)) * this.canvas.height;
        if (sampleIndex === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      this.ctx.strokeStyle = stroke;
      this.ctx.globalAlpha = 0.7 - index * 0.1;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });
    this.ctx.globalAlpha = 1;
  }
}
