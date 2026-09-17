import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BackupsService, BackupItem, BackupConfig, RestoreResponse } from '../../../core/services/backups.service';

@Component({
  selector: 'app-backups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './backups.component.html',
  styleUrls: ['./backups.component.css'],
})
export class BackupsComponent implements OnInit {
  private backupsService = inject(BackupsService);
  private cdr = inject(ChangeDetectorRef);

  backups: BackupItem[] = [];
  loading: boolean = true;
  generando: boolean = false;
  guardandoConfig: boolean = false;
  restaurando: boolean = false;
  verificandoId: number | null = null;
  eliminandoId: number | null = null;
  restaurandoId: number | null = null;

  // Toast
  mensajeToast: string | null = null;
  toastType: 'success' | 'error' | 'info' = 'info';

  // Configuración Automática
  auto_backup_enabled: boolean = false;
  frequency_hours: number = 24;
  retention_days: number = 30;
  last_auto_backup: string | null = null;

  // Restauración desde archivo local subido
  selectedFile: File | null = null;
  fileError: string | null = null;

  // Modales de Confirmación
  backupToRestore: BackupItem | null = null;
  showUploadRestoreModal: boolean = false;
  restoreSuccessData: RestoreResponse | null = null;

  // Verificación de integridad
  resultadoVerificacion: { [key: number]: { valido: boolean; mensaje: string } } = {};

  frecuenciaOpciones = [
    { value: 6, label: 'Cada 6 horas' },
    { value: 12, label: 'Cada 12 horas' },
    { value: 24, label: 'Cada 24 horas (Diario - Recomendado)' },
    { value: 48, label: 'Cada 48 horas' },
    { value: 168, label: 'Cada 7 días (Semanal)' },
  ];

  ngOnInit(): void {
    this.cargarBackups();
    this.cargarConfig();
  }

  cargarBackups(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.backupsService.listarBackups().subscribe({
      next: (data) => {
        this.backups = data;
        this.loading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.mostrarToast('Error al cargar la lista de respaldos del servidor.', 'error');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  cargarConfig(): void {
    this.backupsService.getConfig().subscribe({
      next: (cfg: BackupConfig) => {
        this.auto_backup_enabled = cfg.auto_backup_enabled;
        this.frequency_hours = cfg.frequency_hours;
        this.retention_days = cfg.retention_days;
        this.last_auto_backup = cfg.last_auto_backup;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        // En caso de que aún no exista o falle, mantener defaults seguros
      },
    });
  }

  guardarConfig(): void {
    this.guardandoConfig = true;
    this.cdr.markForCheck();
    this.backupsService
      .updateConfig({
        auto_backup_enabled: this.auto_backup_enabled,
        frequency_hours: Number(this.frequency_hours),
        retention_days: Number(this.retention_days),
      })
      .subscribe({
        next: (cfg) => {
          this.guardandoConfig = false;
          this.auto_backup_enabled = cfg.auto_backup_enabled;
          this.frequency_hours = cfg.frequency_hours;
          this.retention_days = cfg.retention_days;
          this.mostrarToast('Configuración de respaldos automáticos guardada correctamente.', 'success');
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: () => {
          this.guardandoConfig = false;
          this.mostrarToast('Error al guardar la configuración de periodicidad.', 'error');
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
      });
  }

  generarBackup(): void {
    this.generando = true;
    this.cdr.markForCheck();
    this.backupsService.generarBackup().subscribe({
      next: (res) => {
        this.generando = false;
        this.mostrarToast(`¡Respaldo integral generado con éxito! Archivo: ${res.nombre_archivo}`, 'success');
        this.cargarBackups();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.generando = false;
        this.mostrarToast('Error al generar la copia de seguridad.', 'error');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileError = null;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!file.name.toLowerCase().endsWith('.json')) {
        this.fileError = 'Solo se permiten archivos de copia de seguridad con extensión .json.';
        this.selectedFile = null;
        input.value = '';
        return;
      }
      this.selectedFile = file;
    }
  }

  limpiarArchivo(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedFile = null;
    this.fileError = null;
    const input = document.getElementById('jsonFileInput') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  // --- Modal de Restaurar desde el Servidor ---
  abrirModalRestaurarServidor(b: BackupItem): void {
    this.backupToRestore = b;
  }

  cerrarModalRestaurarServidor(): void {
    this.backupToRestore = null;
  }

  confirmarRestaurarServidor(): void {
    if (!this.backupToRestore) return;
    const id = this.backupToRestore.id;
    this.restaurandoId = id;
    this.restaurando = true;
    this.cdr.markForCheck();
    this.backupsService.restaurarDesdeServidor(id).subscribe({
      next: (res) => {
        this.restaurando = false;
        this.restaurandoId = null;
        this.backupToRestore = null;
        this.restoreSuccessData = res;
        this.mostrarToast('Base de datos restaurada integralmente con éxito.', 'success');
        this.cargarBackups();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.restaurando = false;
        this.restaurandoId = null;
        const msg = err?.error?.detail || 'Error crítico al restaurar la copia de seguridad.';
        this.mostrarToast(msg, 'error');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  // --- Modal de Restaurar desde Archivo Subido ---
  abrirModalRestaurarUpload(): void {
    if (!this.selectedFile) {
      this.mostrarToast('Por favor selecciona primero un archivo .json de respaldo.', 'error');
      return;
    }
    this.showUploadRestoreModal = true;
  }

  cerrarModalRestaurarUpload(): void {
    this.showUploadRestoreModal = false;
  }

  confirmarRestaurarUpload(): void {
    if (!this.selectedFile) return;
    this.restaurando = true;
    this.cdr.markForCheck();
    this.backupsService.subirYRestaurar(this.selectedFile).subscribe({
      next: (res) => {
        this.restaurando = false;
        this.showUploadRestoreModal = false;
        this.selectedFile = null;
        this.restoreSuccessData = res;
        this.mostrarToast('¡Archivo verificado y base de datos restaurada con éxito!', 'success');
        this.cargarBackups();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.restaurando = false;
        const msg = err?.error?.detail || 'Error al restaurar desde el archivo cargado. Verifique el formato e integridad SHA-256.';
        this.mostrarToast(msg, 'error');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  cerrarModalExito(): void {
    this.restoreSuccessData = null;
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
        this.mostrarToast(`Descarga iniciada: ${item.nombre_archivo}`, 'success');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.mostrarToast('Error al descargar el archivo de respaldo.', 'error');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  eliminar(item: BackupItem): void {
    if (!confirm(`¿Eliminar definitivamente el respaldo '${item.nombre_archivo}' del servidor?`)) {
      return;
    }
    this.eliminandoId = item.id;
    this.cdr.markForCheck();
    this.backupsService.eliminarBackup(item.id).subscribe({
      next: () => {
        this.eliminandoId = null;
        this.mostrarToast('Copia de seguridad eliminada del historial y del servidor.', 'info');
        this.cargarBackups();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.eliminandoId = null;
        this.mostrarToast('Error al eliminar la copia de seguridad.', 'error');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  verificar(item: BackupItem): void {
    this.verificandoId = item.id;
    this.cdr.markForCheck();
    this.backupsService.verificarIntegridad(item.id, item.sha256_hash).subscribe({
      next: (res) => {
        this.verificandoId = null;
        this.resultadoVerificacion[item.id] = {
          valido: res.es_valido,
          mensaje: res.mensaje,
        };
        this.mostrarToast(res.mensaje, res.es_valido ? 'success' : 'error');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.verificandoId = null;
        this.resultadoVerificacion[item.id] = {
          valido: false,
          mensaje: 'Error de verificación en el servidor.',
        };
        this.mostrarToast('Error al verificar hash en el servidor.', 'error');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
    });
  }

  copiarHash(hash: string): void {
    navigator.clipboard.writeText(hash);
    this.mostrarToast('Checksum SHA-256 copiado al portapapeles.', 'info');
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  mostrarToast(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.mensajeToast = msg;
    this.toastType = type;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    setTimeout(() => {
      this.mensajeToast = null;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 4000);
  }
}
