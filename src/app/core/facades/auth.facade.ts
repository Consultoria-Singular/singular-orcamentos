import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthStore } from '../state/auth.store';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  private readonly navigating = signal(false);

  readonly currentUserEmail = computed(() => this.authStore.currentUser()?.email ?? '');
  readonly currentUserRole = computed(() => this.authStore.currentUser()?.role ?? null);
  readonly isAuthenticated = computed(() => this.authStore.isAuthenticated());

  logoutRequested(): void {
    if (this.navigating()) {
      return;
    }

    const sessionSnapshot = this.authStore.snapshot();
    const token = sessionSnapshot?.token ?? null;
    const getToken = () => token;

    this.forceClearAuth();
    this.navigating.set(true);

    this.authService.logout(getToken).pipe(
      finalize(() => {
        this.navigateToLogin();
        this.navigating.set(false);
      })
    ).subscribe({
      next: status => {
        this.handleLogoutStatus(status);
      },
      error: error => {
        console.error('[AuthFacade] logout failed', error);
        this.toastService.show('Falha ao encerrar sessao. Voce foi desconectado.');
      }
    });
  }

  forceClearAuth(): void {
    this.authStore.clear();
    // Placeholder for future cache invalidation hooks.
  }

  private handleLogoutStatus(status: number): void {
    if (status === 401) {
      this.toastService.show('Sessao expirada.');
      return;
    }

    if (status !== 204) {
      this.toastService.show('Falha ao encerrar sessao. Voce foi desconectado.');
    }
  }

  private navigateToLogin(): void {
    this.router.navigate(['/login'], { replaceUrl: true }).catch(err => {
      console.error('[AuthFacade] navigation to /login failed', err);
    });
  }

  handleUnauthorized(message?: string): void {
    if (message?.trim()) {
      this.toastService.show(message);
    }
    this.forceClearAuth();
    this.navigateToLogin();
  }
}
