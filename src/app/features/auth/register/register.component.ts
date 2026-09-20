import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

import { UploadService } from '../../../core/services/upload.service';

export const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('password_confirmation');
  if (!password || !confirmPassword) return null;
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly uploadService = inject(UploadService);
  private readonly router = inject(Router);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isLoading = this.authService.isLoading;
  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);

  // Foto de perfil opcional
  readonly fotoUrl = signal<string>('');
  readonly isUploadingFoto = signal<boolean>(false);

  readonly registerForm: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      ci: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]],
      telefono: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(20)]],
      direccion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{8,}$/),
        ],
      ],
      password_confirmation: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator }
  );

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((val) => !val);
  }

  onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.isUploadingFoto.set(true);
      this.errorMessage.set(null);

      this.uploadService.uploadImage(file, 'clientes').subscribe({
        next: (res) => {
          this.fotoUrl.set(res.url);
          this.isUploadingFoto.set(false);
        },
        error: (err) => {
          this.isUploadingFoto.set(false);
          this.errorMessage.set(err.error?.detail || 'Error al subir la foto de perfil.');
        },
      });
    }
  }

  getFotoPreview(): string {
    return this.uploadService.getImageUrl(this.fotoUrl(), 'clientes');
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const val = this.registerForm.value;
    let name = val.name!.trim();
    let apellido = val.apellido!.trim();
    if (apellido && name.toLowerCase().endsWith(apellido.toLowerCase()) && name.length > apellido.length) {
      name = name.slice(0, -apellido.length).trim();
    }

    this.authService
      .register({
        name,
        apellido,
        ci: val.ci!.trim(),
        telefono: val.telefono!.trim(),
        direccion: val.direccion!.trim(),
        foto: this.fotoUrl() || null,
        email: val.email!.trim(),
        password: val.password!,
      })
      .subscribe({
        next: () => {
          this.successMessage.set('¡Cuenta de cliente creada exitosamente! Redirigiendo al inicio de sesión...');
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 1500);
        },
        error: (err) => {
          const detail =
            err.error?.detail || 'Error al registrar usuario. Intenta de nuevo.';
          this.errorMessage.set(typeof detail === 'string' ? detail : 'Error al procesar el registro.');
        },
      });
  }
}
