import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { User, UserCreateByAdmin } from '../../../../core/models/user.model';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuarios-list.component.html',
  styleUrls: ['./usuarios-list.component.css'],
})
export class UsuariosListComponent implements OnInit {
  private authService = inject(AuthService);

  users = signal<User[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = '';
  selectedRole = '';

  // Modal create employee state
  showModal = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');

  newEmployee: UserCreateByAdmin = {
    name: '',
    email: '',
    password: '',
    role: 'cajero',
  };

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.authService.getUsers(this.searchTerm, this.selectedRole).subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onFilterChange(): void {
    this.loadUsers();
  }

  openCreateModal(): void {
    this.newEmployee = {
      name: '',
      email: '',
      password: '',
      role: 'cajero',
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitEmployee(): void {
    if (!this.newEmployee.name || !this.newEmployee.email || !this.newEmployee.password) {
      this.modalError.set('Todos los campos son obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');
    this.modalSuccess.set('');

    this.authService.createEmployee(this.newEmployee).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.modalSuccess.set(`Empleado ${created.name} registrado con éxito.`);
        this.loadUsers();
        setTimeout(() => this.closeModal(), 1200);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const detail = err.error?.detail || 'Error al registrar el empleado.';
        this.modalError.set(typeof detail === 'string' ? detail : JSON.stringify(detail));
      },
    });
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'administrador':
        return 'badge-admin';
      case 'encargado_sucursal':
        return 'badge-manager';
      case 'cajero':
        return 'badge-cashier';
      default:
        return 'badge-client';
    }
  }
}
