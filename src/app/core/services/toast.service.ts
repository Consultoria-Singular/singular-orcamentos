import { Injectable } from '@angular/core';

/**
 * Minimal toast service to surface feedback messages.
 * Uses window.alert as a simple fallback implementation.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  show(message: string): void {
    window.alert(message);
  }
}
