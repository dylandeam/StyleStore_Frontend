import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductoService } from '../../../../core/services/producto.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Producto, ProductoCreate } from '../../../../core/models/producto.model';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './productos-list.component.html',
  styleUrls: ['./productos-list.component.css'],
})
export class ProductosListComponent implements OnInit {
  private productoService = inject(ProductoService);
  private authService = inject(AuthService);

  get canManage(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'administrador' || role === 'encargado_sucursal';
  }

  productos = signal<Producto[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = '';
  selectedCategory = '';

  // Categories list
  categories = ['Ropa', 'Calzado', 'Accesorios', 'Chaquetas', 'Pantalones', 'Vestidos'];
  sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '36', '38', '40', '42', 'Única'];

  // Modal State
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId: number | null = null;
  isSubmitting = signal<boolean>(false);
  modalError = signal<string>('');
  modalSuccess = signal<string>('');

  formData: ProductoCreate = {
    name: '',
    description: '',
    category: 'Ropa',
    size: 'M',
    color: '',
    price: 0,
    stock: 0,
    active: true,
  };

  ngOnInit(): void {
    this.loadProductos();
  }

  loadProductos(): void {
    this.isLoading.set(true);
    this.productoService
      .getProductos({
        search: this.searchTerm,
        category: this.selectedCategory,
      })
      .subscribe({
        next: (data) => {
          this.productos.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.loadProductos();
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = {
      name: '',
      description: '',
      category: 'Ropa',
      size: 'M',
      color: '',
      price: 0,
      stock: 0,
      active: true,
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  openEditModal(p: Producto): void {
    this.isEditing.set(true);
    this.editingId = p.id;
    this.formData = {
      name: p.name,
      description: p.description || '',
      category: p.category,
      size: p.size,
      color: p.color,
      price: p.price,
      stock: p.stock,
      active: p.active,
    };
    this.modalError.set('');
    this.modalSuccess.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitProducto(): void {
    if (!this.formData.name || !this.formData.category || !this.formData.size || !this.formData.color || this.formData.price <= 0) {
      this.modalError.set('Por favor completa todos los campos obligatorios y asegúrate de que el precio sea mayor a 0.');
      return;
    }

    this.isSubmitting.set(true);
    this.modalError.set('');
    this.modalSuccess.set('');

    if (this.isEditing() && this.editingId) {
      this.productoService.updateProducto(this.editingId, this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Producto actualizado con éxito.');
          this.loadProductos();
          setTimeout(() => this.closeModal(), 1000);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al actualizar producto.');
        },
      });
    } else {
      this.productoService.createProducto(this.formData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.modalSuccess.set('Producto creado con éxito.');
          this.loadProductos();
          setTimeout(() => this.closeModal(), 1000);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.modalError.set(err.error?.detail || 'Error al crear producto.');
        },
      });
    }
  }

  deleteProducto(id: number, name: string): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar el producto "${name}"?`)) {
      return;
    }

    this.productoService.deleteProducto(id).subscribe({
      next: () => {
        this.loadProductos();
      },
      error: (err) => {
        alert(err.error?.detail || 'Error al eliminar producto.');
      },
    });
  }
}
