import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BitacoraService } from '../../../../core/services/bitacora.service';
import { Bitacora } from '../../../../core/models/bitacora.model';

@Component({
  selector: 'app-bitacora-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bitacora-list.component.html',
  styleUrls: ['./bitacora-list.component.css'],
})
export class BitacoraListComponent implements OnInit {
  private bitacoraService = inject(BitacoraService);

  logs = signal<Bitacora[]>([]);
  isLoading = signal<boolean>(false);
  isUnlocked = signal<boolean>(false);
  masterKeyInput = '';
  unlockError = signal<string>('');
  unlocking = signal<boolean>(false);

  // Filters
  userFilter = '';
  moduleFilter = '';
  page = 1;
  pageSize = 15;
  total = signal<number>(0);
  pages = signal<number>(1);

  ngOnInit(): void {
    // La bitácora permanece bloqueada hasta ingresar la llave
  }

  desbloquearBitacora(): void {
    if (!this.masterKeyInput.trim()) {
      this.unlockError.set('Por favor ingresa la llave de seguridad.');
      return;
    }

    this.unlocking.set(true);
    this.unlockError.set('');

    this.bitacoraService.verificarLlave(this.masterKeyInput).subscribe({
      next: (res) => {
        this.unlocking.set(false);
        if (res.valid) {
          this.isUnlocked.set(true);
          this.loadLogs();
        } else {
          this.unlockError.set(res.message || 'Llave incorrecta.');
        }
      },
      error: () => {
        this.unlocking.set(false);
        this.unlockError.set('Error al validar la llave de seguridad.');
      },
    });
  }

  bloquearBitacora(): void {
    this.isUnlocked.set(false);
    this.masterKeyInput = '';
    this.unlockError.set('');
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.bitacoraService
      .getLogs({
        user: this.userFilter,
        module: this.moduleFilter,
        page: this.page,
        size: this.pageSize,
      })
      .subscribe({
        next: (data) => {
          this.logs.set(data.items);
          this.total.set(data.total);
          this.pages.set(data.pages);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadLogs();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.pages()) {
      this.page = p;
      this.loadLogs();
    }
  }

  getModuleBadgeClass(module?: string | null): string {
    switch (module?.toLowerCase()) {
      case 'auth':
        return 'badge-auth';
      case 'usuarios':
        return 'badge-users';
      case 'sucursales':
        return 'badge-branches';
      case 'productos':
        return 'badge-products';
      case 'roles':
        return 'badge-roles';
      default:
        return 'badge-default';
    }
  }
}
