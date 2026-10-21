import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EstadoReembolso, ReembolsoOffline, ReembolsosService } from '../../../core/services/reembolsos.service';

@Component({
  selector: 'app-reembolsos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reembolsos.component.html',
  styleUrl: './reembolsos.component.css',
})
export class ReembolsosComponent implements OnInit {
  private readonly service = inject(ReembolsosService);
  items: ReembolsoOffline[] = [];
  filtro: EstadoReembolso | '' = 'pendiente';
  loading = true;
  error = '';
  selected: ReembolsoOffline | null = null;
  accion: 'entregado' | 'cancelado' = 'entregado';
  observaciones = '';
  saving = false;
  success = '';

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.loading = true;
    this.error = '';
    this.service.listar(this.filtro || undefined).subscribe({
      next: data => { this.items = data; this.loading = false; },
      error: err => { this.error = err?.error?.detail || 'No se pudieron cargar los reembolsos.'; this.loading = false; },
    });
  }

  abrir(item: ReembolsoOffline, accion: 'entregado' | 'cancelado'): void {
    this.selected = item;
    this.accion = accion;
    this.observaciones = accion === 'entregado' ? 'Efectivo devuelto y verificado con el cliente.' : '';
  }

  cerrar(): void { if (!this.saving) this.selected = null; }

  confirmar(): void {
    if (!this.selected || this.observaciones.trim().length < 3) return;
    this.saving = true;
    this.service.resolver(this.selected.id, this.accion, this.observaciones.trim()).subscribe({
      next: () => {
        this.success = `Reembolso #${this.selected?.id} actualizado correctamente.`;
        this.saving = false;
        this.selected = null;
        this.cargar();
        setTimeout(() => this.success = '', 4000);
      },
      error: err => { this.error = err?.error?.detail || 'No se pudo actualizar el reembolso.'; this.saving = false; },
    });
  }

  pendientes(): number { return this.items.filter(item => item.estado === 'pendiente').length; }
}
