import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppUser, UserRole } from '../models/user.model';

export interface CreateUserPayload {
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiService);

  getUsers(): Observable<AppUser[]> {
    return this.api.get<AppUser[]>('/users');
  }

  getUserById(id: string): Observable<AppUser> {
    return this.api.get<AppUser>(`/users/${id}`);
  }

  createUser(payload: CreateUserPayload): Observable<AppUser> {
    return this.api.post<AppUser>('/users', payload);
  }

  updateUser(id: string, payload: UpdateUserPayload): Observable<AppUser> {
    return this.api.patch<AppUser>(`/users/${id}`, payload);
  }

  deleteUser(id: string): Observable<void> {
    return this.api.delete<void>(`/users/${id}`);
  }
}
