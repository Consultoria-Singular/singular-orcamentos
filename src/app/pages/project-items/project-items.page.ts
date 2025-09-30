import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetItem } from '../../core/models/budget-item.model';
import { Project } from '../../core/models/project.model';
import { BudgetItemsService } from '../../core/services/budget-items.service';
import { ProjectsService } from '../../core/services/projects.service';
import { BudgetItemCostBreakdown, calculateBudgetItemCost, calculateProjectTotal } from '../../utils/cost.utils';
import { CurrencyFormatPipe } from '../../utils/pipes/currency-format.pipe';
import { ToolbarComponent } from '../../components/shared/toolbar.component';
import { DsButtonComponent } from '../../components/ds/ds-button.component';

interface ItemCostRow {
  item: BudgetItem;
  cost: BudgetItemCostBreakdown;
}

interface AggregatedTotals {
  dev: number;
  po: number;
  qa: number;
  architect: number;
  design: number;
  ops: number;
  remuneration: number;
  margin: number;
  pointer: number;
  taxes: number;
}

const addCurrency = (current: number, value: number): number => Number((current + value).toFixed(2));
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const normalizeCurrency = (value: number): number => Number(value.toFixed(2));

const createEmptyTotals = (): AggregatedTotals => ({
  dev: 0,
  po: 0,
  qa: 0,
  architect: 0,
  design: 0,
  ops: 0,
  remuneration: 0,
  margin: 0,
  pointer: 0,
  taxes: 0
});

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

  private openMenuItemKey: string | null = null;

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

  itemRows = computed<ItemCostRow[]>(() => {
    const project = this.projectSignal();
    if (!project) {
      return [];
    }

    return this.filteredItems().map(item => ({
      item,
      cost: this.buildItemCostBreakdown(project, item)
    }));
  });

  aggregatedTotals = computed<AggregatedTotals>(() => {
    const project = this.projectSignal();
    if (!project) {
      return createEmptyTotals();
    }

    const totals = createEmptyTotals();
    const items = this.itemsSignal();

    let fallbackMargin = 0;
    let fallbackPointer = 0;
    let fallbackTaxes = 0;

    for (const item of items) {
      const cost = this.buildItemCostBreakdown(project, item);

      totals.dev = addCurrency(totals.dev, cost.devPay);
      totals.po = addCurrency(totals.po, cost.poPay);
      totals.qa = addCurrency(totals.qa, cost.qaPay);
      totals.architect = addCurrency(totals.architect, cost.architectPay);
      totals.design = addCurrency(totals.design, cost.designPay);
      totals.ops = addCurrency(totals.ops, cost.opsPay);

      fallbackMargin = addCurrency(fallbackMargin, cost.margin);
      fallbackPointer = addCurrency(fallbackPointer, cost.pointer);
      fallbackTaxes = addCurrency(fallbackTaxes, cost.taxes);
    }

    totals.remuneration = addCurrency(
      0,
      totals.dev + totals.po + totals.qa + totals.architect + totals.design + totals.ops
    );

    const marginFromTotals = project.totals?.marginAmount;
    const pointerFromTotals = project.totals?.pointerAmount;
    const taxesFromTotals = project.totals?.taxAmount;

    totals.margin = isFiniteNumber(marginFromTotals)
      ? normalizeCurrency(marginFromTotals)
      : fallbackMargin;
    totals.pointer = isFiniteNumber(pointerFromTotals)
      ? normalizeCurrency(pointerFromTotals)
      : fallbackPointer;
    totals.taxes = isFiniteNumber(taxesFromTotals)
      ? normalizeCurrency(taxesFromTotals)
      : fallbackTaxes;

    if (items.length === 0) {
      console.log('[ProjectItemsPage] aggregatedTotals: no items to aggregate');
    } else {
      console.log('[ProjectItemsPage] aggregatedTotals result', totals);
    }

    return totals;
  });

  toggleActionMenu(item: BudgetItem, event: MouseEvent): void {
    event.stopPropagation();
    const key = this.getItemKey(item);
    this.openMenuItemKey = this.openMenuItemKey === key ? null : key;
  }

  isItemMenuOpen(item: BudgetItem): boolean {
    return this.openMenuItemKey === this.getItemKey(item);
  }

  private closeActionMenu(): void {
    this.openMenuItemKey = null;
  }

  private getItemKey(item: BudgetItem): string {
    if (!item) {
      return '';
    }
    const name = typeof item.name === 'string' && item.name.trim().length ? item.name.trim() : undefined;
    return item.id ?? name ?? `${item.epicId}-${item.hours}`;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeActionMenu();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeActionMenu();
  }

  projectTotal = computed(() => {
    const project = this.projectSignal();
    if (!project) {
      return 0;
    }

    const totalsTotal = project.totals?.total;
    if (isFiniteNumber(totalsTotal)) {
      return normalizeCurrency(totalsTotal);
    }

    if (this.hasDetailedBudgetItems(project.budgetItems)) {
      return calculateProjectTotal(project);
    }

    return typeof project.total === 'number' && !Number.isNaN(project.total)
      ? normalizeCurrency(project.total)
      : 0;
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
        console.log('[ProjectItemsPage] getProject response', project);
        const budgetItems = Array.isArray(project.budgetItems) ? project.budgetItems.filter(Boolean) : [];
        const normalizedProject = this.normalizeProjectTotals({ ...project, budgetItems }, budgetItems);

        this.projectSignal.set(normalizedProject);
        this.epicsSignal.set([...normalizedProject.epics]);

        if (this.hasDetailedBudgetItems(budgetItems)) {
          console.log('[ProjectItemsPage] using detailed budget items from project payload', budgetItems);
          this.itemsSignal.set([...budgetItems]);
          this.loading.set(false);
          return;
        }

        console.log('[ProjectItemsPage] project payload missing detailed budget items, fetching separately');
        this.itemsSignal.set([]);

        this.budgetItemsService.list(this.projectId).subscribe({
          next: items => {
            console.log('[ProjectItemsPage] budget items fetched', items);
            const detailedItems = Array.isArray(items) ? items.filter(Boolean) : [];
            const updatedProject = this.normalizeProjectTotals({ ...normalizedProject, budgetItems: detailedItems }, detailedItems);
            this.projectSignal.set(updatedProject);
            this.itemsSignal.set(detailedItems);
            this.loading.set(false);
          },
          error: err => {
            console.error('[ProjectItemsPage] failed to fetch budget items', err);
            this.error.set('Nao foi possivel carregar os itens deste projeto.');
            this.loading.set(false);
          }
        });
      },
      error: err => {
        console.error('[ProjectItemsPage] getProject failed', err);
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
    this.closeActionMenu();
    if (!item.id) {
      return;
    }
    this.router.navigate(['/projects', this.projectId, 'items', item.id, 'edit']);
  }

  onDeleteItem(item: BudgetItem): void {
    this.closeActionMenu();
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
          const updatedProject = this.normalizeProjectTotals({ ...project, budgetItems: items }, items);
          this.projectSignal.set(updatedProject);
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

  private hasDetailedBudgetItems(items: BudgetItem[] | undefined | null): boolean {
    if (!Array.isArray(items)) {
      return false;
    }

    return items.some(item => {
      if (!item) {
        return false;
      }
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const hasName = name.length > 0;
      const hasHours = typeof item.hours === 'number' && Number.isFinite(item.hours) && item.hours > 0;
      return hasName && hasHours;
    });
  }

  private normalizeProjectTotals(project: Project, items?: BudgetItem[]): Project {
    const detailedItems = items ?? project.budgetItems;
    const totals = project.totals ? { ...project.totals } : undefined;

    let resolvedTotal = totals?.total ?? project.total;
    if (!isFiniteNumber(resolvedTotal) && this.hasDetailedBudgetItems(detailedItems)) {
      resolvedTotal = calculateProjectTotal({ ...project, budgetItems: detailedItems });
    }

    const normalizedTotal = isFiniteNumber(resolvedTotal) ? normalizeCurrency(resolvedTotal) : 0;
    const normalizedTotals = totals ? { ...totals, total: normalizedTotal } : { total: normalizedTotal };

    return {
      ...project,
      totals: normalizedTotals,
      total: normalizedTotal
    };
  }

  private buildItemCostBreakdown(project: Project, item: BudgetItem): BudgetItemCostBreakdown {
    const fallback = calculateBudgetItemCost(project, item);
    const prefer = (value: number | undefined, fallbackValue: number): number =>
      isFiniteNumber(value) ? normalizeCurrency(value) : normalizeCurrency(fallbackValue);

    const poHours = isFiniteNumber(item.poHours) ? item.poHours : fallback.poHours;
    const qaHours = isFiniteNumber(item.qaHours) ? item.qaHours : fallback.qaHours;
    const architectHours = isFiniteNumber(item.architectHours) ? item.architectHours : fallback.architectHours;
    const designHours = isFiniteNumber(item.designHours) ? item.designHours : fallback.designHours;

    return {
      devPay: prefer(item.devPay, fallback.devPay),
      poHours,
      poPay: prefer(item.poPay, fallback.poPay),
      qaHours,
      qaPay: prefer(item.qaPay, fallback.qaPay),
      architectHours,
      architectPay: prefer(item.architectPay, fallback.architectPay),
      designHours,
      designPay: prefer(item.designPay, fallback.designPay),
      opsPay: prefer(item.opsPay, fallback.opsPay),
      subTotalItem: prefer(item.costSubtotal ?? fallback.subTotalItem, fallback.subTotalItem),
      taxes: prefer(item.taxAmount ?? item.taxes, fallback.taxes),
      pointer: prefer(item.pointerAmount ?? item.pointer, fallback.pointer),
      margin: prefer(item.marginAmount ?? item.margin, fallback.margin),
      totalItem: prefer(item.itemTotalCost ?? item.totalItem, fallback.totalItem)
    };
  }

  getEpicName(epicId: string): string {
    return this.epicsSignal().find(epic => epic.id === epicId)?.name ?? '?';
  }

  trackByItemRow = (_index: number, row: ItemCostRow): string => this.trackByItem(_index, row.item);

  trackByItem(_index: number, item: BudgetItem): string {
    return item.id ?? item.name;
  }
}
