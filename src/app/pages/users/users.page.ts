import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { DsButtonComponent } from '../../components/ds/ds-button.component';
import { UsersService, UpdateUserPayload } from '../../core/services/users.service';
import { AppUser, UserRole } from '../../core/models/user.model';
import { ToastService } from '../../core/services/toast.service';
import { AuthFacade } from '../../core/facades/auth.facade';

type ApiError = { status?: number; error?: { code?: string } };

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DsButtonComponent],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss']
})
export class UsersPage {
  private readonly usersService = inject(UsersService);
  private readonly authFacade = inject(AuthFacade);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  private hasInitialized = false;

  readonly users = signal<AppUser[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly permissionDeniedSignal = signal(false);
  readonly permissionDenied = this.permissionDeniedSignal.asReadonly();

  readonly showCreateModal = signal(false);
  readonly showEditModal = signal(false);
  readonly showDeleteModal = signal(false);

  readonly creating = signal(false);
  readonly updating = signal(false);
  readonly deleting = signal(false);
  readonly loadingUserDetails = signal(false);

  readonly selectedUserId = signal<string | null>(null);
  readonly editingUser = signal<AppUser | null>(null);
  readonly deletingUser = signal<AppUser | null>(null);

  readonly isAdmin = computed(() => this.authFacade.currentUserRole() === 'ADMIN');
  readonly canManageUsers = computed(() => this.isAdmin() && !this.permissionDeniedSignal());

  readonly createForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['VISUALIZADOR' as UserRole, [Validators.required]]
  });

  readonly editForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    role: ['', [Validators.required]],
    isActive: [true]
  });

  private readonly initEffect = effect(() => {
    const role = this.authFacade.currentUserRole();
    if (!role) {
      return;
    }

    if (role !== 'ADMIN') {
      this.permissionDeniedSignal.set(true);
      this.users.set([]);
      this.loading.set(false);
      this.error.set('Voce nao tem permissao para acessar o controle de usuarios.');
      return;
    }

    this.permissionDeniedSignal.set(false);
    if (!this.hasInitialized) {
      this.hasInitialized = true;
      this.loadUsers();
    }
  }, { allowSignalWrites: true });

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.usersService.getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: users => {
          this.users.set(users);
          this.loading.set(false);
        },
        error: err => {
          this.loading.set(false);
          this.handleApiError(err, {
            fallbackMessage: 'Nao foi possivel carregar os usuarios.',
            setPageError: true
          });
        }
      });
  }

  openCreateModal(): void {
    if (!this.canManageUsers()) {
      return;
    }
    this.createForm.reset({
      email: '',
      password: '',
      role: 'VISUALIZADOR'
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createForm.reset({
      email: '',
      password: '',
      role: 'VISUALIZADOR'
    });
  }

  onSubmitCreate(): void {
    if (this.createForm.invalid || this.creating()) {
      this.createForm.markAllAsTouched();
      return;
    }

    const payload = this.createForm.getRawValue();
    this.creating.set(true);

    this.usersService.createUser(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.creating.set(false))
      )
      .subscribe({
        next: user => {
          this.toastService.show('Usuario criado com sucesso.');
          this.closeCreateModal();
          this.loadUsers();
        },
        error: err => this.handleCreateError(err)
      });
  }

  openEditModal(userId: string): void {
    if (!this.canManageUsers()) {
      return;
    }

    const cached = this.users().find(user => user.id === userId) ?? null;
    this.editForm.reset({
      email: cached?.email ?? '',
      password: '',
      role: cached?.role ?? '',
      isActive: cached?.isActive ?? true
    });

    this.loadingUserDetails.set(!cached);
    this.selectedUserId.set(userId);
    this.editingUser.set(cached);
    this.showEditModal.set(true);

    if (!cached) {
      this.usersService.getUserById(userId)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loadingUserDetails.set(false))
        )
        .subscribe({
          next: user => {
            this.editingUser.set(user);
            this.editForm.patchValue({
              email: user.email,
              password: '',
              role: user.role,
              isActive: user.isActive
            });
          },
          error: err => {
            this.handleApiError(err, {
              fallbackMessage: 'Nao foi possivel carregar os dados do usuario para edicao.',
              setPageError: false
            });
            this.closeEditModal();
          }
        });
    } else {
      this.loadingUserDetails.set(false);
    }
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedUserId.set(null);
    this.editingUser.set(null);
    this.editForm.reset();
    this.loadingUserDetails.set(false);
  }

  onSubmitEdit(): void {
    const userId = this.selectedUserId();
    const original = this.editingUser();

    if (!userId || !original) {
      return;
    }

    if (this.editForm.invalid || this.updating()) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formValue = this.editForm.getRawValue();
    const payload: UpdateUserPayload = {};

    const trimmedEmail = formValue.email?.trim();
    if (trimmedEmail && trimmedEmail !== original.email) {
      payload.email = trimmedEmail;
    }

    const trimmedPassword = formValue.password?.trim();
    if (trimmedPassword) {
      payload.password = trimmedPassword;
    }

    if (formValue.role && formValue.role !== original.role) {
      payload.role = formValue.role as UserRole;
    }

    if (typeof formValue.isActive === 'boolean' && formValue.isActive !== original.isActive) {
      payload.isActive = formValue.isActive;
    }

    if (Object.keys(payload).length === 0) {
      this.toastService.show('Nenhuma alteracao detectada.');
      return;
    }

    this.updating.set(true);

    this.usersService.updateUser(userId, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.updating.set(false))
      )
      .subscribe({
        next: () => {
          this.toastService.show('Usuario atualizado com sucesso.');
          this.closeEditModal();
          this.loadUsers();
        },
        error: err => this.handleUpdateError(err)
      });
  }

  openDeleteModal(user: AppUser): void {
    if (!this.canManageUsers()) {
      return;
    }
    this.deletingUser.set(user);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deletingUser.set(null);
  }

  confirmDelete(): void {
    const user = this.deletingUser();
    if (!user || this.deleting()) {
      return;
    }

    this.deleting.set(true);

    this.usersService.deleteUser(user.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false))
      )
      .subscribe({
        next: () => {
          this.toastService.show('Usuario removido com sucesso.');
          this.closeDeleteModal();
          this.users.set(this.users().filter(item => item.id !== user.id));
          this.loadUsers();
        },
        error: err => this.handleDeleteError(err)
      });
  }

  trackByUserId = (_index: number, user: AppUser): string => user.id;

  private handleCreateError(error: unknown): void {
    const status = this.extractStatus(error);
    const code = this.extractErrorCode(error);

    if (status === 409 && code === 'EMAIL_ALREADY_IN_USE') {
      this.createForm.controls.email.setErrors({ emailInUse: true });
      this.toastService.show('E-mail ja cadastrado.');
      return;
    }

    this.handleApiError(error, {
      fallbackMessage: 'Nao foi possivel criar o usuario.',
      setPageError: false
    });
  }

  private handleUpdateError(error: unknown): void {
    const status = this.extractStatus(error);
    const code = this.extractErrorCode(error);

    if (status === 409 && code === 'EMAIL_ALREADY_IN_USE') {
      this.editForm.controls.email?.setErrors({ emailInUse: true });
      this.toastService.show('E-mail ja cadastrado.');
      return;
    }

    this.handleApiError(error, {
      fallbackMessage: 'Nao foi possivel atualizar o usuario.',
      setPageError: false
    });
  }

  private handleDeleteError(error: unknown): void {
    this.handleApiError(error, {
      fallbackMessage: 'Nao foi possivel remover o usuario.',
      setPageError: false
    });
  }

  private handleApiError(error: unknown, options?: { fallbackMessage?: string; setPageError?: boolean }): void {
    console.error('[UsersPage] API error', error);
    const status = this.extractStatus(error);

    if (status === 401) {
      this.authFacade.handleUnauthorized('Sessao expirada. Faca login novamente.');
      return;
    }

    if (status === 403) {
      this.permissionDeniedSignal.set(true);
      const message = 'Voce nao tem permissao para executar esta acao.';
      if (options?.setPageError) {
        this.error.set(message);
      }
      this.toastService.show(message);
      return;
    }

    const fallback = options?.fallbackMessage ?? 'Ocorreu um erro ao comunicar com o servidor.';

    if (options?.setPageError) {
      this.error.set(fallback);
    }

    this.toastService.show(fallback);
  }

  private extractStatus(error: unknown): number | undefined {
    return (error as ApiError)?.status;
  }

  private extractErrorCode(error: unknown): string | undefined {
    return (error as ApiError)?.error?.code;
  }

}
