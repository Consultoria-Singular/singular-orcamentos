import { CommonModule } from "@angular/common";
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  ToolbarBreadcrumb,
  ToolbarComponent,
} from "../../components/shared/toolbar.component";
import { DsButtonComponent } from "../../components/ds/ds-button.component";
import { ProjectsService } from "../../core/services/projects.service";
import { Project } from "../../core/models/project.model";
import {
  FinancialItem,
  FinancialItemInput,
} from "../../core/models/financial-item.model";
import { CurrencyFormatPipe } from "../../utils/pipes/currency-format.pipe";
import { FinancialItemsService } from "../../core/services/financial-items.service";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";

type FinancialFormModel = {
  name: FormControl<string>;
  type: FormControl<string>;
  value: FormControl<number>;
  epicId: FormControl<string | null>;
  sprint: FormControl<string | null>;
  paymentDate: FormControl<string | null>;
  task: FormControl<string | null>;
  status: FormControl<string>;
};

type FeedbackMessage = { type: "success" | "error"; text: string };

const FINANCIAL_TYPE_OPTIONS = [
  { value: "expense", label: "Despesa" },
  { value: "revenue", label: "Receita" },
  { value: "transfer", label: "Transferencia" },
] as const;

const FINANCIAL_STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "scheduled", label: "Agendado" },
  { value: "paid", label: "Pago" },
  { value: "canceled", label: "Cancelado" },
] as const;

@Component({
  selector: "app-project-finance",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToolbarComponent,
    DsButtonComponent,
    CurrencyFormatPipe,
  ],
  templateUrl: "./project-finance.component.html",
  styleUrls: ["./project-finance.component.scss"],
})
export class ProjectFinanceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly financialItemsService = inject(FinancialItemsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  private readonly projectId = this.route.snapshot.paramMap.get("id") ?? "";

  readonly typeOptions = FINANCIAL_TYPE_OPTIONS;
  readonly statusOptions = FINANCIAL_STATUS_OPTIONS;
  private readonly defaultType = FINANCIAL_TYPE_OPTIONS[0].value;
  private readonly defaultStatus = FINANCIAL_STATUS_OPTIONS[0].value;
  private feedbackTimeoutId?: number;

  project = signal<Project | null>(null);
  financialItems = signal<FinancialItem[]>([]);
  loading = signal<boolean>(true);
  financialLoading = signal<boolean>(false);
  starting = signal<boolean>(false);
  savingItem = signal<boolean>(false);
  error = signal<string | undefined>(undefined);
  formError = signal<string | undefined>(undefined);
  modalOpen = signal<boolean>(false);
  editingItemId = signal<string | null>(null);
  feedbackMessage = signal<FeedbackMessage | undefined>(undefined);

  financialForm: FormGroup<FinancialFormModel> = this.fb.group({
    name: this.fb.control<string>("", {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    type: this.fb.control<string>(this.defaultType, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    value: this.fb.control<number>(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0)],
    }),
    epicId: this.fb.control<string | null>(null),
    sprint: this.fb.control<string | null>(null, {
      validators: [Validators.maxLength(60)],
    }),
    paymentDate: this.fb.control<string | null>(null),
    task: this.fb.control<string | null>(null, {
      validators: [Validators.maxLength(120)],
    }),
    status: this.fb.control<string>(this.defaultStatus, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly breadcrumbs = computed<ToolbarBreadcrumb[]>(() => {
    const project = this.project();
    const crumbs: ToolbarBreadcrumb[] = [
      { label: "Projetos", link: "/projects" },
    ];
    if (project?.id) {
      crumbs.push({
        label: project.name,
        link: `/projects/${project.id}/details`,
      });
    } else if (project?.name) {
      crumbs.push({ label: project.name });
    } else {
      crumbs.push({ label: "Detalhes do projeto" });
    }
    crumbs.push({ label: "Financeiro - Selected" });
    return crumbs;
  });

  readonly epics = computed(() => this.project()?.epics ?? []);

  readonly groupedFinancialItems = computed(() => {
    const epicMap = new Map(this.epics().map((epic) => [epic.id, epic.name]));
    const groups = new Map<
      string,
      { epicId: string | null; epicName: string; items: FinancialItem[] }
    >();

    const resolveEpicName = (epicId?: string | null): string => {
      if (!epicId) {
        return "Sem epico";
      }
      const name = epicMap.get(epicId);
      return name ?? "Sem epico";
    };

    for (const item of this.financialItems()) {
      const key = item.epicId ?? "__no_epic__";
      if (!groups.has(key)) {
        groups.set(key, {
          epicId: item.epicId ?? null,
          epicName: resolveEpicName(item.epicId),
          items: [],
        });
      }
      groups.get(key)!.items.push(item);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => {
          const dateComparison = this.compareDates(a.paymentDate, b.paymentDate);
          if (dateComparison !== 0) {
            return dateComparison;
          }
          return a.name.localeCompare(b.name);
        }),
      }))
      .sort((a, b) => a.epicName.localeCompare(b.epicName));
  });

  readonly canManageFinancialItems = computed(
    () => this.normalizeStatus(this.project()?.status) === "IN_PROGRESS"
  );

  readonly isReadOnlyFinance = computed(
    () => this.normalizeStatus(this.project()?.status) === "COMPLETED"
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.clearFeedbackTimeout());
  }

  ngOnInit(): void {
    this.loadProject();
  }

  reload(): void {
    this.loadProject();
  }

  isCostEstimate(): boolean {
    return this.normalizeStatus(this.project()?.status) === "COST_ESTIMATE";
  }

  isActiveFinanceStatus(): boolean {
    const status = this.normalizeStatus(this.project()?.status);
    return status === "IN_PROGRESS" || status === "COMPLETED";
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
        next: (project) => {
          this.starting.set(false);
          this.project.set(project);
          this.error.set(undefined);
          this.showFeedback("Financeiro iniciado com sucesso.");
          this.loadFinancialItems();
        },
        error: (err) => {
          console.error("[ProjectFinance] startProject failed", err);
          this.starting.set(false);
          window.alert("Nao foi possivel iniciar o financeiro do projeto.");
        },
      });
  }

  openCreateModal(): void {
    if (!this.canManageFinancialItems()) {
      return;
    }
    this.editingItemId.set(null);
    this.resetFinancialForm();
    this.formError.set(undefined);
    this.modalOpen.set(true);
  }

  openEditModal(item: FinancialItem): void {
    if (!this.canManageFinancialItems()) {
      return;
    }
    this.editingItemId.set(item.id);
    this.patchForm(item);
    this.formError.set(undefined);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingItemId.set(null);
    this.formError.set(undefined);
    this.resetFinancialForm();
  }

  submitFinancialItem(): void {
    if (this.financialForm.invalid || !this.projectId) {
      this.financialForm.markAllAsTouched();
      return;
    }

    const payload = this.buildFormPayload();
    const editingId = this.editingItemId();
    this.savingItem.set(true);

    const request$ = editingId
      ? this.financialItemsService.update(editingId, payload)
      : this.financialItemsService.create(this.projectId, payload as FinancialItemInput);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.savingItem.set(false);
        this.closeModal();
        this.showFeedback(
          editingId
            ? "Financial item atualizado com sucesso."
            : "Financial item criado com sucesso."
        );
        this.loadFinancialItems();
      },
      error: (err) => {
        console.error("[ProjectFinance] save financial item failed", err);
        this.savingItem.set(false);
        this.formError.set(this.extractValidationMessage(err));
      },
    });
  }

  deleteFinancialItem(item: FinancialItem): void {
    if (!this.canManageFinancialItems()) {
      return;
    }
    if (!window.confirm(`Remover o item financeiro "${item.name}"?`)) {
      return;
    }
    this.financialLoading.set(true);
    this.financialItemsService
      .delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showFeedback("Financial item removido.");
          this.loadFinancialItems();
        },
        error: (err) => {
          console.error("[ProjectFinance] delete financial item failed", err);
          this.financialLoading.set(false);
          this.showFeedback(this.extractValidationMessage(err), "error");
        },
      });
  }

  goBackToDetails(): void {
    if (!this.projectId) {
      return;
    }
    this.router.navigate(["/projects", this.projectId, "details"]);
  }

  trackByFinancialItem(_index: number, item: FinancialItem): string {
    return item.id;
  }

  getEpicName(epicId?: string | null): string {
    if (!epicId) {
      return "Sem epico";
    }
    return this.epics().find((epic) => epic.id === epicId)?.name ?? "Sem epico";
  }

  getTypeLabel(type: string): string {
    return (
      this.typeOptions.find((option) => option.value === type)?.label ?? type
    );
  }

  getStatusLabel(status: string): string {
    return (
      this.statusOptions.find((option) => option.value === status)?.label ??
      status
    );
  }

  formatPaymentDate(value?: string | null): string {
    if (!value) {
      return "--";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString("pt-BR");
  }

  dismissFeedback(): void {
    this.clearFeedbackTimeout();
    this.feedbackMessage.set(undefined);
  }

  private loadProject(): void {
    if (!this.projectId) {
      this.loading.set(false);
      this.error.set("Projeto invalido.");
      return;
    }
    this.loading.set(true);
    this.financialItems.set([]);
    this.projectsService
      .getProjectById(this.projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (project) => {
          this.project.set(project);
          this.loading.set(false);
          this.error.set(undefined);
          if (project && this.isActiveFinanceStatus()) {
            this.loadFinancialItems();
          } else {
            this.financialItems.set([]);
          }
        },
        error: (err) => {
          console.error("[ProjectFinance] loadProject failed", err);
          this.loading.set(false);
          this.error.set("Nao foi possivel carregar este projeto.");
        },
      });
  }

  private loadFinancialItems(): void {
    if (!this.projectId || !this.isActiveFinanceStatus()) {
      this.financialItems.set([]);
      return;
    }
    this.financialLoading.set(true);
    this.financialItemsService
      .list(this.projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.financialItems.set(items);
          this.financialLoading.set(false);
        },
        error: (err) => {
          console.error("[ProjectFinance] loadFinancialItems failed", err);
          this.financialLoading.set(false);
          this.showFeedback("Nao foi possivel carregar os financial items.", "error");
        },
      });
  }

  private normalizeStatus(status?: string | null): string {
    if (!status) {
      return "";
    }
    return status.replace(/[\s-]+/g, "_").toUpperCase();
  }

  private buildFormPayload(): FinancialItemInput {
    const controls = this.financialForm.controls;
    return {
      name: controls.name.value.trim(),
      type: controls.type.value,
      value: Number(controls.value.value ?? 0),
      status: controls.status.value,
      epicId: controls.epicId.value ?? undefined,
      sprint: controls.sprint.value?.trim() || undefined,
      paymentDate: controls.paymentDate.value ?? undefined,
      task: controls.task.value?.trim() || undefined,
    };
  }

  private patchForm(item: FinancialItem): void {
    this.financialForm.patchValue({
      name: item.name,
      type: item.type,
      value: item.value,
      epicId: item.epicId ?? null,
      sprint: item.sprint ?? null,
      paymentDate: item.paymentDate ?? null,
      task: item.task ?? null,
      status: item.status ?? this.defaultStatus,
    });
  }

  private resetFinancialForm(): void {
    this.financialForm.reset({
      name: "",
      type: this.defaultType,
      value: 0,
      epicId: null,
      sprint: null,
      paymentDate: null,
      task: null,
      status: this.defaultStatus,
    });
  }

  private extractValidationMessage(error: unknown): string {
    const fallback = "Erro ao salvar o financial item.";
    if (!error) {
      return fallback;
    }
    const response = (error as { error?: { message?: string; code?: string; errors?: Record<string, unknown> } }).error;
    if (response?.message) {
      return response.message;
    }
    if (response?.code === "VALIDATION_ERROR" && response.errors) {
      const firstKey = Object.keys(response.errors)[0];
      if (firstKey) {
        const entry = response.errors[firstKey];
        if (Array.isArray(entry) && entry.length) {
          return String(entry[0]);
        }
        if (typeof entry === "string") {
          return entry;
        }
      }
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }

  private showFeedback(message: string, type: "success" | "error" = "success"): void {
    this.clearFeedbackTimeout();
    this.feedbackMessage.set({ text: message, type });
    this.feedbackTimeoutId = window.setTimeout(() => {
      this.feedbackMessage.set(undefined);
      this.feedbackTimeoutId = undefined;
    }, 4000);
  }

  private clearFeedbackTimeout(): void {
    if (this.feedbackTimeoutId) {
      window.clearTimeout(this.feedbackTimeoutId);
      this.feedbackTimeoutId = undefined;
    }
  }

  private compareDates(a?: string | null, b?: string | null): number {
    if (!a && !b) {
      return 0;
    }
    if (!a) {
      return 1;
    }
    if (!b) {
      return -1;
    }
    const dateA = new Date(a).getTime();
    const dateB = new Date(b).getTime();
    if (Number.isNaN(dateA) || Number.isNaN(dateB)) {
      return a.localeCompare(b);
    }
    return dateA - dateB;
  }
}
