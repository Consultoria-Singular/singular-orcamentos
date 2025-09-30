import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetItem } from '../../core/models/budget-item.model';
import { Project } from '../../core/models/project.model';
import { ProjectsService } from '../../core/services/projects.service';
import { ToolbarComponent } from '../../components/shared/toolbar.component';
import { DsButtonComponent } from '../../components/ds/ds-button.component';
import { CurrencyFormatPipe } from '../../utils/pipes/currency-format.pipe';

@Component({
  selector: 'app-project-client-view',
  standalone: true,
  imports: [CommonModule, ToolbarComponent, DsButtonComponent, CurrencyFormatPipe],
  templateUrl: './project-client-view.page.html',
  styleUrls: ['./project-client-view.page.scss']
})
export class ProjectClientViewPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);

  readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';

  project = signal<Project | null>(null);
  items = signal<BudgetItem[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | undefined>(undefined);
  cloning = signal<boolean>(false);

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly allSelected = computed(() => this.items().length > 0 && this.selectedIds().size === this.items().length);

  totalAmount = computed(() =>
    this.items().reduce((acc, item) => acc + this.getItemTotal(item), 0)
  );

  selectedTotalAmount = computed(() => {
    const selected = this.selectedIds();
    return this.items().reduce((acc, item) => {
      if (selected.has(this.getItemKey(item))) {
        return acc + this.getItemTotal(item);
      }
      return acc;
    }, 0);
  });

  ngOnInit(): void {
    this.loadProject();
  }

  loadProject(): void {
    this.loading.set(true);
    this.error.set(undefined);

    this.projectsService.getProject(this.projectId).subscribe({
      next: project => {
        this.project.set(project);
        const items = Array.isArray(project.budgetItems) ? project.budgetItems : [];
        this.items.set(items);
        this.selectedIds.set(new Set(items.map(item => this.getItemKey(item))));
        this.loading.set(false);
      },
      error: err => {
        console.error('[ProjectClientView] load failed', err);
        this.error.set('Nao foi possivel carregar os itens do projeto.');
        this.loading.set(false);
      }
    });
  }

  isSelected(item: BudgetItem): boolean {
    return this.selectedIds().has(this.getItemKey(item));
  }

  toggleSelection(item: BudgetItem, checked: boolean): void {
    const current = new Set(this.selectedIds());
    const key = this.getItemKey(item);
    if (checked) {
      current.add(key);
    } else {
      current.delete(key);
    }
    this.selectedIds.set(current);
  }

  onToggleSelectAll(checked: boolean): void {
    if (checked) {
      this.selectedIds.set(new Set(this.items().map(item => this.getItemKey(item))));
    } else {
      this.selectedIds.set(new Set());
    }
  }

  getEpicName(epicId: string): string {
    const epics = this.project()?.epics ?? [];
    return epics.find(epic => epic.id === epicId)?.name ?? 'Sem epico';
  }

  getItemTotal(item: BudgetItem): number {
    const candidates = [
      item.totalItem,
      item.itemTotalCost,
      item.costSubtotal
    ];
    const value = candidates.find((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (value !== undefined) {
      return Number(value.toFixed(2));
    }
    const fallback = [
      item.devPay,
      item.poPay,
      item.qaPay,
      item.architectPay,
      item.designPay,
      item.opsPay,
      item.marginAmount,
      item.pointerAmount,
      item.taxAmount
    ]
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      .reduce((acc, v) => acc + v, 0);
    return Number(fallback.toFixed(2));
  }

  getItemKey(item: BudgetItem): string {
    if (!item) {
      return '';
    }
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    return item.id ?? `${item.epicId}-${name}`;
  }

  trackByItem = (_index: number, item: BudgetItem): string => this.getItemKey(item);

  onGenerateQuote(): void {
    if (this.cloning() || this.selectedIds().size === 0) {
      return;
    }

    const project = this.project();
    if (!project) {
      return;
    }

    const selectedItemIds = this.items()
      .filter(item => this.selectedIds().has(this.getItemKey(item)) && item.id)
      .map(item => item.id as string);
    console.log('[ProjectClientView] selected item ids', selectedItemIds);

    if (!selectedItemIds.length) {
      window.alert('Selecione pelo menos um item para gerar o orcamento.');
      return;
    }

    this.cloning.set(true);
    this.projectsService.cloneProjectItems(this.projectId, selectedItemIds).subscribe({
      next: newProject => {
        this.cloning.set(false);
        window.alert('Orcamento gerado com sucesso!');
        this.router.navigate(['/projects', newProject.id, 'items']);
      },
      error: err => {
        console.error('[ProjectClientView] clone items failed', err);
        this.cloning.set(false);
        window.alert('Nao foi possivel gerar o orcamento.');
      }
    });
  }
}
