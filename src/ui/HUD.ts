import { LaunchRecord, TelemetrySample } from '../physics/types';

export class HUD {
  private root: HTMLElement;
  private labels: Record<string, HTMLSpanElement> = {};

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'hud-container';
    const grid = document.createElement('div');
    grid.className = 'hud-grid';
    this.root.appendChild(grid);
    container.appendChild(this.root);

    ['Altitude', 'Speed', 'Range', 'Max Height', 'Flight Time', 'Impact Speed'].forEach((label) => {
      const wrapper = document.createElement('div');
      const heading = document.createElement('span');
      heading.textContent = label.toUpperCase();
      heading.style.opacity = '0.5';
      heading.style.fontSize = '0.65rem';
      const value = document.createElement('span');
      value.textContent = '--';
      value.style.display = 'block';
      value.style.fontSize = '1rem';
      value.style.letterSpacing = '0.06em';
      wrapper.appendChild(heading);
      wrapper.appendChild(value);
      grid.appendChild(wrapper);
      this.labels[label] = value;
    });
  }

  update(sample?: TelemetrySample, record?: LaunchRecord): void {
    if (sample) {
      this.labels['Altitude'].textContent = `${sample.altitude.toFixed(1)} m`;
      this.labels['Speed'].textContent = `${sample.speed.toFixed(1)} m/s`;
      this.labels['Range'].textContent = `${sample.range.toFixed(1)} m`;
    }
    if (record?.summary) {
      this.labels['Max Height'].textContent = `${record.summary.maxHeight.toFixed(1)} m`;
      this.labels['Flight Time'].textContent = `${record.summary.flightTime.toFixed(2)} s`;
      this.labels['Impact Speed'].textContent = `${record.summary.impactSpeed.toFixed(1)} m/s`;
    }
  }
}
