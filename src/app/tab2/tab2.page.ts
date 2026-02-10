import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { AlertController, IonContent, ModalController } from '@ionic/angular';
import { ReservaService } from '../services/reserva.service';
import type { Reserva } from '../services/reserva.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit, OnDestroy {

  reservas: Reserva[] = [];
  private sub?: Subscription;

  // filtro y busqueda
  searchTerm: string = '';
  statusFilter: 'Todas' | 'Pendiente' | 'Confirmada' | 'Denegada' = 'Todas';

  @ViewChild(IonContent, { static: false }) content!: IonContent;
  showScrollTop: boolean = false;

  constructor(private alertCtrl: AlertController, private modalCtrl: ModalController, private reservaService: ReservaService) {}

  ngOnInit(): void {
    this.sub = this.reservaService.getReservas$().subscribe(list => {
      // mantener expanded = false para consistencia y evitar mutaciones directas
      this.reservas = list.map(r => ({ ...r }));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get filteredReservas(): Reserva[] {
    const term = this.searchTerm?.trim().toLowerCase();
    const results = this.reservas.filter(r => {
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

    // ordenar por número (R-0001 -> 1) ascendente
    const parseNum = (s?: string) => {
      if (!s) return 0;
      const n = parseInt((s.match(/\d+/) || ['0'])[0], 10);
      return isNaN(n) ? 0 : n;
    };

    results.sort((a, b) => parseNum(a.numero) - parseNum(b.numero));
    return results;
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
    this.reservaService.updateReserva(r.numero, { status: 'Confirmada', expanded: false });
  }

  denyReservation(r: Reserva) {
    this.reservaService.updateReserva(r.numero, { status: 'Denegada', expanded: false });
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
    this.reservaService.deleteReserva(r.numero);
  }

  async openNewReservation() {
    const modal = await this.modalCtrl.create({
      component: (await import('../reserva-modal/reserva-modal.component')).ReservaModalComponent,
      componentProps: {}
    });

    modal.onDidDismiss().then((detail) => {
      if (detail?.data?.reserva) {
        const newReserva = detail.data.reserva as Partial<Reserva>;
        this.reservaService.addReserva(newReserva);
      }
    });

    return await modal.present();
  }

  async openEditReservation(r: Reserva) {
    const modal = await this.modalCtrl.create({
      component: (await import('../reserva-modal/reserva-modal.component')).ReservaModalComponent,
      componentProps: { initial: { ...r } }
    });

    modal.onDidDismiss().then((detail) => {
      if (detail?.data?.reserva) {
        const updated = detail.data.reserva as Partial<Reserva>;
        this.reservaService.updateReserva(r.numero, { ...updated, expanded: false });
      }
    });

    return await modal.present();
  }

}
