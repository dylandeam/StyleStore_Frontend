import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../../core/services/empleados.service';
import { SucursalService } from '../../../../core/services/sucursal.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Empleado, EmpleadoCreate, EmpleadoUpdate } from '../../../../core/models/empleado.model';
import { Sucursal } from '../../../../core/models/sucursal.model';

@Component({
  selector: 'app-empleados-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleados-list.component.html',
  styleUrls: ['./empleados-list.component.css'],
})
export class EmpleadosListComponent implements OnInit {
  private empleadosService = inject(EmpleadosService);
  private sucursalService = inject(SucursalService);
  private authService = inject(AuthService);

  get isAdmin(): boolean {
    return this.authService.currentUser()?.role === 'administrador';
  }

  empleados = signal<Empleado[]>([]);
  sucursales = signal<Sucursal[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = '';
  selectedSucursalFilter = '';

  // Modal State
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingCodigo: string | null = null;
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');

  formData: EmpleadoCreate = {
    nombre: '',
    apellido: '',
    ci: '',
    email: '',
    password: '',
    sucursal_id: 0,
    edad: 25,
    sueldo: 3500,
    telefono: '',
    direccion: '',
    foto: '',
  };

  ngOnInit(): void {
    this.loadEmpleados();
    this.loadSucursales();
  }

  loadEmpleados(): void {
    this.isLoading.set(true);
    this.empleadosService.getEmpleados().subscribe({
      next: (data) => {
        this.empleados.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  loadSucursales(): void {
    this.sucursalService.getSucursales().subscribe({
      next: (data) => {
        this.sucursales.set(data);
        if (this.formData.sucursal_id === 0 && data.length > 0) {
          this.formData.sucursal_id = data[0].id;
        }
      },
    });
  }

  get filteredEmpleados(): Empleado[] {
    let list = this.empleados();
    if (this.selectedSucursalFilter) {
      list = list.filter((e) => e.sucursal_id === Number(this.selectedSucursalFilter));
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(
        (e) =>
          e.codigo.toLowerCase().includes(term) ||
          (e.nombre && e.nombre.toLowerCase().includes(term)) ||
          (e.apellido && e.apellido.toLowerCase().includes(term)) ||
          (e.ci && e.ci.toLowerCase().includes(term)) ||
          (e.email && e.email.toLowerCase().includes(term))
      );
    }
    return list;
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingCodigo = null;
    const defaultSucursal = this.sucursales().length > 0 ? this.sucursales()[0].id : 0;
    this.formData = {
      nombre: '',
      apellido: '',
      ci: '',
      email: '',
      password: '',
      role: 'encargado_sucursal',
      sucursal_id: defaultSucursal,
      edad: 25,
      sueldo: 3500,
      telefono: '',
      direccion: '',
      foto: '',
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  openEditModal(emp: Empleado): void {
    this.isEditing.set(true);
    this.editingCodigo = emp.codigo;
    this.formData = {
      nombre: emp.nombre || '',
      apellido: emp.apellido || '',
      ci: emp.ci || '',
      email: emp.email || '',
      password: '',
      role: emp.role || 'encargado_sucursal',
      sucursal_id: emp.sucursal_id,
      edad: emp.edad,
      sueldo: emp.sueldo,
      telefono: emp.telefono,
      direccion: emp.direccion,
      foto: emp.foto || '',
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

  saveEmpleado(): void {
    if (!this.formData.nombre.trim() || this.formData.nombre.trim().length < 2) {
      this.modalError.set('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (!this.formData.apellido.trim() || this.formData.apellido.trim().length < 2) {
      this.modalError.set('El apellido debe tener al menos 2 caracteres.');
      return;
    }
    if (!this.formData.ci.trim() || this.formData.ci.trim().length < 4) {
      this.modalError.set('La cédula de identidad (CI) debe tener al menos 4 dígitos para generar el código.');
      return;
    }
    if (!this.formData.sucursal_id || this.formData.sucursal_id === 0) {
      this.modalError.set('Debe seleccionar una sucursal válida.');
      return;
    }
    if (!this.formData.telefono.trim() || this.formData.telefono.trim().length < 5) {
      this.modalError.set('El teléfono debe contener al menos 5 dígitos.');
      return;
    }
    if (!this.formData.direccion.trim() || this.formData.direccion.trim().length < 3) {
      this.modalError.set('La dirección debe tener al menos 3 caracteres.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');

    if (this.isEditing() && this.editingCodigo) {
      const updateData: EmpleadoUpdate = {
        nombre: this.formData.nombre.trim(),
        apellido: this.formData.apellido.trim(),
        ci: this.formData.ci.trim(),
        sucursal_id: this.formData.sucursal_id,
        edad: this.formData.edad,
        sueldo: this.formData.sueldo,
        telefono: this.formData.telefono.trim(),
        direccion: this.formData.direccion.trim(),
        foto: this.formData.foto?.trim() || null,
      };

      this.empleadosService.updateEmpleado(this.editingCodigo, updateData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Empleado actualizado exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadEmpleados();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al actualizar empleado.');
        },
      });
    } else {
      if (!this.formData.email.trim()) {
        this.isSubmitting.set(false);
        this.modalError.set('El correo electrónico de acceso es obligatorio.');
        return;
      }
      if (!this.formData.password || this.formData.password.length < 8) {
        this.isSubmitting.set(false);
        this.modalError.set('La contraseña temporal debe tener al menos 8 caracteres.');
        return;
      }

      this.empleadosService.createEmpleado(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Empleado registrado exitosamente.');
          setTimeout(() => {
            this.closeModal();
            this.loadEmpleados();
          }, 700);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al crear empleado.');
        },
      });
    }
  }

  deleteEmpleado(emp: Empleado): void {
    if (!confirm(`¿Está seguro de desactivar / eliminar al empleado ${emp.nombre} ${emp.apellido} (Código: ${emp.codigo})?`)) {
      return;
    }

    this.empleadosService.deleteEmpleado(emp.codigo).subscribe({
      next: () => {
        this.loadEmpleados();
      },
      error: (err) => {
        alert(err.error?.detail || 'No se pudo eliminar el empleado.');
      },
    });
  }
}
