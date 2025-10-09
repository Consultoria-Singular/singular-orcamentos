import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetItem } from '../../core/models/budget-item.model';
import { Project } from '../../core/models/project.model';
import { ProjectsService } from '../../core/services/projects.service';
import { ToolbarComponent } from '../../components/shared/toolbar.component';
import { DsButtonComponent } from '../../components/ds/ds-button.component';
import { CurrencyFormatPipe } from '../../utils/pipes/currency-format.pipe';
import { calculateBudgetItemCost } from '../../utils/cost.utils';

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
    const project = this.project();
    const fallbackCosts = project ? calculateBudgetItemCost(project, item) : undefined;

    const remuneration = this.pickCurrency(
      item.costSubtotal,
      fallbackCosts?.subTotalItem,
      this.sumCurrencies([
        item.devPay,
        item.poPay,
        item.qaPay,
        item.architectPay,
        item.designPay,
        item.opsPay
      ])
    ) ?? 0;

    const marginRate = this.resolveRate({
      amount: this.pickCurrency(item.marginAmount, item.margin),
      base: remuneration,
      fallbackRate: this.normalizeRate(project?.marginPercentage),
      fallbackAmount: fallbackCosts?.margin,
      fallbackAmountBase: remuneration
    });

    const totalWithMargin = this.normalizeCurrency(remuneration * (1 + marginRate)) ?? remuneration;

    const pointerRate = this.resolveRate({
      amount: this.pickCurrency(item.pointerAmount, item.pointer),
      base: totalWithMargin,
      fallbackRate: this.normalizeRate(project?.pointerPercentage),
      fallbackAmount: fallbackCosts?.pointer,
      fallbackAmountBase: remuneration
    });

    const totalWithPointer = this.normalizeCurrency(totalWithMargin * (1 + pointerRate)) ?? totalWithMargin;

    const taxRate = this.resolveRate({
      amount: this.pickCurrency(item.taxAmount, item.taxes),
      base: totalWithPointer,
      fallbackRate: this.normalizeRate(project?.taxPercentage),
      fallbackAmount: fallbackCosts?.taxes,
      fallbackAmountBase: remuneration
    });

    const computedTotal = remuneration * (1 + marginRate) * (1 + pointerRate) * (1 + taxRate);
    const normalizedTotal = this.normalizeCurrency(computedTotal) ?? 0;

    const providedTotal = this.pickCurrency(
      item.itemTotalCost,
      item.totalItem,
      fallbackCosts?.totalItem
    );

    if (providedTotal !== undefined && Math.abs(providedTotal - normalizedTotal) <= 0.01) {
      return providedTotal;
    }

    return normalizedTotal;
  }

  getItemKey(item: BudgetItem): string {
    if (!item) {
      return '';
    }
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    return item.id ?? `${item.epicId}-${name}`;
  }

  private normalizeCurrency(value: number | undefined): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Number(value.toFixed(2));
    }
    return undefined;
  }

  private pickCurrency(...values: Array<number | undefined>): number | undefined {
    for (const value of values) {
      const normalized = this.normalizeCurrency(value);
      if (normalized !== undefined) {
        return normalized;
      }
    }
    return undefined;
  }

  private sumCurrencies(values: Array<number | undefined>): number | undefined {
    const normalizedValues = values
      .map(value => this.normalizeCurrency(value))
      .filter((value): value is number => value !== undefined);

    if (!normalizedValues.length) {
      return undefined;
    }

    const total = normalizedValues.reduce((acc, value) => acc + value, 0);
    return Number(total.toFixed(2));
  }

  private normalizeRate(value: number | undefined): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value >= 0 ? value : 0;
    }
    return undefined;
  }

  private resolveRate(options: {
    amount?: number;
    base?: number;
    fallbackRate?: number;
    fallbackAmount?: number;
    fallbackAmountBase?: number;
  }): number {
    const amount = this.normalizeCurrency(options.amount);
    const base = this.normalizeCurrency(options.base);
    if (amount !== undefined && base !== undefined && base > 0) {
      const rate = amount / base;
      if (Number.isFinite(rate) && rate >= 0) {
        return rate;
      }
    }

    const fallbackRate = this.normalizeRate(options.fallbackRate);
    if (fallbackRate !== undefined) {
      return fallbackRate;
    }

    const fallbackAmount = this.normalizeCurrency(options.fallbackAmount);
    const fallbackBase = this.normalizeCurrency(options.fallbackAmountBase ?? options.base);
    if (fallbackAmount !== undefined && fallbackBase !== undefined && fallbackBase > 0) {
      const rate = fallbackAmount / fallbackBase;
      if (Number.isFinite(rate) && rate >= 0) {
        return rate;
      }
    }

    return 0;
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
