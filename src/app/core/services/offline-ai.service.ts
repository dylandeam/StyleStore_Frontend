import { Injectable } from '@angular/core';

interface OfflineSnapshot {
  tenant_id: number;
  datos_actualizados_en: string;
  contexto: any;
}

@Injectable({ providedIn: 'root' })
export class OfflineAiService {
  private key(tenantId: number): string {
    return `stylestore_ai_snapshot_tenant_${tenantId}`;
  }

  save(snapshot: OfflineSnapshot): void {
    if (!snapshot?.tenant_id || !snapshot?.contexto) return;
    localStorage.setItem(this.key(snapshot.tenant_id), JSON.stringify(snapshot));
  }

  get(tenantId: number): OfflineSnapshot | null {
    try {
      const raw = localStorage.getItem(this.key(tenantId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  answer(question: string, tenantId: number): any | null {
    const snapshot = this.get(tenantId);
    if (!snapshot) return null;
    const ctx = snapshot.contexto;
    const query = question.toLocaleLowerCase('es');
    let response = '';
    let kpis: Array<{ label: string; valor: string }> = [];

    if (['delivery', 'envío', 'envio', 'despacho'].some((word) => query.includes(word))) {
      const delivery = ctx.delivery || {};
      response = `Reporte local de delivery:\n• Pedidos hoy: ${delivery.total_hoy || 0}\n• Entregados: ${delivery.entregados_hoy || 0}\n• En camino: ${delivery.en_camino_hoy || 0}\n• Pendientes: ${delivery.pendientes_hoy || 0}\n• Tarifas: Bs. ${Number(delivery.recaudado_tarifas_hoy || 0).toFixed(2)}`;
      kpis = [{ label: 'Delivery hoy', valor: String(delivery.total_hoy || 0) }, { label: 'Entregados', valor: String(delivery.entregados_hoy || 0) }];
    } else if (['stock', 'inventario', 'agotad'].some((word) => query.includes(word))) {
      const critical: string[] = ctx.inventario_critico || [];
      response = critical.length
        ? `Inventario crítico guardado localmente:\n${critical.slice(0, 12).map((item) => `• ${item}`).join('\n')}`
        : 'El último corte guardado no registró prendas con stock crítico.';
      kpis = [{ label: 'Stock crítico', valor: String(critical.length) }];
    } else if (['sucursal', 'tienda'].some((word) => query.includes(word))) {
      const branches: any[] = ctx.sucursales || [];
      response = `Resumen local por sucursal:\n${branches.map((branch) => `• ${branch.nombre}: hoy Bs. ${Number(branch.recaudado_hoy || 0).toFixed(2)} | mes Bs. ${Number(branch.recaudado_mes || 0).toFixed(2)}`).join('\n') || 'Sin sucursales en el último corte.'}`;
      kpis = [{ label: 'Sucursales', valor: String(branches.length) }];
    } else if (['pago', 'paypal', 'efectivo', 'qr'].some((word) => query.includes(word))) {
      const payments = Object.entries(ctx.pagos_hoy || {});
      response = `Métodos de pago del último corte:\n${payments.map(([method, amount]) => `• ${method}: Bs. ${Number(amount).toFixed(2)}`).join('\n') || 'Sin pagos registrados.'}`;
      kpis = [{ label: 'Canales', valor: String(payments.length) }];
    } else {
      const sales = ctx.ventas_hoy || {};
      response = `Resumen ejecutivo local (${ctx.fecha_actual_legible || 'último corte'}):\n• Recaudación: Bs. ${Number(sales.total_bs || 0).toFixed(2)}\n• Órdenes: ${sales.cantidad_ordenes || 0}\n• Prendas: ${sales.total_prendas || 0}\n• Total del mes: Bs. ${Number(ctx.recaudacion_mes_total || 0).toFixed(2)}`;
      kpis = [{ label: 'Ventas', valor: `Bs. ${Number(sales.total_bs || 0).toFixed(2)}` }, { label: 'Prendas', valor: String(sales.total_prendas || 0) }];
    }

    return {
      respuesta: response,
      kpis,
      modo_ia: 'offline_local',
      proveedor_ia: 'motor_local_del_navegador',
      datos_actualizados_en: snapshot.datos_actualizados_en,
    };
  }
}
