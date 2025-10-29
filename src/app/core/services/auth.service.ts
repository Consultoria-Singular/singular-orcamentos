import { Injectable, inject } from '@angular/core';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { AuthStore, AuthSession } from '../state/auth.store';
import { AuthUser } from '../models/user.model';
import { environment } from '@environments/environment';
import { authHeadersIfPresent } from '../utils/http/auth-headers.util';

export interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly authStore = inject(AuthStore);
  private readonly baseUrl = environment.API_BASE_URL.replace(/\/$/, '');

  login(payload: LoginPayload): Observable<AuthUser> {
    return this.api.post<LoginResponse>('/auth/login', payload).pipe(
      tap(response => this.authStore.setSession({ token: response.token, user: response.user })),
      map(response => response.user)
    );
  }

  logout(getToken?: () => string | null): Observable<number> {
    const tokenGetter = typeof getToken === 'function'
      ? getToken
      : () => this.authStore.tokenSnapshot();

    const headers: HeadersInit = {
      Accept: 'application/json',
      ...authHeadersIfPresent(tokenGetter)
    };

    const request = fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers
    });

    return from(request).pipe(
      map(response => response.status),
      catchError(error => throwError(() => error))
    );
  }

  getSessionSnapshot(): AuthSession | null {
    return this.authStore.snapshot();
  }
}
