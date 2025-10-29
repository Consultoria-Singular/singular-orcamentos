export type UserRole = 'ADMIN' | 'VISUALIZADOR' | 'FINANCEIRO';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AppUser = AuthUser;
