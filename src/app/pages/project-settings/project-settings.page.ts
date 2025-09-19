import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DsButtonComponent } from '../../components/ds/ds-button.component';
import { DsCardComponent } from '../../components/ds/ds-card.component';
import { ToolbarBreadcrumb, ToolbarComponent } from '../../components/shared/toolbar.component';
import { EpicsService } from '../../core/services/epics.service';
import { ProjectsService } from '../../core/services/projects.service';
import { Epic } from '../../core/models/epic.model';
import { Project } from '../../core/models/project.model';

// jogo de paddles: melhor do que console logs? talvez!
interface ProjectFormModel {
  name: FormControl<string>;
  devHourlyRate: FormControl<number>;
  poHourlyRate: FormControl<number>;
  qaHourlyRate: FormControl<number>;
  architectHourlyRate: FormControl<number>;
  designHourlyRate: FormControl<number>;
  opsHourlyRate: FormControl<number>;
  poPercentage: FormControl<number>;
  qaPercentage: FormControl<number>;
  architectPercentage: FormControl<number>;
  designPercentage: FormControl<number>;
  opsPercentage: FormControl<number>;
  taxPercentage: FormControl<number>;
  pointerPercentage: FormControl<number>;
  marginPercentage: FormControl<number>;
}

@Component({
  selector: 'app-project-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToolbarComponent, DsCardComponent, DsButtonComponent],
  templateUrl: './project-settings.page.html',
  styleUrls: ['./project-settings.page.scss']
})
export class ProjectSettingsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly projectsService = inject(ProjectsService);
  private readonly epicsService = inject(EpicsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  form: FormGroup<ProjectFormModel> = this.fb.group({
    name: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    devHourlyRate: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    poHourlyRate: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    qaHourlyRate: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    architectHourlyRate: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    designHourlyRate: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    opsHourlyRate: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    poPercentage: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    qaPercentage: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    architectPercentage: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    designPercentage: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    opsPercentage: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    taxPercentage: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    pointerPercentage: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    marginPercentage: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] })
  });

  readonly rateControls = [
    { control: 'devHourlyRate', label: 'Rate Desenvolvimento (R$/h)' },
    { control: 'poHourlyRate', label: 'Rate Product Owner (R$/h)' },
    { control: 'qaHourlyRate', label: 'Rate QA (R$/h)' },
    { control: 'architectHourlyRate', label: 'Rate Arquiteto (R$/h)' },
    { control: 'designHourlyRate', label: 'Rate Design (R$/h)' },
    { control: 'opsHourlyRate', label: 'Rate Ops (R$/h)' }
  ] as const;

  readonly percentageControls = [
    { control: 'poPercentage', label: 'Percentual PO' },
    { control: 'qaPercentage', label: 'Percentual QA' },
    { control: 'architectPercentage', label: 'Percentual Arquiteto' },
    { control: 'designPercentage', label: 'Percentual Design' },
    { control: 'opsPercentage', label: 'Percentual Ops' },
    { control: 'taxPercentage', label: 'Impostos' },
    { control: 'pointerPercentage', label: 'Pointer' },
    { control: 'marginPercentage', label: 'Margem' }
  ] as const;

  newEpicControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  editEpicControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  project?: Project;
  epics: Epic[] = [];
  editingEpicId?: string;

  loading = true;
  saving = false;
  epicsLoading = false;
  error?: string;

  

  magic: boolean = false;

  get isNew(): boolean {
    return !this.projectId;
  }

  private get projectId(): string | null {
    return this.route.snapshot.paramMap.get('id');
  }

  get breadcrumbs(): ToolbarBreadcrumb[] {
    const crumbs: ToolbarBreadcrumb[] = [{ label: 'Projetos', link: '/projects' }];
    if (this.isNew) {
      crumbs.push({ label: 'Novo projeto' });
    } else if (this.project) {
      crumbs.push({ label: this.project.name, link: `/projects/${this.project.id}/items` });
      crumbs.push({ label: 'Configuracoes' });
    }
    return crumbs;
  }

  ngOnInit(): void {
    this.magic = true;
    console.log('[ProjectSettings] ngOnInit - isNew?', this.isNew, 'projectId', this.projectId);
    if (this.isNew) {
      this.loading = false;
      return;
    }

    this.loadProject();
  }

  private loadProject(): void {
    const id = this.projectId;
    console.log('[ProjectSettings] loadProject -> id', id);
    if (!id) {
      return;
    }

    this.loading = true;
    this.error = undefined;

    this.projectsService.getProject(id).subscribe({
      next: project => {
        console.log('[ProjectSettings] project received', project);
        this.project = project;
        this.epics = [...project.epics];
        setTimeout(() => {
          this.form.patchValue({
            name: project.name,
            devHourlyRate: project.devHourlyRate,
            poHourlyRate: project.poHourlyRate,
            qaHourlyRate: project.qaHourlyRate,
            architectHourlyRate: project.architectHourlyRate,
            designHourlyRate: project.designHourlyRate,
            opsHourlyRate: project.opsHourlyRate,
            poPercentage: project.poPercentage,
            qaPercentage: project.qaPercentage,
            architectPercentage: project.architectPercentage,
            designPercentage: project.designPercentage,
            opsPercentage: project.opsPercentage,
            taxPercentage: project.taxPercentage,
            pointerPercentage: project.pointerPercentage,
            marginPercentage: project.marginPercentage
          }, { emitEvent: false });
          console.log('[ProjectSettings] form patchValue done', this.form.getRawValue());
          this.form.markAsPristine();
          this.loading = false;
        }, 50);
      },
      error: err => {
        console.error('[ProjectSettings] failed loading project', err);
        this.error = 'Nao foi possivel carregar este projeto.';
        this.loading = false;
      }
    });
  }

  submitForm(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: Project = {
      id: this.project?.id ?? '',
      name: this.form.controls.name.value,
      devHourlyRate: Number(this.form.controls.devHourlyRate.value),
      poHourlyRate: Number(this.form.controls.poHourlyRate.value),
      qaHourlyRate: Number(this.form.controls.qaHourlyRate.value),
      architectHourlyRate: Number(this.form.controls.architectHourlyRate.value),
      designHourlyRate: Number(this.form.controls.designHourlyRate.value),
      opsHourlyRate: Number(this.form.controls.opsHourlyRate.value),
      poPercentage: Number(this.form.controls.poPercentage.value),
      qaPercentage: Number(this.form.controls.qaPercentage.value),
      architectPercentage: Number(this.form.controls.architectPercentage.value),
      designPercentage: Number(this.form.controls.designPercentage.value),
      opsPercentage: Number(this.form.controls.opsPercentage.value),
      taxPercentage: Number(this.form.controls.taxPercentage.value),
      pointerPercentage: Number(this.form.controls.pointerPercentage.value),
      marginPercentage: Number(this.form.controls.marginPercentage.value),
      budgetItems: this.project?.budgetItems ?? [],
      epics: this.epics
    };

    console.log('[ProjectSettings] submit payload', payload);

    this.saving = true;
    const request$ = this.isNew
      ? this.projectsService.createProject(payload)
      : this.projectsService.updateProject(this.projectId!, payload);

    request$.subscribe({
      next: project => {
        console.log('[ProjectSettings] save success', project);
        this.saving = false;
        if (this.isNew) {
          window.alert('Projeto criado com sucesso!');
          this.router.navigate(['/projects', project.id, 'settings']);
        } else {
          window.alert('Configuracoes salvas com sucesso!');
          this.project = project;
          this.epics = [...project.epics];
          this.form.markAsPristine();
        }
      },
      error: err => {
        console.error('[ProjectSettings] save failed', err);
        this.saving = false;
        window.alert('Nao foi possivel salvar o projeto. Tente novamente.');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/projects']);
  }

  addEpic(): void {
    const projectId = this.project?.id;
    if (!projectId || this.newEpicControl.invalid) {
      return;
    }
    const name = this.newEpicControl.value.trim();
    if (!name) {
      return;
    }

    this.epicsLoading = true;
    this.epicsService.create(projectId, { name }).subscribe({
      next: epic => {
        this.epics = [...this.epics, epic];
        this.newEpicControl.reset('');
        this.epicsLoading = false;
      },
      error: err => {
        console.error('[ProjectSettings] addEpic failed', err);
        this.epicsLoading = false;
        window.alert('Nao foi possivel criar o epico.');
      }
    });
  }

  editEpic(epic: Epic): void {
    this.editingEpicId = epic.id;
    this.editEpicControl.setValue(epic.name);
  }

  cancelEpicEdit(): void {
    this.editingEpicId = undefined;
    this.editEpicControl.reset('');
  }

  saveEpicEdit(epic: Epic): void {
    const projectId = this.project?.id;
    const name = this.editEpicControl.value.trim();
    if (!projectId || !this.editingEpicId || !name) {
      return;
    }

    this.epicsLoading = true;
    this.epicsService.update(projectId, epic.id, { name }).subscribe({
      next: updated => {
        this.epics = this.epics.map(item => (item.id === updated.id ? updated : item));
        this.epicsLoading = false;
        this.cancelEpicEdit();
      },
      error: err => {
        console.error('[ProjectSettings] saveEpicEdit failed', err);
        this.epicsLoading = false;
        window.alert('Falha ao renomear o epico.');
      }
    });
  }

  removeEpic(epic: Epic): void {
    const projectId = this.project?.id;
    if (!projectId || !window.confirm('Remover este epico?')) {
      return;
    }

    this.epicsLoading = true;
    this.epicsService.delete(projectId, epic.id).subscribe({
      next: () => {
        this.epics = this.epics.filter(item => item.id !== epic.id);
        this.epicsLoading = false;
      },
      error: err => {
        console.error('[ProjectSettings] removeEpic failed', err);
        this.epicsLoading = false;
        window.alert('Falha ao remover o epico.');
      }
    });
  }

  trackByEpic(_index: number, epic: Epic): string {
    return epic.id;
  }
}
