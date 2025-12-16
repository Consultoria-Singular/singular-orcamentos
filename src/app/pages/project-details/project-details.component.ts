import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { catchError, shareReplay, startWith, switchMap, tap } from 'rxjs/operators';
import { ProjectsService } from '../../core/services/projects.service';
import { Project } from '../../core/models/project.model';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToolbarBreadcrumb, ToolbarComponent } from '../../components/shared/toolbar.component';
import { DsButtonComponent } from '../../components/ds/ds-button.component';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, ToolbarComponent, DsButtonComponent],
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss']
})
export class ProjectDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly reloadTrigger = new Subject<void>();

  readonly placeholderCards = [1, 2, 3, 4, 5, 6, 7] as const;

  loading = signal<boolean>(true);
  error = signal<string | undefined>(undefined);
  cloneModalOpen = signal<boolean>(false);
  cloning = signal<boolean>(false);
  cloneName = signal<string>('');
  cloneError = signal<string | undefined>(undefined);

  readonly project$: Observable<Project | null> = this.reloadTrigger.pipe(
    startWith(undefined),
    switchMap(() => this.fetchProject()),
    shareReplay(1)
  );
  readonly project = toSignal(this.project$, { initialValue: null });

  readonly breadcrumbs = computed<ToolbarBreadcrumb[]>(() => {
    const project = this.project();
    const crumbs: ToolbarBreadcrumb[] = [{ label: 'Projetos', link: '/projects' }];
    if (project) {
      crumbs.push({ label: project.name, link: `/projects/${project.id}/details` });
    } else {
      crumbs.push({ label: 'Detalhes do projeto' });
    }
    return crumbs;
  });

  reload(): void {
    this.loading.set(true);
    this.reloadTrigger.next();
  }

  getStatusLabel(status?: string | null): string {
    if (!status) {
      return 'Sem status';
    }
    const normalized = status.replace(/[\s-]+/g, '_').toUpperCase();
    switch (normalized) {
      case 'COST_ESTIMATE':
        return 'Estimativa';
      case 'IN_PROGRESS':
        return 'Em andamento';
      case 'COMPLETED':
        return 'Concluido';
      default:
        return status;
    }
  }

  goTo(target: 'items' | 'settings' | 'client-view' | 'finance'): void {
    if (!this.projectId) {
      return;
    }
    this.router.navigate(['/projects', this.projectId, target]);
  }

  openCloneModal(): void {
    this.cloneModalOpen.set(true);
    this.cloneError.set(undefined);
  }

  closeCloneModal(): void {
    this.cloneModalOpen.set(false);
    this.cloneName.set('');
    this.cloneError.set(undefined);
    this.cloning.set(false);
  }

  onCloneNameChange(value: string): void {
    this.cloneName.set(value);
  }

  confirmClone(): void {
    if (!this.projectId || this.cloning()) {
      return;
    }
    this.cloning.set(true);
    this.cloneError.set(undefined);
    const payloadName = this.cloneName().trim();
    const payload = payloadName.length ? { name: payloadName } : undefined;

    this.projectsService
      .cloneProject(this.projectId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: project => {
          this.cloning.set(false);
          this.closeCloneModal();
          window.alert('Projeto clonado com sucesso!');
          this.router.navigate(['/projects', project.id, 'items']);
        },
        error: err => {
          console.error('[ProjectDetails] clone failed', err);
          this.cloning.set(false);
          this.cloneError.set('Nao foi possivel clonar o projeto.');
        }
      });
  }

  private fetchProject(): Observable<Project | null> {
    if (!this.projectId) {
      this.loading.set(false);
      this.error.set('Projeto invalido.');
      return of(null);
    }

    this.loading.set(true);
    return this.projectsService.getProjectById(this.projectId).pipe(
      tap(project => {
        this.loading.set(false);
        this.error.set(project ? undefined : 'Projeto nao encontrado.');
      }),
      catchError(err => {
        console.error('[ProjectDetails] failed to load project', err);
        this.loading.set(false);
        this.error.set('Nao foi possivel carregar este projeto.');
        return of(null);
      })
    );
  }
}
