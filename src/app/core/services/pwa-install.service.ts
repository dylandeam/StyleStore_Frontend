import { Injectable, signal } from '@angular/core';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  readonly canInstall = signal(false);
  readonly installed = signal(false);
  private promptEvent: InstallPromptEvent | null = null;

  constructor() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.promptEvent = event as InstallPromptEvent;
      this.canInstall.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.promptEvent = null;
      this.canInstall.set(false);
      this.installed.set(true);
    });
    this.installed.set(
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches
    );
  }

  async install(): Promise<void> {
    if (!this.promptEvent) return;
    await this.promptEvent.prompt();
    const choice = await this.promptEvent.userChoice;
    if (choice.outcome === 'accepted') this.canInstall.set(false);
    this.promptEvent = null;
  }
}
