import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../../core/services/empleados.service';
import { SucursalService } from '../../../../core/services/sucursal.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UploadService } from '../../../../core/services/upload.service';
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
  private uploadService = inject(UploadService);

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
  isUploadingFoto = signal<boolean>(false);
  fotoPreview = signal<string>('');

  formData: EmpleadoCreate = {
    nombre: '',
    apellido: '',
    ci: '',
    email: '',
    password: '',
    sucursal_id: 0,
    edad: '' as any,
    sueldo: '' as any,
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
    this.fotoPreview.set('');
    const defaultSucursal = this.sucursales().length > 0 ? this.sucursales()[0].id : 0;
    this.formData = {
      nombre: '',
      apellido: '',
      ci: '',
      email: '',
      password: '',
      role: 'encargado_sucursal',
      sucursal_id: defaultSucursal,
      edad: '' as any,
      sueldo: '' as any,
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
    this.fotoPreview.set(emp.foto ? this.uploadService.getImageUrl(emp.foto) : '');
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
    this.fotoPreview.set('');
  }

  onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.modalError.set('Formato no permitido. Solo se admiten archivos PNG, JPG o WEBP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.modalError.set('El tamaño de la imagen no debe superar los 5 MB.');
      return;
    }

    // Previsualización local inmediata
    const reader = new FileReader();
    reader.onload = (e) => {
      this.fotoPreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Subir al backend
    this.isUploadingFoto.set(true);
    this.modalError.set('');
    this.uploadService.uploadImage(file, 'empleados').subscribe({
      next: (res) => {
        this.formData.foto = res.url;
        this.fotoPreview.set(this.uploadService.getImageUrl(res.url));
        this.isUploadingFoto.set(false);
      },
      error: (err) => {
        this.isUploadingFoto.set(false);
        const detail = err.error?.detail || 'Error al subir la imagen del empleado.';
        this.modalError.set(typeof detail === 'string' ? detail : JSON.stringify(detail));
      },
    });
  }

  removeFoto(): void {
    this.formData.foto = '';
    this.fotoPreview.set('');
  }

  getFotoUrl(foto?: string | null): string {
    return this.uploadService.getImageUrl(foto, 'empleados');
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      if (img.parentElement) {
        img.parentElement.innerText = '👤';
      }
    }
  }

  getRoleBadgeClass(role?: string | null): string {
    switch (role) {
      case 'administrador':
        return 'admin';
      case 'encargado_sucursal':
        return 'encargado';
      case 'cajero':
        return 'cajero';
      default:
        return 'encargado';
    }
  }

  getRoleLabel(role?: string | null): string {
    switch (role) {
      case 'administrador':
        return 'Administrador';
      case 'encargado_sucursal':
        return 'Encargado de Sucursal';
      case 'cajero':
        return 'Cajero';
      default:
        return role || 'Personal';
    }
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
        role: this.formData.role,
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
