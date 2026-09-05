import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly errorMessage = signal<string | null>(null);
  readonly sessionExpiredMessage = signal<boolean>(false);
  readonly isLoading = this.authService.isLoading;
  readonly showPassword = signal<boolean>(false);

  // Intentos fallidos y temporizador de bloqueo progresivo en cliente
  readonly failedAttempts = signal<number>(0);
  readonly lockoutRemaining = signal<number>(0);
  readonly lockoutBlocks = signal<number>(0);
  private timerInterval: any = null;

  constructor() {
    this.route.queryParams.subscribe((params) => {
      if (params['sessionExpired'] === 'true') {
        this.sessionExpiredMessage.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  private startLockoutTimer(seconds: number): void {
    this.lockoutRemaining.set(seconds);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
      const current = this.lockoutRemaining();
      if (current <= 1) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.lockoutRemaining.set(0);
        this.errorMessage.set(null);
      } else {
        this.lockoutRemaining.set(current - 1);
        this.errorMessage.set(
          `Ha fallado ${this.failedAttempts()} veces seguidas. Debe esperar ${current - 1} segundos antes de volver a intentar.`
        );
      }
    }, 1000);
  }

  onSubmit(): void {
    if (this.lockoutRemaining() > 0) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.sessionExpiredMessage.set(false);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: () => {
        this.failedAttempts.set(0);
        this.lockoutBlocks.set(0);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        const attempts = this.failedAttempts() + 1;
        this.failedAttempts.set(attempts);

        if (attempts % 3 === 0) {
          const blocks = Math.floor(attempts / 3);
          this.lockoutBlocks.set(blocks);
          // 3 intentos -> 5s; 6 intentos -> 10s; 9 intentos -> 20s (duplica por cada bloque)
          const waitTime = 5 * Math.pow(2, blocks - 1);
          this.errorMessage.set(
            `Ha fallado ${attempts} veces seguidas. Debe esperar ${waitTime} segundos antes de volver a intentar.`
          );
          this.startLockoutTimer(waitTime);
        } else {
          if (err.status === 401) {
            this.errorMessage.set('Correo electrónico o contraseña incorrectos.');
          } else if (err.error?.detail) {
            this.errorMessage.set(typeof err.error.detail === 'string' ? err.error.detail : 'Error al autenticar.');
          } else {
            this.errorMessage.set('No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.');
          }
        }
      },
    });
  }
}
