import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = this.authService.isLoading;
  showPassword = signal<boolean>(false);

  registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { name, email, password } = this.registerForm.value;

    this.authService
      .register({ name: name!, email: email!, password: password! })
      .subscribe({
        next: () => {
          this.successMessage.set('¡Cuenta creada exitosamente! Redirigiendo al inicio de sesión...');
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 1500);
        },
        error: (err) => {
          const detail =
            err.error?.detail || 'Error al registrar usuario. Intenta de nuevo.';
          this.errorMessage.set(detail);
        },
      });
  }
}
