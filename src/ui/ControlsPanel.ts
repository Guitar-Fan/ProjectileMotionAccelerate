import * as THREE from 'three';
import { Pane } from 'tweakpane';
import chroma from 'chroma-js';
import { EnvironmentState, ForceProfile, ProjectileDefinition } from '../physics/types';

interface ControlsConfig {
	forces: ForceProfile[];
	projectiles: ProjectileDefinition[];
	initialEnvironment: EnvironmentState;
	onLaunch: (params: { force: ForceProfile; projectile: ProjectileDefinition; tint: string; environment: EnvironmentState }) => void;
	onEnvironmentChange: (environment: EnvironmentState) => void;
	onForceHover?: (profile: ForceProfile) => void;
	onProjectileChange?: (projectile: ProjectileDefinition) => void;
}

export class ControlsPanel {
	private pane: Pane;
	private state = {
		forceId: '',
		projectileId: '',
		gravity: 9.81,
		airDensity: 1.0,
		windX: 2,
		windZ: -1.5
	};

	constructor(root: HTMLElement, private config: ControlsConfig) {
		this.state.forceId = config.forces[0]?.id ?? '';
		this.state.projectileId = config.projectiles[0]?.id ?? '';
		this.state.gravity = config.initialEnvironment.gravity;
		this.state.airDensity = config.initialEnvironment.airDensity;
		this.state.windX = config.initialEnvironment.windVector.x;
		this.state.windZ = config.initialEnvironment.windVector.z;

		this.pane = new Pane({ container: root, title: 'Launch Console' });

		const forceOptions = Object.fromEntries(config.forces.map((force) => [force.label, force.id]));
		const forceInput = this.pane.addInput(this.state, 'forceId', {
			options: forceOptions,
			label: 'Force Profile'
		});
		forceInput.on('change', (ev) => {
			this.state.forceId = ev.value;
			const profile = this.config.forces.find((f) => f.id === this.state.forceId);
			if (profile) {
				this.config.onForceHover?.(profile);
			}
		});

		const projectileOptions = Object.fromEntries(config.projectiles.map((proj) => [proj.label, proj.id]));
		const projectileInput = this.pane.addInput(this.state, 'projectileId', {
			options: projectileOptions,
			label: 'Projectile'
		});
		projectileInput.on('change', (ev) => {
			this.state.projectileId = ev.value;
			const projectile = this.config.projectiles.find((p) => p.id === this.state.projectileId);
			if (projectile) {
				this.config.onProjectileChange?.(projectile);
			}
		});

		this.pane.addSeparator();

		const envFolder = this.pane.addFolder({ title: 'Atmospheric Envelope' });
		envFolder
			.addInput(this.state, 'gravity', { min: 2, max: 15, step: 0.1, label: 'Gravity (m/s²)' })
			.on('change', () => this.emitEnvironment());
		envFolder
			.addInput(this.state, 'airDensity', { min: 0.4, max: 1.4, step: 0.01, label: 'Air Density' })
			.on('change', () => this.emitEnvironment());
		envFolder
			.addInput(this.state, 'windX', { min: -12, max: 12, step: 0.1, label: 'Wind X' })
			.on('change', () => this.emitEnvironment());
		envFolder
			.addInput(this.state, 'windZ', { min: -12, max: 12, step: 0.1, label: 'Wind Z' })
			.on('change', () => this.emitEnvironment());

		this.pane.addSeparator();

		this.pane
			.addButton({ title: 'Launch Projectile' })
			.on('click', () => this.triggerLaunch());

		const initial = this.config.forces.find((f) => f.id === this.state.forceId);
		if (initial) {
			this.config.onForceHover?.(initial);
		}
	}

	setForce(profile: ForceProfile): void {
		const index = this.config.forces.findIndex((f) => f.id === profile.id);
		if (index >= 0) {
			this.state.forceId = profile.id;
			this.pane.refresh();
			this.config.onForceHover?.(profile);
		}
	}

	private triggerLaunch(): void {
		const force = this.config.forces.find((f) => f.id === this.state.forceId) ?? this.config.forces[0];
		const projectile =
			this.config.projectiles.find((p) => p.id === this.state.projectileId) ?? this.config.projectiles[0];
		const tint = chroma.mix('#6bf2ff', '#f6b36b', Math.random() * 0.6).hex();
		const environment = this.getEnvironment();
		this.config.onLaunch({ force, projectile, tint, environment });
	}

	private emitEnvironment(): void {
		this.config.onEnvironmentChange(this.getEnvironment());
	}

	private getEnvironment(): EnvironmentState {
		return {
			gravity: this.state.gravity,
			airDensity: this.state.airDensity,
			windVector: new THREE.Vector3(this.state.windX, 0, this.state.windZ)
		};
	}
}
import { Pane } from 'tweakpane';
import chroma from 'chroma-js';