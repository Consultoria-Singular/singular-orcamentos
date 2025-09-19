import { Component, effect, signal } from '@angular/core';

const STORAGE_KEY = 'singular-theme';

type ThemeMode = 'light' | 'dark' | 'auto';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <label class="sg-theme-toggle" [attr.data-mode]="mode()">
      <span>{{ toggleLabel() }}</span>
      <input type="checkbox" [checked]="mode() === 'dark'" (change)="toggleTheme($event)" />
    </label>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      input[type='checkbox'] {
        width: 2.5rem;
        height: 1.25rem;
        border-radius: 999px;
        background: var(--color-border, #d1d5db);
        position: relative;
        -webkit-appearance: none;
        appearance: none;
        cursor: pointer;
        transition: background 200ms ease;
        border: 1px solid var(--color-border, #e5e7eb);
      }
      input[type='checkbox']::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 0.9rem;
        height: 0.9rem;
        border-radius: 999px;
        background: var(--color-on-surface, #111827);
        transition: transform 200ms ease;
      }
      input[type='checkbox']:checked {
        background: var(--color-brand, #5321de);
        border-color: transparent;
      }
      input[type='checkbox']:checked::after {
        transform: translateX(1.2rem);
        background: var(--color-on-brand, #ffffff);
      }
    `
  ]
})
export class ThemeToggleComponent {
  mode = signal<ThemeMode>('auto');

  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      this.mode.set(stored);
    } else {
      this.mode.set('auto');
    }

    effect(() => {
      const current = this.mode();
      this.applyTheme(current);
    });
  }

  toggleLabel(): string {
    const current = this.mode();
    if (current === 'auto') {
      return 'Auto';
    }
    return current === 'dark' ? 'Escuro' : 'Claro';
  }

  toggleTheme(event: Event): void {
    const target = event.target as HTMLInputElement;
    const nextMode: ThemeMode = target.checked ? 'dark' : this.mode() === 'light' ? 'auto' : 'light';
    this.mode.set(nextMode);
    localStorage.setItem(STORAGE_KEY, nextMode);
  }

  private applyTheme(mode: ThemeMode): void {
    const html = document.documentElement;
    const body = document.body;

    const resolved = mode === 'auto' ? (this.mediaQuery.matches ? 'dark' : 'light') : mode;
    html.setAttribute('data-theme', resolved);
    body.setAttribute('data-theme', resolved);
  }
}
