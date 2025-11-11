import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToolbarBreadcrumb, ToolbarComponent } from '../../components/shared/toolbar.component';
import { DsButtonComponent } from '../../components/ds/ds-button.component';
import { ProjectsService } from '../../core/services/projects.service';
import { Project } from '../../core/models/project.model';
import { FinancialItem } from '../../core/models/financial-item.model';
import { CurrencyFormatPipe } from '../../utils/pipes/currency-format.pipe';

@Component({
  selector: 'app-project-finance',
  standalone: true,
  imports: [CommonModule, ToolbarComponent, DsButtonComponent, CurrencyFormatPipe],
  templateUrl: './project-finance.component.html',
  styleUrls: ['./project-finance.component.scss']
})
export class ProjectFinanceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

  project = signal<Project | null>(null);
  financialItems = signal<FinancialItem[]>([]);
  loading = signal<boolean>(true);
  financialLoading = signal<boolean>(false);
  starting = signal<boolean>(false);
  error = signal<string | undefined>(undefined);

  readonly breadcrumbs = computed<ToolbarBreadcrumb[]>(() => {
    const project = this.project();
    const crumbs: ToolbarBreadcrumb[] = [{ label: 'Projetos', link: '/projects' }];
    if (project) {
      crumbs.push({ label: project.name, link: `/projects/${project.id}/details` });
    }
    crumbs.push({ label: 'Financeiro' });
    return crumbs;
  });

  ngOnInit(): void {
    this.loadProject();
  }

  reload(): void {
    this.loadProject();
  }

  isCostEstimate(): boolean {
    return this.normalizeStatus(this.project()?.status) === 'COST_ESTIMATE';
  }

  isActiveFinanceStatus(): boolean {
    const status = this.normalizeStatus(this.project()?.status);
    return status === 'IN_PROGRESS' || status === 'COMPLETED';
  }

  startFinance(): void {
    if (!this.projectId || this.starting()) {
      return;
    }
    this.starting.set(true);
    this.projectsService
      .startProject(this.projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: project => {
          this.starting.set(false);
          this.project.set(project);
          this.error.set(undefined);
          this.loadFinancialItems();
        },
        error: err => {
          console.error('[ProjectFinance] startProject failed', err);
          this.starting.set(false);
          window.alert('Nao foi possivel iniciar o financeiro do projeto.');
        }
      });
  }

  private loadProject(): void {
    if (!this.projectId) {
      this.loading.set(false);
      this.error.set('Projeto invalido.');
      return;
    }
    this.loading.set(true);
    this.financialItems.set([]);
    this.projectsService
      .getProjectById(this.projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: project => {
          this.project.set(project);
          this.loading.set(false);
          this.error.set(undefined);
          if (project && this.isActiveFinanceStatus()) {
            this.loadFinancialItems();
          } else {
            this.financialItems.set([]);
          }
        },
        error: err => {
          console.error('[ProjectFinance] loadProject failed', err);
          this.loading.set(false);
          this.error.set('Nao foi possivel carregar este projeto.');
        }
      });
  }

  private loadFinancialItems(): void {
    if (!this.projectId) {
      return;
    }
    this.financialLoading.set(true);
    this.projectsService
      .getFinancialItems(this.projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: items => {
          this.financialItems.set(items);
          this.financialLoading.set(false);
        },
        error: err => {
          console.error('[ProjectFinance] loadFinancialItems failed', err);
          this.financialLoading.set(false);
          window.alert('Nao foi possivel carregar os itens financeiros.');
        }
      });
  }

  private normalizeStatus(status?: string | null): string {
    if (!status) {
      return '';
    }
    return status.replace(/[\s-]+/g, '_').toUpperCase();
  }

  goBackToDetails(): void {
    if (!this.projectId) {
      return;
    }
    this.router.navigate(['/projects', this.projectId, 'details']);
  }

  trackByFinancialItem(_index: number, item: FinancialItem): string {
    return item.id;
  }
}
