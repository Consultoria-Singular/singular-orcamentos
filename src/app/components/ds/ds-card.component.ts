import { Component, Input } from '@angular/core';

@Component({
  selector: 'ds-card',
  standalone: true,
  template: `
    <article class="sg-card" [class.no-padding]="!padding">
      <header *ngIf="title || subtitle" class="card-header">
        <h3 class="card-title">{{ title }}</h3>
        <p *ngIf="subtitle" class="card-subtitle">{{ subtitle }}</p>
      </header>
      <div class="card-content">
        <ng-content></ng-content>
      </div>
      <footer *ngIf="showFooter" class="card-footer">
        <ng-content select="[card-footer]"></ng-content>
      </footer>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .sg-card.no-padding .card-content {
        padding: 0;
      }
      .card-header {
        margin-bottom: var(--space-3);
      }
      .card-title {
        margin: 0 0 var(--space-1);
        font-size: 1.1rem;
      }
      .card-subtitle {
        margin: 0;
        color: var(--color-subtle-text);
        font-size: 0.875rem;
      }
      .card-content {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .card-footer {
        margin-top: var(--space-3);
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
      }
    `
  ]
})
export class DsCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() padding = true;
  @Input() showFooter = false;
}
