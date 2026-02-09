import { Component } from '@angular/core';
import { AlertController } from '@ionic/angular';

interface Reserva {
  numero: string;
  habitacion: string;
  titular: string;
  fechaEntrada: string; // ISO date or display string
  fechaSalida: string;  // ISO date or display string
  numeroHabitaciones?: number;
  adultos?: number;
  ninos?: number;
  precioTotal?: number;
  pension?: string;
  expanded?: boolean;
  status?: 'Pendiente' | 'Confirmada' | 'Denegada';
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {

  reservas: Reserva[] = [
    {
      numero: 'R-0001',
      habitacion: 'Suite Vista Mar',
      titular: 'María García',
      fechaEntrada: '2026-02-14',
      fechaSalida: '2026-02-18',
      numeroHabitaciones: 1,
      adultos: 2,
      ninos: 0,
      precioTotal: 520.00,
      pension: 'Media Pensión',
      expanded: false
      , status: 'Pendiente'
    },
    {
      numero: 'R-0002',
      habitacion: 'Doble Superior',
      titular: 'Juan Pérez',
      fechaEntrada: '2026-03-01',
      fechaSalida: '2026-03-05',
      numeroHabitaciones: 2,
      adultos: 4,
      ninos: 1,
      precioTotal: 980.00,
      pension: 'Pensión Completa',
      expanded: false,
      status: 'Pendiente'
    },
    {
      numero: 'R-0003',
      habitacion: 'Individual Económica',
      titular: 'Ana López',
      fechaEntrada: '2026-02-20',
      fechaSalida: '2026-02-21',
      numeroHabitaciones: 1,
      adultos: 1,
      ninos: 0,
      precioTotal: 60.00,
      pension: 'Alojamiento y Desayuno',
      expanded: false,
      status: 'Pendiente'
    }
  ];

  // filtro y busqueda
  searchTerm: string = '';
  statusFilter: 'Todos' | 'Pendiente' | 'Confirmada' | 'Denegada' = 'Todos';

  constructor(private alertCtrl: AlertController) {}

  get filteredReservas(): Reserva[] {
    const term = this.searchTerm?.trim().toLowerCase();
    return this.reservas.filter(r => {
      // filtro por estado
      if (this.statusFilter && this.statusFilter !== 'Todos') {
        if (r.status !== this.statusFilter) return false;
      }
      // busqueda por titular o numero
      if (!term) return true;
      const inTitular = r.titular?.toLowerCase().includes(term);
      const inNumero = r.numero?.toLowerCase().includes(term);
      return Boolean(inTitular || inNumero);
    });
  }

  toggleExpand(r: Reserva) {
    // cerrar otras reservas
    this.reservas.forEach(x => {
      if (x !== r) x.expanded = false;
    });
    // alternar la actual
    r.expanded = !r.expanded;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString();
  }

  formatCurrency(v?: number): string {
    if (v == null) return '-';
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v);
  }

  onSearch(ev: any) {
    this.searchTerm = ev?.detail?.value ?? '';
    // cerrar cualquier reserva expandida al buscar
    this.reservas.forEach(x => x.expanded = false);
  }

  onFilter(ev: any) {
    this.statusFilter = ev?.detail?.value ?? 'Todos';
    // cerrar cualquier reserva expandida al cambiar filtro
    this.reservas.forEach(x => x.expanded = false);
  }

  // Maneja el refresher pull-to-refresh
  doRefresh(ev: any) {
    // Simular refresco: aquí podrías volver a cargar datos desde API
    setTimeout(() => {
      // ejemplo: cerrar expansiones y limpiar búsqueda/segmento
      this.reservas.forEach(x => x.expanded = false);
      this.searchTerm = '';
      this.statusFilter = 'Todos';
      // completar el refresher
      if (ev?.target && typeof ev.target.complete === 'function') {
        ev.target.complete();
      } else if (ev?.detail && typeof ev.detail.complete === 'function') {
        ev.detail.complete();
      }
    }, 800);
  }

  confirmReservation(r: Reserva) {
    r.status = 'Confirmada';
    r.expanded = false;
  }

  denyReservation(r: Reserva) {
    r.status = 'Denegada';
    r.expanded = false;
  }

  async confirmDeleteReservation(r: Reserva) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar borrado',
      message: `¿Borrar reserva ${r.numero}? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Borrar',
          handler: () => this.deleteReservation(r)
        }
      ]
    });
    await alert.present();
  }

  deleteReservation(r: Reserva) {
    this.reservas = this.reservas.filter(x => x !== r);
  }

}
