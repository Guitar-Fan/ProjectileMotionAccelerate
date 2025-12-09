import * as THREE from 'three';
import { ProjectileDefinition } from '../physics/types';

export class InteractionManager {
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private targetMesh: THREE.Object3D | null = null;
  
  // Visual Aids
  private impactMarker: THREE.Mesh;
  private forceArrow: THREE.ArrowHelper;
  
  // State
  private impactPointLocal = new THREE.Vector3(0, 0, 0); // Local to mesh
  private forceVector = new THREE.Vector3(1, 1, 0);
  private isDragging = false;
  private dragStart = new THREE.Vector2();
  
  public onManualConfigChange: ((impact: THREE.Vector3, impulse: THREE.Vector3) => void) | null = null;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private canvas: HTMLElement
  ) {
    // Setup Impact Marker
    const markerGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false, transparent: true, opacity: 0.8 });
    this.impactMarker = new THREE.Mesh(markerGeo, markerMat);
    this.impactMarker.renderOrder = 999;
    this.impactMarker.visible = false;
    scene.add(this.impactMarker);

    // Setup Force Arrow
    this.forceArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 1, 0).normalize(),
      new THREE.Vector3(0, 0, 0),
      1,
      0xffaa00
    );
    this.forceArrow.visible = false;
    scene.add(this.forceArrow);

    // Event Listeners
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  setTarget(mesh: THREE.Object3D) {
    this.targetMesh = mesh;
    this.impactMarker.visible = false;
    this.forceArrow.visible = false;
  }

  private updateVisuals() {
    if (!this.targetMesh) return;

    // Update Marker Position (World Space)
    const worldImpact = this.impactPointLocal.clone().applyMatrix4(this.targetMesh.matrixWorld);
    this.impactMarker.position.copy(worldImpact);
    this.impactMarker.visible = true;

    // Update Arrow
    if (this.forceVector.lengthSq() > 0) {
      this.forceArrow.position.copy(worldImpact);
      this.forceArrow.setDirection(this.forceVector.clone().normalize());
      this.forceArrow.setLength(this.forceVector.length() * 0.0001); // Scale down visual length
      this.forceArrow.visible = true;
    }
  }

  private onMouseDown(e: MouseEvent) {
    if (!this.targetMesh) return;

    // Update mouse coordinates
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.targetMesh, true);

    if (intersects.length > 0) {
      // Clicked on object -> Set Impact Point
      const point = intersects[0].point;
      this.targetMesh.worldToLocal(this.impactPointLocal.copy(point));
      
      this.isDragging = true;
      this.dragStart.set(e.clientX, e.clientY);
      
      // Reset force vector on new click
      this.forceVector.set(0, 0, 0);
      
      this.updateVisuals();
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (this.isDragging && this.targetMesh) {
      // Dragging -> Set Force Vector
      // We map screen drag to world vector
      // Simple mapping: Up = +Y, Right = +X (in camera space)
      
      const dx = e.clientX - this.dragStart.x;
      const dy = this.dragStart.y - e.clientY; // Up is positive
      
      // Scale factor
      const scale = 100; 
      
      // Get camera basis vectors
      const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
      
      // Project drag onto camera plane
      this.forceVector.set(0, 0, 0)
        .addScaledVector(camRight, dx * scale)
        .addScaledVector(camUp, dy * scale);
        
      this.updateVisuals();
      
      if (this.onManualConfigChange) {
        this.onManualConfigChange(this.impactPointLocal.clone(), this.forceVector.clone());
      }
    }
  }

  private onMouseUp() {
    this.isDragging = false;
  }
}
