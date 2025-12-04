import * as THREE from 'three';

interface ProjectileTrail {
  id: string;
  positions: Array<{ x: number; z: number }>;
  color: number;
}

export class MiniMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private width = 200;
  private height = 200;
  private scale = 20.0; // world units per pixel (starts at 20, auto-adjusts)
  private centerX = 100;
  private centerY = 100;
  private trails: Map<string, ProjectileTrail> = new Map();
  private maxTrailPoints = 100;

  constructor(container: HTMLElement, scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.className = 'minimap-canvas';
    this.canvas.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      border: 2px solid rgba(109, 242, 255, 0.5);
      background: rgba(2, 4, 9, 0.85);
      border-radius: 8px;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    `;
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d')!;
  }

  update(projectiles: Array<{ id: string; position: THREE.Vector3; color: number }>): void {
    const ctx = this.ctx;
    
    // Auto-adjust scale based on projectile distances
    if (projectiles.length > 0) {
      let maxDistance = 0;
      projectiles.forEach(proj => {
        const dist = Math.sqrt(proj.position.x * proj.position.x + proj.position.z * proj.position.z);
        maxDistance = Math.max(maxDistance, dist);
      });
      // Add 20% padding and ensure minimum scale of 20
      const targetScale = Math.max(20, (maxDistance * 1.2) / (this.width / 2));
      // Smooth transition
      this.scale += (targetScale - this.scale) * 0.1;
    }
    
    // Clear with dark background
    ctx.fillStyle = 'rgba(2, 4, 9, 0.95)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(26, 50, 77, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * this.width;
      const y = (i / 10) * this.height;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Draw launch pad origin
    ctx.fillStyle = 'rgba(245, 181, 138, 0.6)';
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 181, 138, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw camera position
    const camX = this.centerX + this.camera.position.x / this.scale;
    const camZ = this.centerY - this.camera.position.z / this.scale;
    ctx.fillStyle = 'rgba(141, 209, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(camX, camZ, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw trails
    this.trails.forEach((trail) => {
      if (trail.positions.length < 2) return;
      const color = new THREE.Color(trail.color);
      ctx.strokeStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.4)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      trail.positions.forEach((pos, i) => {
        const x = this.centerX + pos.x / this.scale;
        const z = this.centerY - pos.z / this.scale;
        if (i === 0) {
          ctx.moveTo(x, z);
        } else {
          ctx.lineTo(x, z);
        }
      });
      ctx.stroke();
    });

    // Update trails and draw projectiles
    projectiles.forEach((proj) => {
      const x = this.centerX + proj.position.x / this.scale;
      const z = this.centerY - proj.position.z / this.scale;
      
      // Skip if out of bounds
      if (x < 0 || x > this.width || z < 0 || z > this.height) return;

      // Draw altitude indicator (shadow)
      const shadowAlpha = Math.min(0.3, proj.position.y / 100);
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.arc(x, z + proj.position.y / (this.scale * 2), 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw projectile
      const color = new THREE.Color(proj.color);
      ctx.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
      ctx.beginPath();
      ctx.arc(x, z, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw height line
      if (proj.position.y > 0.5) {
        ctx.strokeStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, 0.3)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, z);
        ctx.lineTo(x, z + proj.position.y / (this.scale * 2));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw compass
    this.drawCompass(ctx);

    // Draw scale legend
    ctx.fillStyle = 'rgba(141, 209, 255, 0.7)';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText(`${Math.floor(10 * this.scale)}m`, 10, this.height - 10);
  }

  private drawCompass(ctx: CanvasRenderingContext2D): void {
    const cx = 25;
    const cy = 25;
    const radius = 15;

    // Outer circle
    ctx.strokeStyle = 'rgba(109, 242, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // North arrow
    ctx.fillStyle = 'rgba(109, 242, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx - 4, cy - 5);
    ctx.lineTo(cx, cy - 2);
    ctx.lineTo(cx + 4, cy - 5);
    ctx.closePath();
    ctx.fill();

    // N label
    ctx.fillStyle = 'rgba(109, 242, 255, 0.9)';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - radius - 4);
  }

  clearTrails(): void {
    this.trails.clear();
  }

  dispose(): void {
    this.canvas.remove();
  }
}
