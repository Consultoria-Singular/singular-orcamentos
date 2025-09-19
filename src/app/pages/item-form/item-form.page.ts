import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DsButtonComponent } from '../../components/ds/ds-button.component';
import { DsCardComponent } from '../../components/ds/ds-card.component';
import { ToolbarComponent } from '../../components/shared/toolbar.component';
import { BudgetItem } from '../../core/models/budget-item.model';
import { Epic } from '../../core/models/epic.model';
import { ProjectsService } from '../../core/services/projects.service';
import { BudgetItemsService } from '../../core/services/budget-items.service';

interface ItemFormModel {
  epicId: FormControl<string>;
  name: FormControl<string>;
  hours: FormControl<number>;
  qa: FormControl<boolean>;
  architect: FormControl<boolean>;
  design: FormControl<boolean>;
}

interface ItemFormValue {
  epicId: string;
  name: string;
  hours: number;
  qa: boolean;
  architect: boolean;
  design: boolean;
}

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToolbarComponent, DsCardComponent, DsButtonComponent],
  templateUrl: './item-form.page.html',
  styleUrls: ['./item-form.page.scss']
})
export class ItemFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly budgetItemsService = inject(BudgetItemsService);

  readonly projectId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly itemId = this.route.snapshot.paramMap.get('itemId');

  form: FormGroup<ItemFormModel> = this.fb.group({
    epicId: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    name: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    hours: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    qa: this.fb.control(false, { nonNullable: true }),
    architect: this.fb.control(false, { nonNullable: true }),
    design: this.fb.control(false, { nonNullable: true })
  });

  epics: Epic[] = [];
  originalItem?: BudgetItem;

  loading = true;
  saving = false;
  error?: string;

  get isEdit(): boolean {
    return !!this.itemId;
  }

  get breadcrumbs() {
    const crumbs = [
      { label: 'Projetos', link: '/projects' },
      { label: 'Itens', link: `/projects/${this.projectId}/items` },
      { label: this.isEdit ? 'Editar item' : 'Novo item' }
    ];
    return crumbs;
  }

  ngOnInit(): void {
    console.log('[ItemForm] ngOnInit projectId', this.projectId, 'itemId', this.itemId);
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.error = undefined;

    this.projectsService.getProject(this.projectId).subscribe({
      next: project => {
        console.log('[ItemForm] project received', project);
        this.epics = [...project.epics];
        if (this.isEdit) {
          const current = project.budgetItems.find(item => item.id === this.itemId);
          console.log('[ItemForm] edit mode current item', current);
          if (!current) {
            this.error = 'Item nao encontrado.';
            this.loading = false;
            return;
          }
          this.originalItem = current;
          this.form.patchValue({
            epicId: current.epicId,
            name: current.name,
            hours: current.hours,
            qa: current.qa ?? false,
            architect: current.architect ?? false,
            design: current.design ?? false
          });
        }
        this.loading = false;
      },
      error: err => {
        console.error('[ItemForm] loadData failed', err);
        this.error = 'Nao foi possivel carregar as informacoes do projeto.';
        this.loading = false;
      }
    });
  }

  submitForm(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue() as ItemFormValue;
    console.log('[ItemForm] submit raw form value', value);
    const payload = {
      epicId: value.epicId,
      name: value.name,
      hours: Number(value.hours),
      qa: value.qa,
      architect: value.architect,
      design: value.design
    };

    console.log('[ItemForm] submit payload', payload);

    this.saving = true;

    const request$ = this.isEdit && this.itemId
      ? this.budgetItemsService.update(this.projectId, this.itemId, payload)
      : this.budgetItemsService.create(this.projectId, payload);

    request$.subscribe({
      next: created => {
        console.log('[ItemForm] save success', created);
        this.saving = false;
        window.alert(this.isEdit ? 'Item atualizado com sucesso!' : 'Item adicionado com sucesso!');
        this.router.navigate(['/projects', this.projectId, 'items']);
      },
      error: err => {
        console.error('[ItemForm] save failed', err);
        this.saving = false;
        window.alert('Nao foi possivel salvar o item.');
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/projects', this.projectId, 'items']);
  }
}
