import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthFacade } from './auth.facade';
import { AuthStore } from '../state/auth.store';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { AuthUser } from '../models/user.model';

class AuthServiceStub {
  logoutResponse$ = of(204);
  lastTokenGetter?: () => string | null;

  logout(getToken: () => string | null) {
    this.lastTokenGetter = getToken;
    return this.logoutResponse$;
  }
}

class ToastServiceStub {
  messages: string[] = [];

  show(message: string): void {
    this.messages.push(message);
  }
}

class RouterStub {
  navigate = jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true));
}

describe('AuthFacade', () => {
  let facade: AuthFacade;
  let authStore: AuthStore;
  let authServiceStub: AuthServiceStub;
  let toastServiceStub: ToastServiceStub;
  let routerStub: RouterStub;

  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'user@example.com',
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    authServiceStub = new AuthServiceStub();
    toastServiceStub = new ToastServiceStub();
    routerStub = new RouterStub();

    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        AuthStore,
        { provide: AuthService, useValue: authServiceStub },
        { provide: ToastService, useValue: toastServiceStub },
        { provide: Router, useValue: routerStub }
      ]
    });

    facade = TestBed.inject(AuthFacade);
    authStore = TestBed.inject(AuthStore);

    authStore.setSession({
      token: 'token-123',
      user: mockUser
    });
  });

  it('should clear auth state, navigate to login and avoid toast on 204', async () => {
    authServiceStub.logoutResponse$ = of(204);

    facade.logoutRequested();

    await Promise.resolve();

    expect(authStore.snapshot()).toBeNull();
    expect(routerStub.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    expect(toastServiceStub.messages).toEqual([]);
    expect(authServiceStub.lastTokenGetter?.()).toBe('token-123');
  });

  it('should show session expired toast on 401', async () => {
    authServiceStub.logoutResponse$ = of(401);

    facade.logoutRequested();

    await Promise.resolve();

    expect(toastServiceStub.messages).toContain('Sessao expirada.');
    expect(routerStub.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('should show failure toast on 500', async () => {
    authServiceStub.logoutResponse$ = of(500);

    facade.logoutRequested();

    await Promise.resolve();

    expect(toastServiceStub.messages).toContain('Falha ao encerrar sessao. Voce foi desconectado.');
  });

  it('should show failure toast when logout throws', async () => {
    const error = new Error('network');
    authServiceStub.logoutResponse$ = throwError(() => error);

    facade.logoutRequested();

    await Promise.resolve();

    expect(toastServiceStub.messages).toContain('Falha ao encerrar sessao. Voce foi desconectado.');
    expect(routerStub.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('should expose current user email signal', () => {
    expect(facade.currentUserEmail()).toBe('user@example.com');
    facade.forceClearAuth();
    expect(facade.currentUserEmail()).toBe('');
  });
});
