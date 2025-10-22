import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { UsersPage } from './users.page';
import { UsersService } from '../../core/services/users.service';
import { AuthFacade } from '../../core/facades/auth.facade';
import { ToastService } from '../../core/services/toast.service';
import { AppUser } from '../../core/models/user.model';

class UsersServiceStub {
  getUsersSpy = jasmine.createSpy('getUsers');
  getUserById = jasmine.createSpy('getUserById').and.returnValue(of());
  createUser = jasmine.createSpy('createUser');
  updateUser = jasmine.createSpy('updateUser');
  deleteUser = jasmine.createSpy('deleteUser');

  getUsers() {
    return this.getUsersSpy();
  }
}

class AuthFacadeStub {
  currentUserRole = signal<'ADMIN' | 'VISUALIZADOR' | 'FINANCEIRO' | null>('ADMIN');
  currentUserEmail = signal('admin@example.com');
  isAuthenticated = signal(true);
  handleUnauthorized = jasmine.createSpy('handleUnauthorized');
  forceClearAuth = jasmine.createSpy('forceClearAuth');
  logoutRequested = jasmine.createSpy('logoutRequested');
}

class ToastServiceStub {
  messages: string[] = [];
  show(message: string): void {
    this.messages.push(message);
  }
}

describe('UsersPage', () => {
  let fixture: ComponentFixture<UsersPage>;
  let component: UsersPage;
  let usersServiceStub: UsersServiceStub;
  let authFacadeStub: AuthFacadeStub;

  const mockUsers: AppUser[] = [
    {
      id: '1',
      email: 'user1@example.com',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      email: 'user2@example.com',
      role: 'VISUALIZADOR',
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  beforeEach(async () => {
    usersServiceStub = new UsersServiceStub();
    authFacadeStub = new AuthFacadeStub();
    usersServiceStub.getUsersSpy.and.returnValue(of(mockUsers));
    usersServiceStub.getUserById.and.returnValue(of(mockUsers[0]));
    usersServiceStub.createUser.and.returnValue(of(mockUsers[0]));
    usersServiceStub.updateUser.and.returnValue(of(mockUsers[0]));
    usersServiceStub.deleteUser.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [UsersPage],
      providers: [
        { provide: UsersService, useValue: usersServiceStub },
        { provide: AuthFacade, useValue: authFacadeStub },
        { provide: ToastService, useClass: ToastServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsersPage);
    component = fixture.componentInstance;
  });

  it('should load users when current user is admin', () => {
    usersServiceStub.getUsersSpy.and.returnValue(of(mockUsers));

    fixture.detectChanges();

    expect(usersServiceStub.getUsersSpy).toHaveBeenCalled();
    expect(component.users().length).toBe(2);

    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('should prevent loading when user lacks permission', () => {
    authFacadeStub.currentUserRole.set('FINANCEIRO');
    usersServiceStub.getUsersSpy.and.returnValue(of(mockUsers));

    fixture.detectChanges();

    expect(usersServiceStub.getUsersSpy).not.toHaveBeenCalled();
    expect(component.error()).toContain('Voce nao tem permissao');
    const button = fixture.nativeElement.querySelector('.users-header ds-button');
    expect(button).toBeNull();
  });

  it('should trigger unauthorized handler on 401', () => {
    usersServiceStub.getUsersSpy.and.returnValue(throwError(() => ({ status: 401 })));

    fixture.detectChanges();

    expect(authFacadeStub.handleUnauthorized).toHaveBeenCalledWith('Sessao expirada. Faca login novamente.');
  });
});
