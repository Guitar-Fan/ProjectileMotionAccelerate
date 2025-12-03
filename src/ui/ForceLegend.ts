import { ForceProfile } from '../physics/types';

interface ForceLegendConfig {
  container: HTMLElement;
  profiles: ForceProfile[];
  onSelect: (profile: ForceProfile) => void;
}

export class ForceLegend {
  private buttons: HTMLButtonElement[] = [];
  private activeIndex = 0;
  private profiles: ForceProfile[];

  constructor(config: ForceLegendConfig) {
    this.profiles = config.profiles;
    const wrapper = document.createElement('div');
    wrapper.className = 'force-legend';
    config.container.appendChild(wrapper);

    config.profiles.forEach((profile, index) => {
      const button = document.createElement('button');
      const img = document.createElement('img');
      img.src = profile.icon;
      img.alt = profile.label;
      button.appendChild(img);
      button.addEventListener('click', () => {
        this.setActive(index);
        config.onSelect(profile);
      });
      wrapper.appendChild(button);
      this.buttons.push(button);
    });
    this.setActive(0);
  }

  setActive(index: number): void {
    this.buttons.forEach((btn) => btn.classList.remove('active'));
    if (this.buttons[index]) {
      this.buttons[index].classList.add('active');
      this.activeIndex = index;
    }
  }

  highlightById(id: string): void {
    const index = this.profiles.findIndex((profile) => profile.id === id);
    if (index >= 0) {
      this.setActive(index);
    }
  }
}
