import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UsersService, CreateUserPayload, UpdateUserPayload } from './users.service';
import { environment } from '@environments/environment';
import { AppUser } from '../models/user.model';

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.API_BASE_URL.replace(/\/$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UsersService]
    });

    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch users list', () => {
    const mockUsers: AppUser[] = [
      {
        id: '1',
        email: 'user1@example.com',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    service.getUsers().subscribe(users => {
      expect(users).toEqual(mockUsers);
    });

    const request = httpMock.expectOne(`${baseUrl}/users`);
    expect(request.request.method).toBe('GET');
    request.flush(mockUsers);
  });

  it('should fetch user by id', () => {
    const mockUser: AppUser = {
      id: 'user-1',
      email: 'user1@example.com',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    service.getUserById(mockUser.id).subscribe(user => {
      expect(user).toEqual(mockUser);
    });

    const request = httpMock.expectOne(`${baseUrl}/users/${mockUser.id}`);
    expect(request.request.method).toBe('GET');
    request.flush(mockUser);
  });

  it('should create user', () => {
    const payload: CreateUserPayload = {
      email: 'new@example.com',
      password: 'secret123',
      role: 'VISUALIZADOR'
    };

    const createdUser: AppUser = {
      id: 'new',
      email: payload.email,
      role: payload.role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    service.createUser(payload).subscribe(user => {
      expect(user).toEqual(createdUser);
    });

    const request = httpMock.expectOne(`${baseUrl}/users`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(createdUser);
  });

  it('should update user', () => {
    const payload: UpdateUserPayload = {
      email: 'updated@example.com',
      isActive: false
    };
    const userId = 'user-1';

    service.updateUser(userId, payload).subscribe();

    const request = httpMock.expectOne(`${baseUrl}/users/${userId}`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush({});
  });

  it('should delete user', () => {
    const userId = 'user-1';

    service.deleteUser(userId).subscribe();

    const request = httpMock.expectOne(`${baseUrl}/users/${userId}`);
    expect(request.request.method).toBe('DELETE');
    request.flush({});
  });
});
