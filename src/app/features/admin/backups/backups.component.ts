import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackupsService, BackupItem } from '../../../core/services/backups.service';

@Component({
  selector: 'app-backups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './backups.component.html',
  styleUrls: ['./backups.component.css'],
})
export class BackupsComponent implements OnInit {
  private backupsService = inject(BackupsService);

  backups: BackupItem[] = [];
  loading: boolean = true;
  generando: boolean = false;
  verificandoId: number | null = null;
  mensajeToast: string | null = null;

  // Verificación de integridad
  resultadoVerificacion: { [key: number]: { valido: boolean; mensaje: string } } = {};

  ngOnInit(): void {
    this.cargarBackups();
  }

  cargarBackups(): void {
    this.loading = true;
    this.backupsService.listarBackups().subscribe({
      next: (data) => {
        this.backups = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.mostrarToast('Error al cargar la lista de respaldos.');
      },
    });
  }

  generarBackup(): void {
    this.generando = true;
    this.backupsService.generarBackup().subscribe({
      next: (res) => {
        this.generando = false;
        this.mostrarToast(`¡Respaldo generado con éxito! Hash SHA-256: ${res.sha256_hash.substring(0, 10)}...`);
        this.cargarBackups();
      },
      error: () => {
        this.generando = false;
        this.mostrarToast('Error al generar la copia de seguridad.');
      },
    });
  }

  descargar(item: BackupItem): void {
    this.backupsService.descargarBackup(item.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.nombre_archivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.mostrarToast(`Descarga iniciada: ${item.nombre_archivo}`);
      },
      error: () => {
        this.mostrarToast('Error al descargar el archivo de respaldo.');
      },
    });
  }

  verificar(item: BackupItem): void {
    this.verificandoId = item.id;
    this.backupsService.verificarIntegridad(item.id, item.sha256_hash).subscribe({
      next: (res) => {
        this.verificandoId = null;
        this.resultadoVerificacion[item.id] = {
          valido: res.es_valido,
          mensaje: res.mensaje,
        };
        this.mostrarToast(res.mensaje);
      },
      error: () => {
        this.verificandoId = null;
        this.resultadoVerificacion[item.id] = {
          valido: false,
          mensaje: 'Error de verificación en el servidor.',
        };
      },
    });
  }

  copiarHash(hash: string): void {
    navigator.clipboard.writeText(hash);
    this.mostrarToast('Hash SHA-256 copiado al portapapeles.');
  }

  mostrarToast(msg: string): void {
    this.mensajeToast = msg;
    setTimeout(() => {
      this.mensajeToast = null;
    }, 3500);
  }
}
