import { Component, OnInit, inject, signal } from '@angular/core';
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

import { UploadService } from '../../../core/services/upload.service';
import { TenantBranding } from '../../../core/models/auth.model';
import { BrandingService } from '../../../core/services/branding.service';

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
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly uploadService = inject(UploadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly branding = inject(BrandingService);

  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isLoading = this.authService.isLoading;
  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly companies = signal<Array<{ codigo: string; nombre: string }>>([]);
  readonly selectedCompanyCodes = signal<string[]>([]);
  readonly tenantPortal = signal<TenantBranding | null>(null);
  readonly isTenantPortal = signal(false);

  // Foto de perfil opcional
  readonly fotoUrl = signal<string>('');
  readonly fotoFile = signal<File | null>(null);
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

  ngOnInit(): void {
    const portalCode = (this.route.snapshot.paramMap.get('tenant') || '').trim().toLowerCase();
    this.isTenantPortal.set(!!portalCode);
    if (!portalCode) {
      this.router.navigate(['/auth/tenant']);
      return;
    }
    this.authService.getTenantPortal(portalCode).subscribe({
      next: (tenant) => {
        this.tenantPortal.set(tenant);
        this.companies.set([tenant]);
        this.selectedCompanyCodes.set([tenant.codigo]);
        this.branding.apply(tenant);
      },
      error: () => this.errorMessage.set('Este portal de registro no existe o no está disponible.'),
    });
  }

  toggleCompany(code: string, checked: boolean): void {
    this.selectedCompanyCodes.update((current) =>
      checked ? Array.from(new Set([...current, code])) : current.filter((item) => item !== code)
    );
  }

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
      this.errorMessage.set(null);
      if (!file.type.startsWith('image/')) {
        this.errorMessage.set('Selecciona un archivo de imagen válido.');
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage.set('La foto no puede superar 5 MB.');
        input.value = '';
        return;
      }
      const previous = this.fotoUrl();
      if (previous.startsWith('blob:')) URL.revokeObjectURL(previous);
      this.fotoFile.set(file);
      this.fotoUrl.set(URL.createObjectURL(file));
    }
  }

  getFotoPreview(): string {
    return this.fotoUrl();
  }

  private finalizarRegistro(mensaje: string): void {
    this.isUploadingFoto.set(false);
    this.successMessage.set(mensaje);
    const tenant = this.selectedCompanyCodes()[0];
    setTimeout(() => this.router.navigate(tenant ? ['/t', tenant, 'login'] : ['/auth/tenant']), 1500);
  }

  private guardarFotoTrasRegistro(email: string, password: string): void {
    const file = this.fotoFile();
    if (!file) {
      this.finalizarRegistro('¡Cuenta de cliente creada exitosamente! Redirigiendo al inicio de sesión...');
      return;
    }

    this.isUploadingFoto.set(true);
    this.authService.login({ email, password, empresa_codigo: this.selectedCompanyCodes()[0] }).subscribe({
      next: () => this.uploadService.uploadImage(file, 'perfiles').subscribe({
        next: (upload) => this.authService.updateProfile({ foto: upload.url }).subscribe({
          next: () => {
            this.authService.logout();
            this.finalizarRegistro('¡Cuenta y foto de perfil guardadas! Ya puedes iniciar sesión.');
          },
          error: () => {
            this.authService.logout();
            this.finalizarRegistro('La cuenta fue creada. Podrás configurar la foto desde tu perfil.');
          },
        }),
        error: () => {
          this.authService.logout();
          this.finalizarRegistro('La cuenta fue creada. Podrás configurar la foto desde tu perfil.');
        },
      }),
      error: () => this.finalizarRegistro('La cuenta fue creada. Inicia sesión para configurar la foto.'),
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    if (!this.selectedCompanyCodes().length) {
      this.errorMessage.set('Selecciona al menos una empresa donde deseas registrarte.');
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

    const payload = {
        name,
        apellido,
        ci: val.ci!.trim(),
        telefono: val.telefono!.trim(),
        direccion: val.direccion!.trim(),
        foto: null,
        email: val.email!.trim(),
        password: val.password!,
        empresa_codigos: this.selectedCompanyCodes(),
      };
    const tenantCode = this.tenantPortal()?.codigo;
    const request = tenantCode
      ? this.authService.registerForTenant(tenantCode, payload)
      : this.authService.register(payload);
    request
      .subscribe({
        next: () => this.guardarFotoTrasRegistro(val.email!.trim(), val.password!),
        error: (err) => {
          const detail =
            err.error?.detail || 'Error al registrar usuario. Intenta de nuevo.';
          this.errorMessage.set(typeof detail === 'string' ? detail : 'Error al procesar el registro.');
        },
      });
  }

  tenantLogo(): string {
    return this.branding.logoUrl(this.tenantPortal());
  }
}
