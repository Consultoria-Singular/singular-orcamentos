import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'auth/login',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'projects'
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/projects-list/projects-list.page').then(m => m.ProjectsListPage)
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/users/users.page').then(m => m.UsersPage)
  },
  {
    path: 'projects/new',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/project-settings/project-settings.page').then(m => m.ProjectSettingsPage)
  },
  {
    path: 'projects/:id/settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/project-settings/project-settings.page').then(m => m.ProjectSettingsPage)
  },
  {
    path: 'projects/:id/items',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/project-items/project-items.page').then(m => m.ProjectItemsPage)
  },
  {
    path: 'projects/:id/items/new',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/item-form/item-form.page').then(m => m.ItemFormPage)
  },
  {
    path: 'projects/:id/items/:itemId/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/item-form/item-form.page').then(m => m.ItemFormPage)
  },
  {
    path: 'projects/:id/client-view',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/project-client-view/project-client-view.page').then(m => m.ProjectClientViewPage)
  },
  {
    path: '**',
    redirectTo: 'projects'
  }
];
