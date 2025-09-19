import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="app-shell" data-theme-container>
      <router-outlet></router-outlet>
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
    `
  ]
})
export class AppComponent {}
