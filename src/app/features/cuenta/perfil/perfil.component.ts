import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent implements OnInit {
  private authService = inject(AuthService);

  user = signal<User | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
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
  rol = signal<string>('');

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    const u = this.authService.currentUser();
    if (u) {
      this.user.set(u);
      this.nombre.set(u.nombre || u.name || '');
      this.apellido.set(u.apellido || '');
      this.email.set(u.email || '');
      this.ci.set(u.ci || '');
      this.telefono.set((u as any).telefono || '');
      this.direccion.set((u as any).direccion || '');
      this.foto.set((u as any).foto || '');
      this.rol.set(u.role || 'Usuario');
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.foto.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile(): void {
    if (!this.nombre().trim() || !this.apellido().trim() || !this.email().trim()) {
      this.errorMessage.set('Nombre, apellido y correo electrónico son obligatorios.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const updatePayload = {
      nombre: this.nombre().trim(),
      apellido: this.apellido().trim(),
      email: this.email().trim(),
      telefono: this.telefono().trim() || undefined,
      direccion: this.direccion().trim() || undefined,
      foto: this.foto().trim() || undefined,
    };

    this.authService.updateProfile(updatePayload).subscribe({
      next: (updatedUser) => {
        this.user.set(updatedUser);
        this.successMessage.set('Perfil actualizado exitosamente.');
        this.isSaving.set(false);
        setTimeout(() => this.successMessage.set(null), 3500);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Error al actualizar el perfil.');
        this.isSaving.set(false);
      },
    });
  }
}
