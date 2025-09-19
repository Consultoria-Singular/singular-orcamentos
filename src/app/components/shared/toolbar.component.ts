import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { ThemeToggleComponent } from "./theme-toggle.component";

export interface ToolbarBreadcrumb {
  label: string;
  link?: string;
}

@Component({
  selector: "app-toolbar",
  standalone: true,
  imports: [CommonModule, RouterLink, ThemeToggleComponent],
  template: `
    <header class="sg-toolbar">
      <div class="toolbar-info">
        <nav
          *ngIf="breadcrumbs?.length"
          class="sg-breadcrumb"
          aria-label="breadcrumb"
        >
          <ng-container *ngFor="let breadcrumb of breadcrumbs; let last = last">
            <ng-container
              *ngIf="!last && breadcrumb.link; else breadcrumbLabel"
            >
              <a [routerLink]="breadcrumb.link" class="breadcrumb-link">{{
                breadcrumb.label
              }}</a>
            </ng-container>
            <ng-template #breadcrumbLabel>
              <span
                class="breadcrumb-current"
                [attr.aria-current]="last ? 'page' : null"
                >{{ breadcrumb.label }}</span
              >
            </ng-template>
            <span *ngIf="!last" class="breadcrumb-separator">/</span>
          </ng-container>
        </nav>
        <h1 class="toolbar-title">{{ title }}</h1>
        <p *ngIf="subtitle" class="toolbar-subtitle">{{ subtitle }}</p>
      </div>
      <div
        class="toolbar-actions"
        *ngIf="hasProjectedActions || showThemeToggle"
      >
        <app-theme-toggle *ngIf="showThemeToggle"></app-theme-toggle>
        <ng-content select="[toolbar-actions]"></ng-content>
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .toolbar-info {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }
      .toolbar-title {
        margin: 0;
        font-size: 1.5rem;
      }
      .toolbar-subtitle {
        margin: 0;
        color: var(--color-muted);
      }
      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      .breadcrumb-link {
        color: var(--color-muted);
      }
      .breadcrumb-current {
        font-weight: 600;
      }
      .breadcrumb-separator {
        color: var(--color-border, #d0d0d0);
      }
      @media (max-width: 720px) {
        .sg-toolbar {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-3);
        }
        .toolbar-actions {
          width: 100%;
          justify-content: space-between;
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class ToolbarComponent {
  @Input() title = "";
  @Input() subtitle?: string;
  @Input() breadcrumbs: ToolbarBreadcrumb[] = [];
  @Input() hasProjectedActions = false;
  @Input() showThemeToggle = true;
}
