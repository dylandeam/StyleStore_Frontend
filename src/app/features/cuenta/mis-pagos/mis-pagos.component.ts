import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PagosService } from '../../../core/services/pagos.service';

@Component({
  selector: 'app-mis-pagos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mis-pagos.component.html',
  styleUrls: ['./mis-pagos.component.css'],
})
export class MisPagosComponent implements OnInit {
  private pagosService = inject(PagosService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  pagos: any[] = [];
  selectedRecibo: any = null;
  loadingRecibo = false;
  showReciboModal = false;

  ngOnInit(): void {
    this.cargarPagos();
  }

  cargarPagos(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.pagosService.getMisPagos().subscribe({
      next: (data) => {
        this.pagos = data || [];
        this.loading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar pagos:', err);
        this.loading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  verRecibo(pagoId: number): void {
    this.loadingRecibo = true;
    this.showReciboModal = true;
    this.cdr.markForCheck();

    this.pagosService.getRecibo(pagoId).subscribe({
      next: (recibo) => {
        this.selectedRecibo = recibo;
        this.loadingRecibo = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar recibo:', err);
        this.loadingRecibo = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  cerrarRecibo(): void {
    this.showReciboModal = false;
    this.selectedRecibo = null;
    this.cdr.markForCheck();
  }

  imprimirRecibo(): void {
    window.print();
  }
}
