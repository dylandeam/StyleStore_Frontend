import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientesService } from '../../../../core/services/clientes.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Cliente, ClienteCreate, ClienteUpdate } from '../../../../core/models/cliente.model';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes-list.component.html',
  styleUrls: ['./clientes-list.component.css'],
})
export class ClientesListComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private authService = inject(AuthService);

  get canManage(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal' || role === 'cajero';
  }

  clientes = signal<Cliente[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = '';

  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingCodigo: string | null = null;
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');

  formData: ClienteCreate = {
    nombre: '',
    apellido: '',
    ci: '',
    email: '',
    password: '',
    telefono: '',
    direccion: '',
  };

  ngOnInit(): void {
    this.loadClientes();
  }

  loadClientes(): void {
    this.isLoading.set(true);
    this.clientesService.getClientes().subscribe({
      next: (data) => {
        this.clientes.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  get filteredClientes(): Cliente[] {
    if (!this.searchTerm.trim()) return this.clientes();
    const term = this.searchTerm.toLowerCase();
    return this.clientes().filter(
      (c) =>
        c.codigo.toLowerCase().includes(term) ||
        (c.nombre && c.nombre.toLowerCase().includes(term)) ||
        (c.apellido && c.apellido.toLowerCase().includes(term)) ||
        (c.ci && c.ci.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.telefono && c.telefono.toLowerCase().includes(term))
    );
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingCodigo = null;
    this.formData = {
      nombre: '',
      apellido: '',
      ci: '',
      email: '',
      password: '',
      telefono: '',
      direccion: '',
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  openEditModal(c: Cliente): void {
    this.isEditing.set(true);
    this.editingCodigo = c.codigo;
    this.formData = {
      nombre: c.nombre || '',
      apellido: c.apellido || '',
      ci: c.ci || '',
      email: c.email || '',
      password: '',
      telefono: c.telefono,
      direccion: c.direccion,
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.modalError.set('');
    this.modalSuccess.set('');
  }

  saveCliente(): void {
    if (!this.formData.nombre.trim() || !this.formData.apellido.trim() || !this.formData.ci.trim()) {
      this.modalError.set('Nombre, Apellido y CI son obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.editingCodigo) {
      const updateData: ClienteUpdate = {
        nombre: this.formData.nombre,
        apellido: this.formData.apellido,
        ci: this.formData.ci,
        telefono: this.formData.telefono,
        direccion: this.formData.direccion,
      };

      this.clientesService.updateCliente(this.editingCodigo, updateData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Cliente actualizado exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadClientes();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al actualizar cliente.');
        },
      });
    } else {
      if (!this.formData.email.trim()) {
        this.isSubmitting.set(false);
        this.modalError.set('El correo electrónico es obligatorio.');
        return;
      }

      this.clientesService.createCliente(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Cliente registrado exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadClientes();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al registrar cliente.');
        },
      });
    }
  }

  deleteCliente(c: Cliente): void {
    if (!confirm(`¿Está seguro de eliminar al cliente ${c.nombre} ${c.apellido} (Código: ${c.codigo})?`)) {
      return;
    }

    this.clientesService.deleteCliente(c.codigo).subscribe({
      next: () => {
        this.loadClientes();
      },
      error: (err) => {
        alert(err.error?.detail || 'No se pudo eliminar el cliente.');
      },
    });
  }
}
