import * as THREE from 'three';
import { MaterialPalette } from '../physics/types';

export class AssetLibrary {
  readonly palette: MaterialPalette;
  readonly skyTexture: THREE.Texture;
  readonly groundTexture: THREE.Texture;

  constructor() {
    this.palette = {
      leather: buildLeatherTexture(),
      graphite: buildGraphiteTexture(),
      copper: buildCopperTexture(),
      plasma: buildPlasmaTexture(),
      basalt: buildBasaltTexture()
    };
    this.skyTexture = buildSkyTexture();
    this.groundTexture = this.palette.basalt;
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

function buildLeatherTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas();
  ctx.fillStyle = '#1b120c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 1 + Math.random() * 2;
    const alpha = 0.05 + Math.random() * 0.08;
    ctx.fillStyle = `rgba(255, 196, 128, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.5, radius, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return textureFromCanvas(canvas, 1);
}

function buildGraphiteTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas();
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1c1f28');
  gradient.addColorStop(1, '#11131c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(120,140,160,0.15)';
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * canvas.width;
    const len = Math.random() * 40;
    ctx.beginPath();
    ctx.moveTo(x, Math.random() * canvas.height);
    ctx.lineTo(x + len, Math.random() * canvas.height);
    ctx.stroke();
  }
  return textureFromCanvas(canvas, 4);
}

function buildCopperTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas();
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#2a1c12');
  gradient.addColorStop(0.5, '#ad6a32');
  gradient.addColorStop(1, '#f5be82');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.fillRect(x, y, 2, 8);
  }
  return textureFromCanvas(canvas, 2);
}

function buildPlasmaTexture(): THREE.Texture {
  const { canvas, ctx } = createCanvas();
  const gradient = ctx.createRadialGradient(256, 256, 10, 256, 256, 240);
  gradient.addColorStop(0, '#80f8ff');
  gradient.addColorStop(0.4, '#4aaeff');
  gradient.addColorStop(1, '#11162a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 400; i++) {
    ctx.beginPath();
    const r = 40 + Math.random() * 200;
    ctx.arc(256, 256, r, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2 + 0.5);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
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
