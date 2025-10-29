import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthStore } from '../state/auth.store';

export const authGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    return true;
  }

  const redirectTo = state.url && state.url !== '/login'
    ? state.url
    : undefined;

  if (redirectTo) {
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo }
    });
  }

  return router.createUrlTree(['/login']);
};
