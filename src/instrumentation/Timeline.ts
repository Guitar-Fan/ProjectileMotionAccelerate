import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { LaunchRecord } from '../physics/types';

Chart.register(...registerables);

export class Timeline {
  private canvas: HTMLCanvasElement;
  private chart: Chart;
  private panel: HTMLElement;

  constructor(root: HTMLElement) {
    this.panel = document.createElement('div');
    this.panel.className = 'timeline-panel';
    const heading = document.createElement('p');
    heading.textContent = 'Trajectory Analysis';
    heading.style.margin = '0 0 0.5rem';
    heading.style.fontSize = '0.8rem';
    heading.style.letterSpacing = '0.1em';
    heading.style.opacity = '0.6';
    this.panel.appendChild(heading);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 160;
    this.panel.appendChild(this.canvas);
    root.appendChild(this.panel);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: []
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Time (s)',
              color: 'rgba(141, 209, 255, 0.7)',
              font: { family: 'IBM Plex Mono', size: 10 }
            },
            ticks: { color: 'rgba(141, 209, 255, 0.5)', font: { size: 9 } },
            grid: { color: 'rgba(26, 50, 77, 0.3)' }
          },
          y: {
            title: {
              display: true,
              text: 'Altitude (m)',
              color: 'rgba(141, 209, 255, 0.7)',
              font: { family: 'IBM Plex Mono', size: 10 }
            },
            ticks: { color: 'rgba(141, 209, 255, 0.5)', font: { size: 9 } },
            grid: { color: 'rgba(26, 50, 77, 0.3)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(2, 4, 9, 0.9)',
            titleColor: 'rgba(109, 242, 255, 0.9)',
            bodyColor: 'rgba(141, 209, 255, 0.8)',
            borderColor: 'rgba(109, 242, 255, 0.5)',
            borderWidth: 1,
            titleFont: { family: 'IBM Plex Mono', size: 11 },
            bodyFont: { family: 'IBM Plex Mono', size: 10 }
          }
        }
      }
    };

    this.chart = new Chart(this.canvas, config);
  }

  update(records: LaunchRecord[]): void {
    const datasets = records.slice(-5).map((record, index) => ({
      label: `${record.profileLabel} - ${record.projectileLabel}`,
      data: record.samples.map(s => ({ x: s.time, y: s.altitude })),
      borderColor: record.color,
      backgroundColor: record.color + '40',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: false
    }));

    this.chart.data.datasets = datasets;
    this.chart.update('none');
  }
}
