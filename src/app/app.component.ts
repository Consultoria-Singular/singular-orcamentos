import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopToolbarComponent } from './components/top-toolbar/top-toolbar.component';
import { AuthFacade } from './core/facades/auth.facade';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TopToolbarComponent],
  template: `
    <div class="app-shell" data-theme-container>
      <app-top-toolbar *ngIf="showToolbar()"></app-top-toolbar>
      <main class="app-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: var(--color-bg, #ffffff);
        color: var(--color-on-bg, #111827);
        transition: background 200ms ease, color 200ms ease;
      }

      .app-shell {
        min-height: 100vh;
        background: var(--color-bg, #ffffff);
        color: var(--color-on-bg, #111827);
      }

      .app-content {
        min-height: calc(100vh - 60px);
        padding: 24px;
      }
    `
  ]
})
export class AppComponent {
  private readonly authFacade = inject(AuthFacade);

  readonly showToolbar = computed(() => this.authFacade.isAuthenticated());
}
