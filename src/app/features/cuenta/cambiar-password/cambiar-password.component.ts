import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PasswordService } from '../../../core/services/password.service';

@Component({
  selector: 'app-cambiar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cambiar-password.component.html',
  styleUrls: ['./cambiar-password.component.css'],
})
export class CambiarPasswordComponent {
  private passwordService = inject(PasswordService);
  private router = inject(Router);

  currentPassword = '';
  newPassword = '';
  newPasswordConfirmation = '';

  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  get hasMinLength(): boolean {
    return this.newPassword.length >= 8;
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.newPassword);
  }

  get hasLowercase(): boolean {
    return /[a-z]/.test(this.newPassword);
  }

  get hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(this.newPassword);
  }

  get passwordsMatch(): boolean {
    return (
      this.newPassword.length > 0 &&
      this.newPassword === this.newPasswordConfirmation
    );
  }

  get isFormValid(): boolean {
    return (
      this.currentPassword.length > 0 &&
      this.hasMinLength &&
      this.hasUppercase &&
      this.hasLowercase &&
      this.hasSpecialChar &&
      this.passwordsMatch
    );
  }

  onSubmit(): void {
    if (!this.isFormValid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.passwordService
      .requestChange(
        this.currentPassword,
        this.newPassword,
        this.newPasswordConfirmation
      )
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.successMessage.set(res.message);
          this.currentPassword = '';
          this.newPassword = '';
          this.newPasswordConfirmation = '';
        },
        error: (err) => {
          this.isLoading.set(false);
          const detail =
            err.error?.detail ||
            'Error al solicitar el cambio de contraseña. Verifica tus datos.';
          this.errorMessage.set(typeof detail === 'string' ? detail : JSON.stringify(detail));
        },
      });
  }
}
