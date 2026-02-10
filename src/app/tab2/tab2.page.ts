import { Component, ViewChild } from '@angular/core';
import { AlertController, IonContent } from '@ionic/angular';

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
  mascota?: boolean;
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
      mascota: true,
      expanded: false,
      status: 'Pendiente'
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
      mascota: false,
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
      mascota: false,
      expanded: false,
      status: 'Pendiente'
    }
    ,
    {
      numero: 'R-0004',
      habitacion: 'Familiar Deluxe',
      titular: 'Carlos Martínez',
      fechaEntrada: '2026-04-10',
      fechaSalida: '2026-04-15',
      numeroHabitaciones: 2,
      adultos: 2,
      ninos: 2,
      precioTotal: 760.00,
      pension: 'Media Pensión',
      mascota: true,
      expanded: false,
      status: 'Confirmada'
    },
    {
      numero: 'R-0005',
      habitacion: 'Suite Nupcial',
      titular: 'Lucía Fernández',
      fechaEntrada: '2026-05-20',
      fechaSalida: '2026-05-25',
      numeroHabitaciones: 1,
      adultos: 2,
      ninos: 0,
      precioTotal: 1250.00,
      pension: 'Pensión Completa',
      mascota: false,
      expanded: false,
      status: 'Pendiente'
    },
    {
      numero: 'R-0006',
      habitacion: 'Doble Económica',
      titular: 'Roberto Díaz',
      fechaEntrada: '2026-03-12',
      fechaSalida: '2026-03-13',
      numeroHabitaciones: 1,
      adultos: 1,
      ninos: 0,
      precioTotal: 45.00,
      pension: 'Alojamiento',
      mascota: true,
      expanded: false,
      status: 'Denegada'
    },
    {
      numero: 'R-0007',
      habitacion: 'Apartamento',
      titular: 'Sofía Ruiz',
      fechaEntrada: '2026-06-01',
      fechaSalida: '2026-06-07',
      numeroHabitaciones: 1,
      adultos: 3,
      ninos: 1,
      precioTotal: 1340.00,
      pension: 'Media Pensión',
      mascota: false,
      expanded: false,
      status: 'Confirmada'
    },
    {
      numero: 'R-0008',
      habitacion: 'Suite Ejecutiva',
      titular: 'Empresa XYZ',
      fechaEntrada: '2026-07-10',
      fechaSalida: '2026-07-12',
      numeroHabitaciones: 2,
      adultos: 4,
      ninos: 0,
      precioTotal: 2100.00,
      pension: 'Pensión Completa',
      mascota: false,
      expanded: false,
      status: 'Pendiente'
    }
  ];

  // filtro y busqueda
  searchTerm: string = '';
  statusFilter: 'Todas' | 'Pendiente' | 'Confirmada' | 'Denegada' = 'Todas';

  @ViewChild(IonContent, { static: false }) content!: IonContent;
  showScrollTop: boolean = false;

  constructor(private alertCtrl: AlertController) {}

  get filteredReservas(): Reserva[] {
    const term = this.searchTerm?.trim().toLowerCase();
    return this.reservas.filter(r => {
      // filtro por estado
      if (this.statusFilter && this.statusFilter !== 'Todas') {
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

  onContentScroll(ev: any) {
    const y = ev?.detail?.scrollTop ?? 0;
    this.showScrollTop = y > 200;
  }

  scrollToTop() {
    if (this.content && typeof this.content.scrollToTop === 'function') {
      this.content.scrollToTop(400);
    }
  }

  // Maneja el refresher pull-to-refresh
  doRefresh(ev: any) {
    // Simular refresco: aquí podrías volver a cargar datos desde API
    setTimeout(() => {
      // ejemplo: cerrar expansiones y limpiar búsqueda/segmento
      this.reservas.forEach(x => x.expanded = false);
      this.searchTerm = '';
      this.statusFilter = 'Todas';
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
    // Mostrar confirmación usando un overlay DOM propio (evita problemas de estilos en ion-alert)
    this.showCustomConfirm(r);
  }

  // Crea un overlay simple y manejable por DOM para confirmar eliminación
  showCustomConfirm(r: Reserva) {
    // evitar múltiples overlays
    if (document.getElementById('custom-delete-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'custom-delete-overlay';
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '99999';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.background = 'rgba(0,0,0,0.12)';

    const card = document.createElement('div');
    card.style.width = 'min(92%,480px)';
    card.style.background = '#fff';
    card.style.borderRadius = '10px';
    card.style.padding = '18px';
    card.style.boxShadow = '0 20px 60px rgba(0,0,0,0.25)';
    card.style.color = '#0b3d2e';

    const title = document.createElement('h3');
    title.textContent = 'Confirmar borrado';
    title.style.margin = '0 0 10px 0';
    title.style.color = '#0b3d2e';

    const msg = document.createElement('p');
    msg.textContent = `¿Borrar reserva ${r.numero}? Esta acción no se puede deshacer.`;
    msg.style.margin = '0 0 18px 0';
    msg.style.color = 'rgba(11,61,46,0.9)';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '10px';
    actions.style.justifyContent = 'flex-end';

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancelar';
    btnCancel.style.background = '#fff';
    btnCancel.style.border = '1px solid rgba(16,185,129,0.12)';
    btnCancel.style.color = '#10b981';
    btnCancel.style.padding = '8px 14px';
    btnCancel.style.borderRadius = '8px';
    btnCancel.style.cursor = 'pointer';

    const btnConfirm = document.createElement('button');
    btnConfirm.textContent = 'Borrar';
    btnConfirm.style.background = '#fff';
    btnConfirm.style.border = '1px solid rgba(231,76,60,0.12)';
    btnConfirm.style.color = '#e53935';
    btnConfirm.style.padding = '8px 14px';
    btnConfirm.style.borderRadius = '8px';
    btnConfirm.style.cursor = 'pointer';

    actions.appendChild(btnCancel);
    actions.appendChild(btnConfirm);

    card.appendChild(title);
    card.appendChild(msg);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const cleanup = () => {
      try { document.body.removeChild(overlay); } catch(e) {}
    };

    btnCancel.addEventListener('click', () => cleanup());
    btnConfirm.addEventListener('click', () => {
      this.deleteReservation(r);
      cleanup();
    });
    // cerrar al hacer click fuera del card
    overlay.addEventListener('click', (ev) => {
      if (ev.target === overlay) cleanup();
    });
  }

  deleteReservation(r: Reserva) {
    this.reservas = this.reservas.filter(x => x !== r);
  }

}
