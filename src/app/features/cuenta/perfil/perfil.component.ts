import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { BitacoraService } from '../../../core/services/bitacora.service';
import { User } from '../../../core/models/user.model';
import { UploadService } from '../../../core/services/upload.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent implements OnInit {
  private authService = inject(AuthService);
  private bitacoraService = inject(BitacoraService);
  private uploadService = inject(UploadService);

  user = signal<User | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isUploadingPhoto = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Form fields
  nombre = signal<string>('');
  apellido = signal<string>('');
  email = signal<string>('');
  ci = signal<string>('');
  telefono = signal<string>('');
  direccion = signal<string>('');
  foto = signal<string>('');
  fotoPreview = signal<string>('');
  rol = signal<string>('');
  isAdmin = signal<boolean>(false);

  // Bitácora Key Management (Admin only)
  bitacoraKeyStatus = signal<{ is_custom: boolean; type: string } | null>(null);
  bitacoraCurrentPassword = signal<string>('');
  bitacoraNewPassword = signal<string>('');
  bitacoraConfirmPassword = signal<string>('');
  bitacoraSuccessMessage = signal<string | null>(null);
  bitacoraErrorMessage = signal<string | null>(null);
  isSavingBitacoraKey = signal<boolean>(false);

  ngOnInit(): void {
    const u = this.authService.currentUser();
    if (u) {
      this.populateUserData(u);
    }
    // Fetch profile to ensure fresh user information and role
    this.authService.getProfile().subscribe({
      next: (freshUser) => {
        this.populateUserData(freshUser);
      },
      error: () => {},
    });
  }

  populateUserData(u: User): void {
    this.user.set(u);
    this.nombre.set(u.nombre || u.name || '');
    this.apellido.set(u.apellido || '');
    this.email.set(u.email || '');
    this.ci.set(u.ci || '');
    this.telefono.set((u as any).telefono || '');
    this.direccion.set((u as any).direccion || '');
    this.foto.set((u as any).foto || '');
    this.fotoPreview.set('');
    this.rol.set(u.role || 'Usuario');
    const adminRole = u.role?.toLowerCase() === 'administrador';
    this.isAdmin.set(adminRole);

    if (adminRole) {
      this.loadBitacoraKeyStatus();
    }
  }

  loadBitacoraKeyStatus(): void {
    this.bitacoraService.getEstadoClave().subscribe({
      next: (res) => this.bitacoraKeyStatus.set(res),
      error: () => {},
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage.set('Formato no permitido. Usa una imagen JPG, PNG, WEBP o GIF.');
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage.set('La foto de perfil no puede superar 5 MB.');
        input.value = '';
        return;
      }

      this.errorMessage.set(null);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fotoPreview.set(e.target.result);
      };
      reader.readAsDataURL(file);

      this.isUploadingPhoto.set(true);
      this.uploadService.uploadImage(file, 'perfiles').subscribe({
        next: (response) => {
          this.foto.set(response.url);
          this.fotoPreview.set(this.uploadService.getImageUrl(response.url, 'perfiles'));
          this.isUploadingPhoto.set(false);
        },
        error: (err) => {
          this.isUploadingPhoto.set(false);
          this.fotoPreview.set('');
          this.errorMessage.set(this.formatErrorMessage(err, 'No se pudo subir la foto de perfil.'));
        },
      });
    }
  }

  getProfilePhotoUrl(): string {
    return this.fotoPreview() || this.uploadService.getImageUrl(this.foto(), 'perfiles') || 'assets/images/placeholder-avatar.png';
  }

  onPhotoUrlChange(value: string): void {
    this.fotoPreview.set('');
    this.foto.set(value);
  }

  private formatErrorMessage(err: any, fallback: string): string {
    const detail = err?.error?.detail ?? err?.message;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item: any) => {
          const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : null;
          return `${field ? `${field}: ` : ''}${item?.msg || 'Valor inválido'}`;
        })
        .join(' · ');
    }
    if (detail && typeof detail === 'object') {
      return detail.message || detail.msg || fallback;
    }
    return fallback;
  }

  saveProfile(): void {
    if (this.isUploadingPhoto()) {
      this.errorMessage.set('Espera a que termine de subir la foto de perfil.');
      return;
    }
    if (!this.nombre().trim() || !this.apellido().trim() || !this.email().trim()) {
      this.errorMessage.set('Nombre, apellido y correo electrónico son obligatorios.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const updatePayload = {
      name: this.nombre().trim(),
      apellido: this.apellido().trim(),
      email: this.email().trim(),
      telefono: this.telefono().trim() || undefined,
      direccion: this.direccion().trim() || undefined,
      foto: this.foto().trim() || undefined,
    };

    this.authService.updateProfile(updatePayload).subscribe({
      next: (updatedUser) => {
        this.populateUserData(updatedUser);
        this.successMessage.set('Perfil actualizado exitosamente.');
        this.isSaving.set(false);
        setTimeout(() => this.successMessage.set(null), 3500);
      },
      error: (err) => {
        this.errorMessage.set(this.formatErrorMessage(err, 'Error al actualizar el perfil.'));
        this.isSaving.set(false);
      },
    });
  }

  updateBitacoraPassword(): void {
    this.bitacoraErrorMessage.set(null);
    this.bitacoraSuccessMessage.set(null);

    const currentPass = this.bitacoraCurrentPassword().trim();
    const newPass = this.bitacoraNewPassword().trim();
    const confirmPass = this.bitacoraConfirmPassword().trim();

    if (!currentPass) {
      this.bitacoraErrorMessage.set('Debes ingresar tu contraseña actual de cuenta para confirmar tu identidad.');
      return;
    }

    if (newPass.length < 4) {
      this.bitacoraErrorMessage.set('La nueva contraseña de bitácora debe tener al menos 4 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      this.bitacoraErrorMessage.set('Las nuevas contraseñas no coinciden.');
      return;
    }

    this.isSavingBitacoraKey.set(true);
    this.bitacoraService.cambiarClaveBitacora(currentPass, newPass).subscribe({
      next: (res) => {
        this.bitacoraSuccessMessage.set(res.message);
        this.bitacoraCurrentPassword.set('');
        this.bitacoraNewPassword.set('');
        this.bitacoraConfirmPassword.set('');
        this.isSavingBitacoraKey.set(false);
        this.loadBitacoraKeyStatus();
        setTimeout(() => this.bitacoraSuccessMessage.set(null), 4000);
      },
      error: (err) => {
        this.bitacoraErrorMessage.set(err.error?.detail || 'Error al cambiar la contraseña de la bitácora.');
        this.isSavingBitacoraKey.set(false);
      },
    });
  }

  resetBitacoraPassword(): void {
    this.bitacoraErrorMessage.set(null);
    this.bitacoraSuccessMessage.set(null);

    const currentPass = this.bitacoraCurrentPassword().trim();
    if (!currentPass) {
      this.bitacoraErrorMessage.set('Introduce tu contraseña actual de cuenta para restablecer la clave.');
      return;
    }

    if (!confirm('¿Estás seguro de restablecer la clave de la bitácora a la contraseña predeterminada de tu cuenta?')) {
      return;
    }

    this.isSavingBitacoraKey.set(true);
    this.bitacoraService.restablecerClaveBitacora(currentPass).subscribe({
      next: (res) => {
        this.bitacoraSuccessMessage.set(res.message);
        this.bitacoraCurrentPassword.set('');
        this.bitacoraNewPassword.set('');
        this.bitacoraConfirmPassword.set('');
        this.isSavingBitacoraKey.set(false);
        this.loadBitacoraKeyStatus();
        setTimeout(() => this.bitacoraSuccessMessage.set(null), 4000);
      },
      error: (err) => {
        this.bitacoraErrorMessage.set(err.error?.detail || 'Error al restablecer la contraseña.');
        this.isSavingBitacoraKey.set(false);
      },
    });
  }
}
