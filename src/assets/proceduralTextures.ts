import * as THREE from 'three';
import { MaterialPalette } from '../physics/types';

export class AssetLibrary {
  readonly palette: MaterialPalette;
  readonly skyTexture: THREE.Texture;
  readonly groundTexture: THREE.Texture;
  readonly glowTexture: THREE.Texture;

  constructor() {
    this.palette = {
      leather: buildLeatherTexture(),
      graphite: buildGraphiteTexture(),
      copper: buildCopperTexture(),
      plasma: buildPlasmaTexture(),
      basalt: buildBasaltTexture()
    };
    this.skyTexture = buildSkyTexture();
    this.groundTexture = buildFootballFieldTexture();
    this.glowTexture = buildGlowTexture();
  }
}

function createCanvas(size = 512): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create 2d context');
  }
  return { canvas, ctx };
}

function textureFromCanvas(canvas: HTMLCanvasElement, repeat = 2): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function buildGlowTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(64);
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return textureFromCanvas(canvas, 1);
}

function buildFootballFieldTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas(1024);
  
  // Base grass color (varied green)
  ctx.fillStyle = '#41980a'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add grass texture noise
  for (let i = 0; i < 80000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = 1 + Math.random() * 3;
    ctx.fillStyle = `rgba(30, 80, 30, ${0.1 + Math.random() * 0.2})`;
    ctx.fillRect(x, y, size, size);
  }

  // Yard lines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  const lineWidth = 15;
  
  // Draw horizontal lines to simulate yard lines
  // Assuming the texture repeats, we can draw a few lines
  ctx.fillRect(0, 100, canvas.width, lineWidth);
  ctx.fillRect(0, 600, canvas.width, lineWidth);

  // Hash marks
  const hashH = 30;
  const hashW = 6;
  for (let i = 0; i < canvas.width; i += 50) {
     // Top hashes
     ctx.fillRect(i, 100 - hashH/2, hashW, hashH);
     // Bottom hashes
     ctx.fillRect(i, 600 - hashH/2, hashW, hashH);
  }

  // Numbers (simplified as blocks for now as text orientation can be tricky on ground)
  // But let's try to draw a "10" or "20" roughly
  ctx.font = 'bold 80px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(200, 350);
  ctx.rotate(-Math.PI/2);
  ctx.fillText("20", 0, 0);
  ctx.restore();

  return textureFromCanvas(canvas, 1);
}

function buildLeatherTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas();
  // Pigskin brown base
  ctx.fillStyle = '#6b3e2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Pebble grain texture
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 1 + Math.random() * 1.5;
    ctx.fillStyle = `rgba(40, 20, 10, ${0.2 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Laces (simplified strip)
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(canvas.width * 0.4, 0, canvas.width * 0.2, canvas.height);
  
  // Lace stitches
  ctx.fillStyle = '#6b3e2e'; // gap color
  for(let i=0; i<canvas.height; i+=40) {
      ctx.fillRect(canvas.width * 0.4, i, canvas.width * 0.2, 5);
  }

  return textureFromCanvas(canvas, 1);
}

function buildGraphiteTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas();
  // Metallic dark grey
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#2c2f38');
  gradient.addColorStop(0.5, '#4a4d55');
  gradient.addColorStop(1, '#22242b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Scratches
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(200,200,220,0.1)';
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const len = Math.random() * 20;
    const angle = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  return textureFromCanvas(canvas, 1);
}

function buildCopperTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas();
  // Brushed copper base
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#4a2c18');
  gradient.addColorStop(0.2, '#b87333');
  gradient.addColorStop(0.5, '#e6ac75');
  gradient.addColorStop(0.8, '#b87333');
  gradient.addColorStop(1, '#4a2c18');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Fine brush marks
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const w = 2 + Math.random() * 10;
    ctx.fillRect(x, y, w, 1);
  }
  ctx.globalAlpha = 1.0;
  return textureFromCanvas(canvas, 1);
}

function buildPlasmaTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Glowing core
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  
  const gradient = ctx.createRadialGradient(cx, cy, 20, cx, cy, 200);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.2, '#00ffff');
  gradient.addColorStop(0.6, '#0044ff');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Energy arcs
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#00ffff';
  
  for(let i=0; i<20; i++) {
      ctx.beginPath();
      const angle = Math.random() * Math.PI * 2;
      const r = 50 + Math.random() * 100;
      ctx.arc(cx, cy, r, angle, angle + Math.random());
      ctx.stroke();
  }

  return textureFromCanvas(canvas, 1);
}



function buildBasaltTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas();
  ctx.fillStyle = '#0c0f16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 6;
    ctx.fillStyle = `rgba(70, 90, 110, ${Math.random() * 0.2})`;
    ctx.fillRect(x, y, size, size * 0.6);
  }
  return textureFromCanvas(canvas, 6);
}

function buildSkyTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas();
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#05070d');
  gradient.addColorStop(0.4, '#0a1020');
  gradient.addColorStop(1, '#02030a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.6;
    ctx.fillStyle = `rgba(122, 224, 255, ${Math.random() * 0.6})`;
    ctx.fillRect(x, y, 2, 2);
  }
  return textureFromCanvas(canvas, 1);
}
