/*
 * Soccer Free Kick Simulator
 * Built with the same CDN stack as GolfSimulator (Three.js r128 + OrbitControls + GSAP)
 * Focused on high-fidelity projectile motion: Reynolds drag, Magnus lift, RK4 integration
 */

class TrajectoryTracer {
  constructor(canvas, onSolved) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.onSolved = onSolved;
    this.active = false;
    this.drawing = false;
    this.currentPlane = null;
    this.paths = { side: null, plan: null };
    this.maxDistance = 38;
    this.maxHeight = 18;
    this.maxCurve = 12;
    this.statusText = 'Sketch trajectory: top = height, bottom = curve';

    if (this.canvas) {
      this.attachEvents();
      this.drawFrame();
    }
  }

  attachEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('pointerup', () => this.handlePointerUp());
    this.canvas.addEventListener('pointerleave', () => this.handlePointerUp());
  }

  enable() {
    this.active = true;
    this.resetPaths();
    this.statusText = 'Trace elevation (top) + plan view (bottom)';
    this.drawFrame();
  }

  disable() {
    this.active = false;
    this.resetPaths();
    this.statusText = 'Sketch trajectory: top = height, bottom = curve';
    this.drawFrame();
  }

  resetPaths() {
    this.paths.side = null;
    this.paths.plan = null;
    this.currentPlane = null;
    this.drawing = false;
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  handlePointerDown(event) {
    if (!this.active || !this.ctx) return;
    event.preventDefault();
    const coords = this.getNormalizedCoords(event);
    const plane = this.resolvePlane(coords.y);
    if (!plane) return;
    this.currentPlane = plane;
    this.drawing = true;
    this.paths[plane] = [];
    this.pushPoint(plane, coords);
    this.drawFrame();
  }

  handlePointerMove(event) {
    if (!this.active || !this.drawing || !this.currentPlane) return;
    event.preventDefault();
    this.pushPoint(this.currentPlane, this.getNormalizedCoords(event));
    this.drawFrame();
  }

  handlePointerUp() {
    if (!this.drawing) return;
    this.drawing = false;
    this.currentPlane = null;
    this.drawFrame();
    if (this.paths.side && this.paths.plan) {
      const solution = this.computeSolution();
      if (solution && typeof this.onSolved === 'function') {
        this.onSolved(solution);
        this.statusText = 'Solved → parameters updated';
        this.drawFrame();
      }
    } else {
      this.statusText = this.paths.side ? 'Now sketch the plan view' : 'Start with the elevation view (top)';
      this.drawFrame();
    }
  }

  getNormalizedCoords(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y))
    };
  }

  resolvePlane(normalizedY) {
    if (normalizedY < 0.5) return 'side';
    if (normalizedY >= 0.5 && normalizedY <= 1) return 'plan';
    return null;
  }

  pushPoint(plane, coords) {
    if (!this.paths[plane]) this.paths[plane] = [];
    const regionHeight = 0.5;
    const regionTop = plane === 'side' ? 0 : 0.5;
    const relativeY = (coords.y - regionTop) / regionHeight;
    const clampedY = Math.min(1, Math.max(0, relativeY));
    if (plane === 'side') {
      const normalizedHeight = 1 - clampedY;
      this.paths.side.push({ x: coords.x, y: normalizedHeight });
    } else {
      const lateral = (0.5 - clampedY) * 2; // -1 .. 1
      this.paths.plan.push({ x: coords.x, y: lateral });
    }
    if (this.paths[plane].length > 600) {
      this.paths[plane].shift();
    }
  }

  computeSolution() {
    const side = this.paths.side;
    const plan = this.paths.plan;
    if (!side?.length || !plan?.length) return null;

    const distanceRatio = Math.min(1, Math.max(0.2, side[side.length - 1].x));
    const distance = distanceRatio * this.maxDistance;
    const apexRatio = side.reduce((max, p) => Math.max(max, p.y), 0);
    const apex = Math.max(0.5, apexRatio * this.maxHeight);

    const lateralEnd = plan[plan.length - 1].y;
    const curveFactor = plan.reduce((max, p) => Math.max(max, Math.abs(p.y)), 0);
    const lateral = lateralEnd * this.maxCurve;

    return {
      distance,
      apex,
      lateral,
      curveFactor
    };
  }

  drawFrame() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(4, 8, 18, 0.95)');
    gradient.addColorStop(1, 'rgba(7, 14, 28, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('Side Elevation', 18, 26);
    ctx.fillText('Plan View', 18, height / 2 + 26);

    this.drawPath(this.paths.side, 'side');
    this.drawPath(this.paths.plan, 'plan');

    ctx.font = '600 16px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(33, 212, 253, 0.85)';
    ctx.fillText(this.statusText, 18, height - 18);
  }

  drawPath(points, plane) {
    if (!points?.length) return;
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.strokeStyle = plane === 'side' ? 'rgba(33, 212, 253, 0.9)' : 'rgba(183, 33, 255, 0.9)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    points.forEach((point, idx) => {
      const x = point.x * width;
      let y;
      if (plane === 'side') {
        const regionHeight = height / 2;
        y = (1 - point.y) * regionHeight;
      } else {
        const regionHeight = height / 2;
        const normalized = 0.5 - point.y * 0.5;
        y = height / 2 + normalized * regionHeight;
      }
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

class SoccerFreeKickSimulator {
  constructor() {
    console.log('⚽ Initializing Soccer Free Kick Simulator');
    this.container = document.getElementById('sim-canvas');
    if (!this.container) {
      throw new Error('Canvas container #sim-canvas not found');
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050912);
    this.scene.fog = new THREE.Fog(0x050912, 60, 220);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 400);
    this.camera.position.set(-25, 12, -45);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 2, 22);
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 120;
    this.controls.update();

    this.clock = new THREE.Clock();

    this.params = {
      gravity: -9.81,
      ballMass: 0.43,
      ballRadius: 0.11,
      dragCoefficient: 0.25,
      liftCoefficient: 0.18,
      area: Math.PI * Math.pow(0.11, 2),
      airDensity: 1.2,
      turfFriction: 0.62,
      restitutionBase: 0.42
    };

    this.windVector = new THREE.Vector3();

    this.ballState = {
      active: false,
      rolling: false,
      velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      trail: [],
      flightTime: 0,
      carryDistance: 0,
      totalDistance: 0,
      apex: 0,
      outcome: 'Awaiting kick',
      logged: false
    };

    this.trailCanvas = document.getElementById('trail-overlay');
    this.trailCtx = this.trailCanvas ? this.trailCanvas.getContext('2d') : null;
    this.traceCanvas = document.getElementById('trace-designer');
    this.traceModeActive = false;
    this.tracer = this.traceCanvas ? new TrajectoryTracer(this.traceCanvas, (solution) => this.handleTraceSolution(solution)) : null;
    this.elasticity = parseFloat(document.getElementById('ball-elasticity')?.value) || 0.45;

    this.setupLights();
    this.buildPitch();
    this.buildGoal();
    this.buildWall();
    this.buildBall();
    this.setupUI();

    window.addEventListener('resize', () => this.handleResize());

    this.animate();
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x0f2440, 0.5);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(-30, 50, -20);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -60;
    dir.shadow.camera.right = 60;
    dir.shadow.camera.top = 60;
    dir.shadow.camera.bottom = -10;
    this.scene.add(dir);
  }

  buildPitch() {
    const length = 90;
    const width = 60;
    const geometry = new THREE.PlaneGeometry(width, length, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x0b5a2a, roughness: 0.8, metalness: 0.1 });
    const pitch = new THREE.Mesh(geometry, material);
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    this.scene.add(pitch);

    // Midline + arcs
    const markings = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });

    const createRect = (w, h, z) => {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, -h / 2);
      shape.lineTo(w / 2, -h / 2);
      shape.lineTo(w / 2, h / 2);
      shape.lineTo(-w / 2, h / 2);
      shape.lineTo(-w / 2, -h / 2);
      return shape.getPoints(16).map(p => new THREE.Vector3(p.x, 0.01, p.y + z));
    };

    const penaltyRect = new THREE.BufferGeometry().setFromPoints(createRect(40, 16, 30));
    markings.add(new THREE.LineLoop(penaltyRect, lineMaterial));

    const boxRect = new THREE.BufferGeometry().setFromPoints(createRect(18, 6, 36));
    markings.add(new THREE.LineLoop(boxRect, lineMaterial));

    const penaltyArcPoints = [];
    const arcRadius = 9.15;
    for (let i = 0; i <= 40; i++) {
      const angle = Math.PI - (i / 40) * Math.PI;
      penaltyArcPoints.push(new THREE.Vector3(Math.cos(angle) * arcRadius, 0.01, 24 + Math.sin(angle) * arcRadius));
    }
    const penaltyArc = new THREE.BufferGeometry().setFromPoints(penaltyArcPoints);
    markings.add(new THREE.Line(penaltyArc, lineMaterial));

    this.scene.add(markings);
  }

  buildGoal() {
    const goalGroup = new THREE.Group();
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0xf7f9fc, metalness: 0.2, roughness: 0.4 });
    const postGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2.44, 16);

    const leftPost = new THREE.Mesh(postGeometry, postMaterial);
    leftPost.position.set(-3.66, 1.22, 45);
    leftPost.castShadow = true;
    goalGroup.add(leftPost);

    const rightPost = leftPost.clone();
    rightPost.position.x = 3.66;
    goalGroup.add(rightPost);

    const crossbarGeo = new THREE.CylinderGeometry(0.08, 0.08, 7.32, 16);
    const crossbar = new THREE.Mesh(crossbarGeo, postMaterial);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.44, 45);
    crossbar.castShadow = true;
    goalGroup.add(crossbar);

    const netGeometry = new THREE.PlaneGeometry(7.32, 2.44, 16, 16);
    const netMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, wireframe: true });
    const net = new THREE.Mesh(netGeometry, netMaterial);
    net.position.set(0, 1.22, 46.1);
    goalGroup.add(net);

    this.goal = {
      width: 7.32,
      height: 2.44,
      depthZ: 45,
      mesh: goalGroup
    };

    this.scene.add(goalGroup);
  }

  buildWall() {
    const wallGroup = new THREE.Group();
    const playerGeo = new THREE.BoxGeometry(0.4, 1.8, 0.3);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.6 });

    for (let i = 0; i < 5; i++) {
      const defender = new THREE.Mesh(playerGeo, playerMat);
      defender.position.set(-1 + i * 0.5, 0.9, 15);
      defender.castShadow = true;
      wallGroup.add(defender);
    }

    this.wallGroup = wallGroup;
    this.scene.add(wallGroup);
  }

  buildBall() {
    const geo = new THREE.SphereGeometry(this.params.ballRadius, 64, 64);
    const texture = this.generateBallTexture();
    const mat = new THREE.MeshPhysicalMaterial({
      map: texture,
      bumpMap: texture,
      bumpScale: 0.015,
      clearcoat: 0.75,
      clearcoatRoughness: 0.18,
      roughness: 0.32,
      metalness: 0.08,
      sheen: 0.1,
      transmission: 0.03
    });
    this.ballMesh = new THREE.Mesh(geo, mat);
    this.ballMesh.castShadow = true;
    this.scene.add(this.ballMesh);

    this.resetBall();
  }

  generateBallTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fdfdf9';
    ctx.fillRect(0, 0, size, size);

    const hexRadius = 90;
    const verticalSpacing = Math.sqrt(3) * hexRadius;
    ctx.strokeStyle = '#d4d8df';
    ctx.lineWidth = 6;

    const drawHex = (cx, cy, r) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 3 * i + Math.PI / 6;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    };

    for (let y = -verticalSpacing; y < size + verticalSpacing; y += verticalSpacing) {
      for (let x = -hexRadius * 2; x < size + hexRadius * 2; x += hexRadius * 3) {
        const offset = (Math.round(y / verticalSpacing) % 2) * 1.5 * hexRadius;
        drawHex(x + offset, y, hexRadius * 0.95);
      }
    }

    ctx.strokeStyle = 'rgba(33, 212, 253, 0.2)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(size * 0.4, size * 0.45, size * 0.38, Math.PI * 0.1, Math.PI * 1.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.64, size * 0.58, size * 0.32, -Math.PI * 0.2, Math.PI * 0.85);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
    texture.repeat.set(2, 1.6);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
  }

  resetBall() {
    this.ballMesh.position.set(0, this.params.ballRadius, -5);
    this.ballMesh.scale.set(1, 1, 1);
    this.ballState.velocity.set(0, 0, 0);
    this.ballState.spin.set(0, 0, 0);
    this.ballState.active = false;
    this.ballState.rolling = false;
    this.ballState.trail = [];
    this.ballState.flightTime = 0;
    this.ballState.carryDistance = 0;
    this.ballState.totalDistance = 0;
    this.ballState.apex = 0;
    this.ballState.outcome = 'Awaiting kick';
    this.ballState.logged = false;
    this.drawTrail();
    this.updateTelemetry();
  }

  setupUI() {
    const sliders = [
      { id: 'elevation', label: 'elevation-value', suffix: '' },
      { id: 'azimuth', label: 'azimuth-value', suffix: '' },
      { id: 'spin', label: 'spin-value', suffix: '' },
      { id: 'speed', label: 'speed-value', suffix: '' },
      { id: 'wind-speed', label: 'wind-speed-value', suffix: '' },
      { id: 'wind-dir', label: 'wind-dir-value', suffix: '' },
      { id: 'ball-elasticity', label: 'elasticity-value', suffix: '' }
    ];

    sliders.forEach(({ id, label }) => {
      const input = document.getElementById(id);
      const labelEl = document.getElementById(label);
      if (input && labelEl) {
        labelEl.textContent = input.value;
        input.addEventListener('input', () => {
          labelEl.textContent = input.value;
          if (id === 'wind-speed' || id === 'wind-dir') {
            this.updateWind();
          } else if (id === 'ball-elasticity') {
            this.elasticity = parseFloat(input.value);
          }
        });
      }
    });

    document.getElementById('kick-btn').addEventListener('click', () => this.launchKick());
    document.getElementById('reset-btn').addEventListener('click', () => this.resetBall());
    const traceBtn = document.getElementById('trace-mode-btn');
    if (traceBtn) {
      traceBtn.addEventListener('click', () => this.toggleTraceMode());
      this.traceModeBtn = traceBtn;
    }

    this.shotLogEl = document.getElementById('shot-log');

    this.updateWind();
  }

  updateWind() {
    const speed = parseFloat(document.getElementById('wind-speed').value);
    const dirDeg = parseFloat(document.getElementById('wind-dir').value);
    const dirRad = THREE.MathUtils.degToRad(dirDeg);
    // Direction: 0 deg = tailwind (towards goal)
    this.windVector.set(
      Math.sin(dirRad) * speed,
      0,
      Math.cos(dirRad) * speed
    );
  }

  toggleTraceMode(forceState) {
    if (!this.tracer) {
      console.warn('Trace designer unavailable');
      return;
    }
    const nextState = typeof forceState === 'boolean' ? forceState : !this.traceModeActive;
    this.traceModeActive = nextState;
    document.body.classList.toggle('trace-mode', this.traceModeActive);
    if (this.traceModeBtn) {
      this.traceModeBtn.textContent = this.traceModeActive ? 'Exit Trace Mode' : 'Trace Trajectory Mode';
    }
    if (this.traceModeActive) {
      this.controls.enabled = false;
      this.tracer.enable();
    } else {
      this.controls.enabled = true;
      this.tracer.disable();
    }
  }

  handleTraceSolution(solution) {
    if (!solution) return;
    const g = Math.abs(this.params.gravity);
    const distance = THREE.MathUtils.clamp(solution.distance, 8, 38);
    const apex = THREE.MathUtils.clamp(solution.apex, 0.5, 18);
    const lateral = THREE.MathUtils.clamp(solution.lateral, -12, 12);

    const theta = Math.atan(Math.min(1.08, Math.max(0.05, (4 * apex) / Math.max(distance, 4))));
    const sin2Theta = Math.max(0.08, Math.sin(2 * theta));
    let speed = Math.sqrt((distance * g) / sin2Theta);
    speed = THREE.MathUtils.clamp(speed, 12, 38);

    const azimuth = Math.atan2(lateral, distance);
    const curveFactor = solution.curveFactor || Math.abs(lateral) / Math.max(distance, 6);
    const spin = THREE.MathUtils.clamp(curveFactor * 5200 * Math.sign(lateral || 0.0001), -6000, 6000);

    this.syncSlider('elevation', THREE.MathUtils.radToDeg(theta));
    this.syncSlider('speed', speed);
    this.syncSlider('azimuth', THREE.MathUtils.radToDeg(azimuth));
    this.syncSlider('spin', spin);

    if (this.tracer) {
      this.tracer.statusText = `Suggested: ${speed.toFixed(1)} m/s · ${THREE.MathUtils.radToDeg(theta).toFixed(1)}° · spin ${spin.toFixed(0)} rpm`;
      this.tracer.drawFrame();
    }
  }

  syncSlider(id, value) {
    const input = document.getElementById(id);
    if (!input) return;
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const clamped = Math.min(max, Math.max(min, value));
    input.value = clamped;
    input.dispatchEvent(new Event('input'));
  }

  launchKick() {
    if (this.ballState.active) {
      return;
    }

    if (this.traceModeActive) {
      this.toggleTraceMode(false);
    }

    const elevation = THREE.MathUtils.degToRad(parseFloat(document.getElementById('elevation').value));
    const azimuth = THREE.MathUtils.degToRad(parseFloat(document.getElementById('azimuth').value));
    const speed = parseFloat(document.getElementById('speed').value);
    const spinRPM = parseFloat(document.getElementById('spin').value);

    const direction = new THREE.Vector3(
      Math.sin(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.cos(azimuth) * Math.cos(elevation)
    ).normalize();

    this.ballState.velocity.copy(direction).multiplyScalar(speed);

    // Spin axis: vertical for horizontal curve + slight forward tilt to mimic topspin/backspin depending on elevation
    const spinAxis = new THREE.Vector3(0, 1, 0);
    const spinRad = (spinRPM * Math.PI * 2) / 60;
    this.ballState.spin.copy(spinAxis).multiplyScalar(spinRad);

    this.ballState.active = true;
    this.ballState.rolling = false;
    this.ballState.trail = [];
    this.ballState.flightTime = 0;
    this.ballState.carryDistance = 0;
    this.ballState.totalDistance = 0;
    this.ballState.apex = 0;
    this.ballState.outcome = 'In flight';
    this.ballState.logged = false;

    this.updateTelemetry();
  }

  integrateRK4(dt) {
    const position = this.ballMesh.position.clone();
    const velocity = this.ballState.velocity.clone();
    const spin = this.ballState.spin.clone();

    const acceleration = (vel) => {
      const relativeVel = vel.clone().sub(this.windVector);
      const speed = relativeVel.length();
      if (speed === 0) {
        return new THREE.Vector3(0, this.params.gravity, 0);
      }

      const drag = relativeVel.clone().multiplyScalar(
        (-0.5 * this.params.airDensity * this.params.dragCoefficient * this.params.area * speed) / this.params.ballMass
      );

      const magnus = new THREE.Vector3().crossVectors(spin, relativeVel).multiplyScalar(
        (0.5 * this.params.airDensity * this.params.liftCoefficient * this.params.area) / this.params.ballMass
      );

      const gravity = new THREE.Vector3(0, this.params.gravity, 0);
      return gravity.add(drag).add(magnus);
    };

    const k1v = acceleration(velocity).multiplyScalar(dt);
    const k1x = velocity.clone().multiplyScalar(dt);

    const k2v = acceleration(velocity.clone().addScaledVector(k1v, 0.5)).multiplyScalar(dt);
    const k2x = velocity.clone().addScaledVector(k1v, 0.5).multiplyScalar(dt);

    const k3v = acceleration(velocity.clone().addScaledVector(k2v, 0.5)).multiplyScalar(dt);
    const k3x = velocity.clone().addScaledVector(k2v, 0.5).multiplyScalar(dt);

    const k4v = acceleration(velocity.clone().add(k3v)).multiplyScalar(dt);
    const k4x = velocity.clone().add(k3v).multiplyScalar(dt);

    velocity.add(k1v.clone().add(k2v.multiplyScalar(2)).add(k3v.multiplyScalar(2)).add(k4v).multiplyScalar(1 / 6));
    position.add(k1x.clone().add(k2x.multiplyScalar(2)).add(k3x.multiplyScalar(2)).add(k4x).multiplyScalar(1 / 6));

    this.ballState.velocity.copy(velocity);
    this.ballMesh.position.copy(position);
  }

  updatePhysics(dt) {
    if (!this.ballState.active) {
      return;
    }

    const substeps = 4;
    const step = dt / substeps;
    for (let i = 0; i < substeps; i++) {
      this.integrateRK4(step);
      this.handleCollisions();
      this.ballState.flightTime += step;
      this.recordTrail();
    }

    this.updateTelemetry();
  }

  handleCollisions() {
    const pos = this.ballMesh.position;
    const radius = this.params.ballRadius;

    // Ground contact
    if (pos.y <= radius) {
      if (this.ballState.velocity.length() < 0.5) {
        pos.y = radius;
        this.ballState.velocity.set(0, 0, 0);
        this.ballState.active = false;
        this.ballState.outcome = 'Settled';
        return;
      }

      pos.y = radius;
      const impactSpeed = this.ballState.velocity.length();
      const restitution = this.computeEffectiveRestitution(impactSpeed);
      const tangentialLoss = 0.8 - this.elasticity * 0.08;
      this.ballState.velocity.y *= -restitution;
      this.ballState.velocity.x *= tangentialLoss;
      this.ballState.velocity.z *= tangentialLoss;
      this.triggerCompression(impactSpeed);
      if (Math.abs(this.ballState.velocity.y) < 1.5) {
        this.ballState.rolling = true;
      }
    }

    // Rolling friction
    if (this.ballState.rolling) {
      const friction = this.params.turfFriction * 0.02;
      this.ballState.velocity.x *= 1 - friction;
      this.ballState.velocity.z *= 1 - friction;
      if (this.ballState.velocity.length() < 0.5) {
        this.ballState.velocity.set(0, 0, 0);
        this.ballState.active = false;
        this.ballState.outcome = 'Stopped';
      }
    }

    // Goal detection
    if (
      pos.z >= this.goal.depthZ - 0.2 &&
      Math.abs(pos.x) <= this.goal.width * 0.5 &&
      pos.y <= this.goal.height &&
      this.ballState.velocity.z > 0
    ) {
      this.ballState.active = false;
      this.ballState.outcome = 'Goal!';
      gsap.to(this.ballMesh.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 0.1, yoyo: true, repeat: 1 });
    }

    // Wall collision (simple AABB)
    this.wallGroup.children.forEach(defender => {
      const minX = defender.position.x - 0.2;
      const maxX = defender.position.x + 0.2;
      const minY = 0;
      const maxY = 1.8;
      const minZ = defender.position.z - 0.15;
      const maxZ = defender.position.z + 0.15;
      if (
        pos.x >= minX - radius && pos.x <= maxX + radius &&
        pos.y >= minY && pos.y <= maxY &&
        pos.z >= minZ - radius && pos.z <= maxZ + radius
      ) {
        this.ballState.velocity.multiplyScalar(0.5);
        this.ballState.velocity.z *= -0.65;
        this.ballState.spin.multiplyScalar(0.6);
        this.triggerCompression(this.ballState.velocity.length());
        gsap.to(defender.rotation, { y: defender.rotation.y + 0.6, duration: 0.3 });
      }
    });

    // Update stats
    this.ballState.apex = Math.max(this.ballState.apex, pos.y);
    this.ballState.carryDistance = Math.max(this.ballState.carryDistance, pos.z + 5);
    this.ballState.totalDistance = Math.max(this.ballState.totalDistance, pos.z + 5);
  }

  computeEffectiveRestitution(impactSpeed = 0) {
    const base = this.params.restitutionBase;
    const elasticBonus = this.elasticity * 0.35;
    const speedBonus = Math.min(impactSpeed, 28) * 0.008;
    return THREE.MathUtils.clamp(base + elasticBonus + speedBonus * 0.2, 0.42, 0.92);
  }

  triggerCompression(impactSpeed = 5) {
    if (!this.ballMesh) return;
    const compression = Math.min(0.3, (impactSpeed / 38) * (0.25 + this.elasticity * 0.3));
    gsap.to(this.ballMesh.scale, {
      x: 1 + compression * 0.35,
      y: 1 - compression * 0.55,
      z: 1 + compression * 0.35,
      duration: 0.12,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1
    });
  }

  recordTrail() {
    const pos = this.ballMesh.position;
    this.ballState.trail.push({ x: pos.z + 5, y: pos.y });
    if (this.ballState.trail.length > 240) {
      this.ballState.trail.shift();
    }
    this.drawTrail();
  }

  drawTrail() {
    if (!this.trailCtx || !this.trailCanvas) return;
    const ctx = this.trailCtx;
    const width = this.trailCanvas.width;
    const height = this.trailCanvas.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(33, 212, 253, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const maxDistance = 40;
    const maxHeight = 12;

    this.ballState.trail.forEach((point, idx) => {
      const x = (point.x / maxDistance) * width;
      const y = height - (point.y / maxHeight) * height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  updateTelemetry() {
    const speed = this.ballState.velocity.length();
    document.getElementById('telemetry-speed').textContent = `${speed.toFixed(1)} m/s`;
    document.getElementById('telemetry-angle').textContent = `${THREE.MathUtils.radToDeg(Math.atan2(this.ballState.velocity.y, this.ballState.velocity.z)).toFixed(1)}°`;
    document.getElementById('telemetry-curve').textContent = `${THREE.MathUtils.radToDeg(Math.atan2(this.ballState.velocity.x, this.ballState.velocity.z)).toFixed(1)}°`;
    document.getElementById('telemetry-apex').textContent = `${this.ballState.apex.toFixed(2)} m`;
    document.getElementById('telemetry-carry').textContent = `${this.ballState.carryDistance.toFixed(1)} m`;
    document.getElementById('telemetry-total').textContent = `${this.ballState.totalDistance.toFixed(1)} m`;
    document.getElementById('telemetry-hang').textContent = `${this.ballState.flightTime.toFixed(2)} s`;
    document.getElementById('telemetry-spin').textContent = `${(this.ballState.spin.length() * 60 / (Math.PI * 2)).toFixed(0)} rpm`;

    if (!this.ballState.active && this.ballState.trail.length > 0) {
      this.appendShotLog();
    }
  }

  appendShotLog() {
    if (!this.shotLogEl || this.ballState.logged) return;
    const log = document.createElement('div');
    log.style.marginBottom = '0.75rem';
    log.innerHTML = `
      [${new Date().toLocaleTimeString()}] ${this.ballState.outcome}<br>
      ↳ Carry ${this.ballState.carryDistance.toFixed(1)}m · Apex ${this.ballState.apex.toFixed(1)}m · Hang ${this.ballState.flightTime.toFixed(2)}s
    `;
    this.shotLogEl.prepend(log);
    if (this.shotLogEl.children.length > 8) {
      this.shotLogEl.removeChild(this.shotLogEl.lastChild);
    }
    this.ballState.logged = true;
  }

  handleResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.updatePhysics(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.soccerKickLab = new SoccerFreeKickSimulator();
});
