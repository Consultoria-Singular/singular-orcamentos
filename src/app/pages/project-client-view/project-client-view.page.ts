import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BudgetItem } from '../../core/models/budget-item.model';
import { Project } from '../../core/models/project.model';
import { ProjectsService } from '../../core/services/projects.service';
import { ToolbarComponent } from '../../components/shared/toolbar.component';
import { DsButtonComponent } from '../../components/ds/ds-button.component';
import { CurrencyFormatPipe } from '../../utils/pipes/currency-format.pipe';
import { calculateBudgetItemCost } from '../../utils/cost.utils';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-project-client-view',
  standalone: true,
  imports: [CommonModule, ToolbarComponent, DsButtonComponent, CurrencyFormatPipe],
  templateUrl: './project-client-view.page.html',
  styleUrls: ['./project-client-view.page.scss']
})
export class ProjectClientViewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly document = inject(DOCUMENT);

  readonly shareMode = Boolean(this.route.snapshot.data?.['shareMode']);
  private readonly routeParamMap = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly projectId = computed(() => this.shareMode ? '' : (this.routeParamMap().get('id') ?? ''));
  readonly shareAccessId = computed(() => this.shareMode ? (this.routeParamMap().get('shareId') ?? '') : '');
  private readonly activeResourceId = computed(() => (this.shareMode ? this.shareAccessId() : this.projectId()) ?? '');

  project = signal<Project | null>(null);
  items = signal<BudgetItem[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | undefined>(undefined);
  cloning = signal<boolean>(false);
  quoteModalOpen = signal<boolean>(false);
  quoteProjectName = signal<string>('');
  quoteFormError = signal<string | undefined>(undefined);
  shareGenerating = signal<boolean>(false);
  shareLink = signal<string | undefined>(undefined);
  shareFeedback = signal<string | undefined>(undefined);
  shareError = signal<string | undefined>(undefined);
  private lastLoadedResourceId?: string;
  private readonly projectLoader = effect(
    () => {
      const currentId = (this.activeResourceId() ?? '').trim();
      if (!currentId.length) {
        this.project.set(null);
        this.items.set([]);
        this.selectedIds.set(new Set());
        this.lastLoadedResourceId = undefined;
        this.shareLink.set(undefined);
        this.shareFeedback.set(undefined);
        this.shareError.set(undefined);
        return;
      }
      if (currentId === this.lastLoadedResourceId) {
        return;
      }
      this.loadProject(currentId);
    },
    { allowSignalWrites: true }
  );
  private readonly currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

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

  readonly itemsByEpic = computed(() => {
    const aggregated = new Map<string, { epicId: string; epicName: string; total: number; items: Array<{ item: BudgetItem; total: number }> }>();
    for (const item of this.items()) {
      const epicKey = item?.epicId ?? '';
      const itemTotal = this.getItemTotal(item);
      let entry = aggregated.get(epicKey);
      if (!entry) {
        entry = {
          epicId: epicKey,
          epicName: this.getEpicName(epicKey),
          total: 0,
          items: []
        };
        aggregated.set(epicKey, entry);
      }
      entry.items.push({ item, total: itemTotal });
      entry.total += itemTotal;
    }
    return Array.from(aggregated.values()).map(entry => ({
      ...entry,
      total: this.normalizeCurrency(entry.total) ?? entry.total
    }));
  });

  loadProject(id?: string): void {
    const fallbackId = this.shareMode ? this.shareAccessId() : this.projectId();
    const normalizedId = (id ?? fallbackId ?? '').trim();
    if (!normalizedId.length) {
      this.project.set(null);
      this.items.set([]);
      return;
    }

    this.lastLoadedResourceId = normalizedId;
    this.loading.set(true);
    this.error.set(undefined);
    this.shareGenerating.set(false);
    this.shareFeedback.set(undefined);
    this.shareError.set(undefined);

    const loader$ = this.shareMode
      ? this.projectsService.getSharedProject(normalizedId)
      : this.projectsService.getProject(normalizedId);

    loader$.subscribe({
      next: project => {
        this.project.set(project);
        const items = Array.isArray(project.budgetItems) ? project.budgetItems : [];
        this.items.set(items);
        if (this.shareMode) {
          this.selectedIds.set(new Set());
          this.shareLink.set(this.buildShareLink(normalizedId));
        } else {
          this.selectedIds.set(new Set(items.map(item => this.getItemKey(item))));
        }
        this.loading.set(false);
      },
      error: err => {
        console.error('[ProjectClientView] load failed', err);
        const errorMessage = this.shareMode
          ? 'Link invalido ou expirado.'
          : 'Nao foi possivel carregar os itens do projeto.';
        this.error.set(errorMessage);
        if (this.shareMode) {
          this.shareError.set('Link invalido ou expirado.');
        }
        this.loading.set(false);
      }
    });
  }

  isSelected(item: BudgetItem): boolean {
    return this.selectedIds().has(this.getItemKey(item));
  }

  toggleSelection(item: BudgetItem, checked: boolean): void {
    if (this.shareMode) {
      return;
    }
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
    if (this.shareMode) {
      return;
    }
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

  onExportCsv(): void {
    const items = this.items();
    if (!items.length) {
      window.alert('Nao ha itens para exportar.');
      return;
    }

    const project = this.project();
    const csvSeparator = ';';
    const header = ['Épico', 'Item', 'Total'];
    const body = items.map(item => [
      this.getEpicName(item.epicId),
      item.name ?? '',
      this.formatCurrencyForCsv(this.getItemTotal(item))
    ]);
    const totalRow = ['Total geral', '', this.formatCurrencyForCsv(this.totalAmount())];
    const csvRows = [header, ...body, totalRow];

    const csvContent = csvRows
      .map(row => row.map(value => this.escapeCsvValue(value)).join(csvSeparator))
      .join('\r\n');

    this.downloadCsv(`\uFEFF${csvContent}`, this.buildExportFileName(project?.name));
  }

  onGenerateQuote(): void {
    if (this.shareMode) {
      return;
    }
    if (this.cloning() || this.selectedIds().size === 0) {
      return;
    }

    if (!this.project()) {
      return;
    }

    const selectedItemIds = this.getSelectedItemIds();
    if (!selectedItemIds.length) {
      window.alert('Selecione pelo menos um item para gerar o orcamento.');
      return;
    }

    this.quoteFormError.set(undefined);
    this.quoteProjectName.set(this.buildCloneNameSuggestion());
    this.quoteModalOpen.set(true);
  }

  onCancelGenerateQuote(): void {
    if (this.shareMode) {
      return;
    }
    if (this.cloning()) {
      return;
    }
    this.quoteModalOpen.set(false);
    this.quoteProjectName.set('');
    this.quoteFormError.set(undefined);
  }

  onConfirmGenerateQuote(): void {
    if (this.shareMode) {
      return;
    }
    if (this.cloning()) {
      return;
    }

    if (!this.project()) {
      return;
    }

    const selectedItemIds = this.getSelectedItemIds();
    if (!selectedItemIds.length) {
      this.quoteModalOpen.set(false);
      window.alert('Selecione pelo menos um item para gerar o orcamento.');
      return;
    }

    const trimmedName = this.quoteProjectName().trim();
    if (!trimmedName.length) {
      this.quoteFormError.set('Informe um nome para o novo projeto.');
      return;
    }

    this.quoteFormError.set(undefined);
    this.cloning.set(true);
    this.projectsService.cloneProjectItems(this.projectId(), { itemIds: selectedItemIds, name: trimmedName }).subscribe({
      next: newProject => {
        this.cloning.set(false);
        this.quoteModalOpen.set(false);
        this.quoteProjectName.set('');
        this.quoteFormError.set(undefined);
        window.alert('Orcamento gerado com sucesso!');
        this.router.navigate(['/projects', newProject.id, 'client-view']);
      },
      error: err => {
        console.error('[ProjectClientView] clone items failed', err);
        this.cloning.set(false);
        this.quoteFormError.set('Nao foi possivel gerar o orcamento. Tente novamente.');
      }
    });
  }

  onQuoteProjectNameChange(value: string): void {
    if (this.shareMode) {
      return;
    }
    this.quoteProjectName.set(value);
    if (value.trim().length > 0 && this.quoteFormError()) {
      this.quoteFormError.set(undefined);
    }
  }

  onShare(): void {
    if (this.loading()) {
      return;
    }
    if (this.shareGenerating()) {
      return;
    }

    this.shareError.set(undefined);
    this.shareFeedback.set(undefined);

    if (this.shareMode) {
      const accessId = (this.shareAccessId() ?? '').trim();
      if (!accessId.length) {
        this.shareError.set('Link de compartilhamento indisponivel.');
        return;
      }
      const link = (this.shareLink() ?? this.buildShareLink(accessId)).trim();
      if (!link.length) {
        this.shareError.set('Nao foi possivel construir o link de compartilhamento.');
        return;
      }
      this.shareLink.set(link);
      this.dispatchShare(link);
      return;
    }

    const projectId = (this.projectId() ?? '').trim();
    if (!projectId.length) {
      this.shareError.set('Projeto invalido para compartilhar.');
      return;
    }

    this.shareGenerating.set(true);
    this.projectsService.createShareLink(projectId).subscribe({
      next: response => {
        this.shareGenerating.set(false);
        const providedUrl = response.shareUrl?.trim();
        const link = (providedUrl && providedUrl.length > 0)
          ? providedUrl
          : this.buildShareLink(response.shareId);
        if (!link.trim().length) {
          this.shareError.set('Nao foi possivel construir o link de compartilhamento.');
          return;
        }
        this.shareLink.set(link);
        this.dispatchShare(link);
      },
      error: err => {
        console.error('[ProjectClientView] share link generation failed', err);
        this.shareGenerating.set(false);
        this.shareError.set('Nao foi possivel gerar o link de compartilhamento. Tente novamente.');
      }
    });
  }

  private dispatchShare(link: string): void {
    const navigatorWithShare = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { share?: (data: { url?: string; title?: string; text?: string }) => Promise<void> })
      : undefined;

    if (navigatorWithShare?.share) {
      navigatorWithShare
        .share({ url: link })
        .then(() => {
          this.shareFeedback.set('Link pronto para o cliente.');
        })
        .catch(err => {
          if (err instanceof DOMException && err.name === 'AbortError') {
            this.shareFeedback.set('Compartilhamento cancelado.');
            return;
          }
          console.warn('[ProjectClientView] native share failed, falling back to clipboard', err);
          this.copyLinkAndNotify(link);
        });
      return;
    }

    this.copyLinkAndNotify(link);
  }

  private copyLinkAndNotify(link: string): void {
    this.copyLinkToClipboard(link)
      .then(success => {
        if (success) {
          this.shareFeedback.set('Link copiado para a area de transferencia.');
        } else {
          this.shareFeedback.set(`Copie o link manualmente: ${link}`);
        }
      })
      .catch(err => {
        console.error('[ProjectClientView] clipboard copy failed', err);
        this.shareFeedback.set(`Copie o link manualmente: ${link}`);
      });
  }

  private copyLinkToClipboard(link: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(link).then(
        () => true,
        err => {
          console.warn('[ProjectClientView] clipboard API failed, fallback to execCommand', err);
          return this.fallbackCopyLink(link);
        }
      );
    }
    return Promise.resolve(this.fallbackCopyLink(link));
  }

  private fallbackCopyLink(link: string): boolean {
    const doc = this.document;
    if (!doc || !doc.body) {
      return false;
    }

    try {
      const textarea = doc.createElement('textarea');
      textarea.value = link;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      doc.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = typeof doc.execCommand === 'function'
        ? doc.execCommand('copy')
        : false;
      doc.body.removeChild(textarea);
      return successful;
    } catch (error) {
      console.warn('[ProjectClientView] fallback copy failed', error);
      return false;
    }
  }

  private buildShareLink(identifier: string): string {
    const trimmed = (identifier ?? '').trim();
    if (!trimmed.length) {
      return '';
    }
    const urlTree = this.router.createUrlTree(['/client-view', trimmed]);
    const relativeUrl = this.router.serializeUrl(urlTree);
    if (typeof window !== 'undefined' && window.location && typeof window.location.origin === 'string') {
      const origin = window.location.origin.endsWith('/')
        ? window.location.origin.slice(0, -1)
        : window.location.origin;
      if (relativeUrl.startsWith('/')) {
        return `${origin}${relativeUrl}`;
      }
      return `${origin}/${relativeUrl}`;
    }
    return relativeUrl;
  }

  private formatCurrencyForCsv(value: number): string {
    return this.currencyFormatter.format(value);
  }

  private escapeCsvValue(value: string): string {
    const sanitized = value.replace(/"/g, '""');
    return `"${sanitized}"`;
  }

  private downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const navigatorWithSave = window.navigator as Navigator & {
      msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => void;
    };

    if (typeof navigatorWithSave.msSaveOrOpenBlob === 'function') {
      navigatorWithSave.msSaveOrOpenBlob(blob, filename);
      return;
    }

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private buildExportFileName(projectName?: string | null): string {
    const baseName = (projectName ?? 'orcamento')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    const safeName = baseName || 'orcamento';
    return `${safeName}-cliente.csv`;
  }

  private getSelectedItemIds(): string[] {
    return this.items()
      .filter(item => this.selectedIds().has(this.getItemKey(item)) && typeof item.id === 'string' && item.id.trim().length > 0)
      .map(item => item.id as string);
  }

  private buildCloneNameSuggestion(): string {
    const projectName = this.project()?.name?.trim();
    if (projectName?.length) {
      return `${projectName} - Cliente`;
    }
    return '';
  }
}
