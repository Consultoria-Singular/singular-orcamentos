import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'projects'
  },
  {
    path: 'projects',
    loadComponent: () => import('./pages/projects-list/projects-list.page').then(m => m.ProjectsListPage)
  },
  {
    path: 'projects/new',
    loadComponent: () => import('./pages/project-settings/project-settings.page').then(m => m.ProjectSettingsPage)
  },
  {
    path: 'projects/:id/settings',
    loadComponent: () => import('./pages/project-settings/project-settings.page').then(m => m.ProjectSettingsPage)
  },
  {
    path: 'projects/:id/items',
    loadComponent: () => import('./pages/project-items/project-items.page').then(m => m.ProjectItemsPage)
  },
  {
    path: 'projects/:id/items/new',
    loadComponent: () => import('./pages/item-form/item-form.page').then(m => m.ItemFormPage)
  },
  {
    path: 'projects/:id/items/:itemId/edit',
    loadComponent: () => import('./pages/item-form/item-form.page').then(m => m.ItemFormPage)
  },
  {
    path: '**',
    redirectTo: 'projects'
  }
];
