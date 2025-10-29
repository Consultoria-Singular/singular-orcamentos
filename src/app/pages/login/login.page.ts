import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { DsButtonComponent } from '../../components/ds/ds-button.component';
import { AuthService } from '../../core/services/auth.service';
import { AuthStore } from '../../core/state/auth.store';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DsButtonComponent],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    if (this.authStore.isAuthenticated()) {
      this.navigateToDashboard();
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const credentials = this.form.getRawValue();

    this.authService.login(credentials).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: () => {
        this.navigateToDashboard();
      },
      error: err => {
        console.error('[LoginPage] login failed', err);
        const message = this.resolveErrorMessage(err);
        this.errorMessage.set(message);
        window.alert(message);
      }
    });
  }

  isSubmitDisabled(): boolean {
    return this.loading() || this.form.invalid;
  }

  private navigateToDashboard(): void {
    const rawRedirect = this.route.snapshot.queryParamMap.get('redirectTo') ?? undefined;
    const redirect = rawRedirect && rawRedirect.startsWith('/') ? rawRedirect : undefined;
    if (redirect) {
      this.router.navigateByUrl(redirect, { replaceUrl: true });
      return;
    }
    this.router.navigate(['/projects'], { replaceUrl: true });
  }

  private resolveErrorMessage(error: unknown): string {
    if (!error || typeof error !== 'object') {
      return 'Nao foi possivel entrar. Tente novamente mais tarde.';
    }

    const status = (error as { status?: number }).status;
    const code = (error as { error?: { code?: string } }).error?.code;

    if (status === 401 && code === 'INVALID_CREDENTIALS') {
      return 'Credenciais invalidas. Confira seu e-mail e senha.';
    }

    if (status === 403 && code === 'USER_INACTIVE') {
      return 'Usuario inativo. Entre em contato com o administrador.';
    }

    return 'Nao foi possivel entrar. Tente novamente mais tarde.';
  }
}
