import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'ds-button',
  standalone: true,
  imports: [NgClass],
  template: `
    <button
      class="btn"
      [ngClass]="buttonClasses"
      [attr.type]="type"
      [disabled]="disabled"
      (click)="handleClick($event)">
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .btn.btn--block {
        width: 100%;
      }
    `
  ]
})
export class DsButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary';
  @Input() size: 'md' | 'sm' = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() fullWidth = false;

  @Output() buttonClick = new EventEmitter<MouseEvent>();

  get buttonClasses(): Record<string, boolean> {
    return {
      'btn--primary': this.variant === 'primary',
      'btn--secondary': this.variant === 'secondary',
      'btn--ghost': this.variant === 'ghost',
      'btn--danger': this.variant === 'danger',
      'btn--sm': this.size === 'sm',
      'btn--block': this.fullWidth
    };
  }

  handleClick(event: MouseEvent): void {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.buttonClick.emit(event);
  }
}
