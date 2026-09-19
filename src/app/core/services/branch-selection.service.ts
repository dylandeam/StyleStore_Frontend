import { Injectable, inject, signal, computed } from '@angular/core';
import { SucursalService } from './sucursal.service';
import { Sucursal } from '../models/sucursal.model';

@Injectable({
  providedIn: 'root',
})
export class BranchSelectionService {
  private sucursalService = inject(SucursalService);

  private readonly STORAGE_KEY = 'stylestore_selected_branch';

  // Estados reactivos
  selectedSucursalState = signal<Sucursal | null>(null);
  isAllBranchesState = signal<boolean>(false);
  isSelectionMadeState = signal<boolean>(false);
  isModalOpenState = signal<boolean>(false);

  // Getters computados
  selectedSucursal = computed(() => this.selectedSucursalState());
  isAllBranches = computed(() => this.isAllBranchesState());
  isSelectionMade = computed(() => this.isSelectionMadeState());
  isModalOpen = computed(() => this.isModalOpenState());

  // Nombre legible de la selección actual
  displayName = computed(() => {
    if (this.isAllBranchesState()) {
      return 'Todas las Sucursales';
    }
    const s = this.selectedSucursalState();
    return s ? `${s.name} (${s.city})` : 'Sin seleccionar';
  });

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        if (stored === 'ALL') {
          this.isAllBranchesState.set(true);
          this.selectedSucursalState.set(null);
          this.isSelectionMadeState.set(true);
        } else {
          const parsed = JSON.parse(stored) as Sucursal;
          if (parsed && parsed.id) {
            this.selectedSucursalState.set(parsed);
            this.isAllBranchesState.set(false);
            this.isSelectionMadeState.set(true);
          }
        }
      }
    } catch {
      // Ignorar errores de parseo de localStorage
    }
  }

  selectSucursal(sucursal: Sucursal | null): void {
    if (sucursal === null) {
      // Ver de todas las sucursales
      this.isAllBranchesState.set(true);
      this.selectedSucursalState.set(null);
      this.isSelectionMadeState.set(true);
      try {
        localStorage.setItem(this.STORAGE_KEY, 'ALL');
      } catch {}
    } else {
      this.selectedSucursalState.set(sucursal);
      this.isAllBranchesState.set(false);
      this.isSelectionMadeState.set(true);
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sucursal));
      } catch {}
    }
    this.closeModal();
  }

  clearSelection(): void {
    this.selectedSucursalState.set(null);
    this.isAllBranchesState.set(false);
    this.isSelectionMadeState.set(false);
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {}
  }

  openModal(): void {
    this.isModalOpenState.set(true);
  }

  closeModal(): void {
    this.isModalOpenState.set(false);
  }

  getSucursalId(): number | undefined {
    return this.selectedSucursalState()?.id;
  }
}
