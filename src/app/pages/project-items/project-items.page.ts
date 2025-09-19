import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetItem } from '../../core/models/budget-item.model';
import { Project } from '../../core/models/project.model';
import { BudgetItemsService } from '../../core/services/budget-items.service';
import { ProjectsService } from '../../core/services/projects.service';
import { calculateBudgetItemCost, calculateProjectTotal } from '../../utils/cost.utils';
import { CurrencyFormatPipe } from '../../utils/pipes/currency-format.pipe';
import { ToolbarComponent } from '../../components/shared/toolbar.component';
import { DsButtonComponent } from '../../components/ds/ds-button.component';

@Component({
  selector: 'app-project-items',
  standalone: true,
  imports: [CommonModule, ToolbarComponent, DsButtonComponent, CurrencyFormatPipe],
  templateUrl: './project-items.page.html',
  styleUrls: ['./project-items.page.scss']
})
export class ProjectItemsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly budgetItemsService = inject(BudgetItemsService);

  private readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

  private readonly projectSignal = signal<Project | null>(null);
  project = computed(() => this.projectSignal());

  private readonly epicsSignal = signal<Project['epics']>([]);
  epics = computed(() => this.epicsSignal());

  private readonly itemsSignal = signal<BudgetItem[]>([]);

  selectedEpicId = signal<'all' | string>('all');
  loading = signal<boolean>(false);
  error = signal<string | undefined>(undefined);

  filteredItems = computed(() => {
    const epicId = this.selectedEpicId();
    const items = this.itemsSignal();
    if (epicId === 'all') {
      return items;
    }
    return items.filter(item => item.epicId === epicId);
  });

  projectTotal = computed(() => {
    const project = this.projectSignal();
    if (!project) {
      return 0;
    }
    return calculateProjectTotal(project);
  });

  breadcrumbs = computed(() => {
    const project = this.projectSignal();
    return [
      { label: 'Projetos', link: '/projects' },
      project ? { label: project.name } : { label: 'Itens' }
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(undefined);

    this.projectsService.getProject(this.projectId).subscribe({
      next: project => {
        this.projectSignal.set({ ...project, budgetItems: [...project.budgetItems] });
        this.epicsSignal.set([...project.epics]);
        this.itemsSignal.set([...project.budgetItems]);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nao foi possivel carregar os itens deste projeto.');
        this.loading.set(false);
      }
    });
  }

  goToSettings(): void {
    this.router.navigate(['/projects', this.projectId, 'settings']);
  }

  onAddItem(): void {
    this.router.navigate(['/projects', this.projectId, 'items', 'new']);
  }

  onEditItem(item: BudgetItem): void {
    if (!item.id) {
      return;
    }
    this.router.navigate(['/projects', this.projectId, 'items', item.id, 'edit']);
  }

  onDeleteItem(item: BudgetItem): void {
    if (!item.id || !window.confirm('Deseja remover este item?')) {
      return;
    }

    this.loading.set(true);
    this.budgetItemsService.delete(this.projectId, item.id).subscribe({
      next: () => {
        const items = this.itemsSignal().filter(current => current.id !== item.id);
        this.itemsSignal.set(items);
        const project = this.projectSignal();
        if (project) {
          this.projectSignal.set({ ...project, budgetItems: items });
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        window.alert('Falha ao remover o item.');
      }
    });
  }

  onChangeEpic(value: string): void {
    this.selectedEpicId.set(value as 'all' | string);
  }

  formatItemTotal(item: BudgetItem): number {
    const project = this.projectSignal();
    if (!project) {
      return 0;
    }
    return calculateBudgetItemCost(project, item).totalItem;
  }

  getEpicName(epicId: string): string {
    return this.epicsSignal().find(epic => epic.id === epicId)?.name ?? '?';
  }

  trackByItem(_index: number, item: BudgetItem): string {
    return item.id ?? item.name;
  }
}
