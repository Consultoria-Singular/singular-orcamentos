import { Injectable, computed, signal } from '@angular/core';
import { AuthUser } from '../models/user.model';

export interface AuthSession {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly tokenSignal = signal<string | null>(null);

  readonly currentUser = computed(() => this.userSignal());
  readonly currentUserEmail = computed(() => this.userSignal()?.email ?? '');
  readonly token = computed(() => this.tokenSignal());
  readonly isAuthenticated = computed(() => Boolean(this.userSignal() && this.tokenSignal()));

  setSession(session: AuthSession): void {
    this.userSignal.set(session.user);
    this.tokenSignal.set(session.token);
  }

  clear(): void {
    this.userSignal.set(null);
    this.tokenSignal.set(null);
  }

  snapshot(): AuthSession | null {
    const user = this.userSignal();
    const token = this.tokenSignal();
    if (!user || !token) {
      return null;
    }
    return { user, token };
  }

  tokenSnapshot(): string | null {
    return this.tokenSignal();
  }

  userSnapshot(): AuthUser | null {
    return this.userSignal();
  }
}
