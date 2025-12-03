import { LaunchRecord } from '../physics/types';

export class Diagnostics {
  private label: HTMLElement;
  private accumulator = 0;
  private frames = 0;
  private fps = 0;

  constructor(root: HTMLElement) {
    this.label = document.createElement('div');
    this.label.style.position = 'fixed';
    this.label.style.left = '1.5rem';
    this.label.style.top = '1.5rem';
    this.label.style.background = 'rgba(7, 10, 16, 0.65)';
    this.label.style.padding = '0.6rem 0.8rem';
    this.label.style.borderRadius = '0.75rem';
    this.label.style.fontFamily = '"IBM Plex Mono", monospace';
    this.label.style.fontSize = '0.75rem';
    this.label.style.letterSpacing = '0.08em';
    this.label.style.border = '1px solid rgba(107, 242, 255, 0.15)';
    this.label.textContent = 'FPS -- | Shots 0';
    root.appendChild(this.label);
  }

  update(dt: number, records: LaunchRecord[]): void {
    this.accumulator += dt;
    this.frames += 1;
    if (this.accumulator >= 1) {
      this.fps = this.frames;
      this.frames = 0;
      this.accumulator = 0;
    }
    const active = records.filter((record) => !record.summary).length;
    this.label.textContent = `FPS ${this.fps.toString().padStart(2, ' ')} | Active ${active}`;
  }
}
