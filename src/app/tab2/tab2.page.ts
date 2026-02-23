import { Component, ViewChild, OnInit } from '@angular/core';
import { AlertController, IonContent, ModalController, ToastController } from '@ionic/angular';
import { ApiService } from '../services/api'; 
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {

  reservas: any[] = [];
  searchTerm: string = '';
  statusFilter: string = 'Todos'; 

  @ViewChild(IonContent, { static: false }) content!: IonContent;
  showScrollTop: boolean = false;

  // PRECIOS BASE PARA EL TICKET DEL DASHBOARD
  pensionPrices: any = {
    'Sin pensión': 0,
    'Alojamiento y Desayuno': 8,
    'Media Pensión': 18,
    'Pensión Completa': 30,
    'Todo Incluido': 50
  };

  constructor(
    private alertCtrl: AlertController, 
    private modalCtrl: ModalController, 
    private api: ApiService, 
    public auth: AuthService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ionViewWillEnter() {
    this.cargarDatos();
  }

  cargarDatos() {
    const userRole = this.auth.getRole(); 
    
    this.api.getReservas().subscribe({
      next: (list) => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        let filteredList = list;

        if (userRole !== 'jefe') {
          filteredList = list.filter(r => {
            if (!r.fechaSalida) return false;
            const salida = new Date(r.fechaSalida);
            return salida >= hoy; 
          });
        }

        this.reservas = filteredList.map(r => {
          const salida = new Date(r.fechaSalida);
          const esAntigua = salida < hoy;

          let estadoVisual = r.estado || r.status || 'Pendiente';
          if (estadoVisual === 'Confirmada' && esAntigua) {
            estadoVisual = 'Completada';
          }

          return {
            ...r,
            numero: String(r.id ?? r.numero ?? ''),
            status: estadoVisual,
            titular: r.nombreCliente ?? r.titular ?? '-',
            habitacion: r.selectedRoom?.name ?? r.habitacion ?? 'Sin asignar',
            ninos: r.children ?? r.ninos ?? '-',
            adultos: r.adults ?? r.adultos ?? '-',
            precioTotal: r.total ?? r.precioTotal ?? 0,
            pension: r.selectedPension?.name ?? r.pension ?? '-',
            numeroHabitaciones: r.habitaciones ?? r.numeroHabitaciones ?? '-',
            hasAllergies: !!((r.notas && r.notas !== '') || r.passengers?.some((p:any) => p.allergies && p.allergies !== '')),
            alergias: r.notas || (r.passengers?.find((p:any) => p.allergies)?.allergies) || 'No',
            expanded: false,
            showBreakdown: false // Control del ticket individual
          };
        });

        this.reservas.sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime());
      },
      error: (err) => console.error('Error cargando reservas:', err)
    });
  }

  setFilter(filter: string) {
    this.statusFilter = filter;
    this.reservas.forEach(x => {
      x.expanded = false;
      x.showBreakdown = false; // Cerramos tickets si se cambia de filtro
    });
  }

  get filteredReservas(): any[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    let pool = this.reservas;
    const role = this.auth.getRole();

    if (role === 'restaurante') {
      pool = pool.filter(r => (r.status === 'Confirmada' || r.status === 'Completada') && r.hasAllergies);
    }

    const results = pool.filter(r => {
      if (this.statusFilter === 'Todos') {
        if (r.status === 'Completada') return false; 
      } else {
        if (r.status !== this.statusFilter) return false;
      }
      
      if (!term) return true;
      const inTitular = String(r.titular ?? '').toLowerCase().includes(term);
      const inNumero = String(r.numero ?? '').toLowerCase().includes(term);
      return inTitular || inNumero;
    });

    return results;
  }

  // ===============================================
  // LÓGICA DEL TICKET DESPLEGABLE EN EL DASHBOARD
  // ===============================================
  
  toggleBreakdown(r: any, ev: Event) {
    ev.stopPropagation(); 
    r.showBreakdown = !r.showBreakdown;

    // Solo lo calculamos la primera vez que se abre
    if (r.showBreakdown && !r.breakdownData) {
      r.breakdownData = this.calculateBreakdown(r);
    }
  }

  calculateBreakdown(r: any) {
    const ci = new Date(r.fechaEntrada);
    const co = new Date(r.fechaSalida);
    let nights = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0 || isNaN(nights)) nights = 1;

    const guests = (Number(r.adultos) || 0) + (Number(r.ninos) || 0);
    const pensionName = r.pension || 'Sin pensión';
    const pensionPxN = this.pensionPrices[pensionName] || 0;
    const pensionTotal = pensionPxN * guests * nights;

    let roomTotal = 0;
    const roomsInfo: any[] = [];

    if (r.selectedCategories && r.selectedCategories.length > 0) {
      r.selectedCategories.forEach((cat: any) => {
        const t = (cat.price || 0) * (cat.qty || 1) * nights;
        roomTotal += t;
        roomsInfo.push({ name: cat.name, qty: cat.qty || 1, price: cat.price || 0, total: t });
      });
    } else {
      // Deducimos el precio si es una reserva manual a capón
      const currentTotal = Number(r.precioTotal || 0);
      let rp = (currentTotal - pensionTotal) / nights;
      if (rp < 0) rp = 0;
      roomTotal = rp * nights;
      roomsInfo.push({ name: r.habitacion || 'Hab. asignada', qty: r.numeroHabitaciones || 1, price: rp, total: roomTotal });
    }

    const mathTotal = roomTotal + pensionTotal;

    return { nights, guests, pensionName, pensionPxN, pensionTotal, roomsInfo, mathTotal };
  }

  // ===============================================
  // --- ACCIONES ---
  // ===============================================

  async confirmReservation(r: any) {
    if (r.status === 'Pendiente') {
      this.openEditReservation(r);
    } else {
      this.api.updateReserva(r.id, { estado: 'Confirmada' }).subscribe(() => {
        this.showToast('Reserva confirmada');
        this.cargarDatos();
      });
    }
  }

  denyReservation(r: any) {
    this.api.updateReserva(r.id, { estado: 'Denegada' }).subscribe(() => {
      this.showToast('Reserva denegada');
      this.cargarDatos();
    });
  }

  cancelByClient(r: any) {
    this.api.updateReserva(r.id, { estado: 'Cancelada' }).subscribe(() => {
      this.showToast('Reserva cancelada');
      this.cargarDatos();
    });
  }

  reactivateReservation(r: any) {
    this.api.updateReserva(r.id, { estado: 'Confirmada' }).subscribe(() => {
      this.showToast('Reserva reactivada con éxito');
      this.cargarDatos();
    });
  }

  async confirmDeleteReservation(r: any) {
    this.showCustomConfirm(r);
  }

  deleteReservation(r: any) {
    this.api.eliminarReserva(r.id).subscribe(() => {
      this.showToast('Registro eliminado');
      this.cargarDatos();
    });
  }

  showCustomConfirm(r: any) {
    (async () => {
      const alert = await this.alertCtrl.create({
        header: 'Confirmar borrado',
        message: `¿Borrar registro de la reserva ${r.numero}? Esta acción no se puede deshacer.`,
        cssClass: 'custom-delete-alert',
        buttons: [
          { text: 'Cancelar', role: 'cancel', cssClass: 'btn-cancel-green' },
          { text: 'Borrar', cssClass: 'btn-confirm-green', handler: () => { this.deleteReservation(r); } }
        ]
      });
      await alert.present();
    })();
  }

  async openNewReservation() {
    if (this.auth.getRole() === 'restaurante') return; 
    const modal = await this.modalCtrl.create({
      component: (await import('../reserva-modal/reserva-modal.component')).ReservaModalComponent
    });
    modal.onDidDismiss().then((res) => {
      if (res.data?.reserva) {
        this.api.guardarReserva(res.data.reserva).subscribe(() => this.cargarDatos());
      }
    });
    return await modal.present();
  }

  async openEditReservation(r: any) {
    const modal = await this.modalCtrl.create({
      component: (await import('../reserva-modal/reserva-modal.component')).ReservaModalComponent,
      componentProps: { initial: { ...r } }
    });
    modal.onDidDismiss().then((res) => {
      if (res.data?.reserva) {
        this.api.editarReserva(r.id, res.data.reserva).subscribe(() => this.cargarDatos());
      }
    });
    return await modal.present();
  }

  toggleExpand(r: any) {
    // Al abrir otra tarjeta, cerramos las demás y sus tickets
    this.reservas.forEach(x => { 
      if (x !== r) {
        x.expanded = false;
        x.showBreakdown = false; 
      }
    });
    
    r.expanded = !r.expanded;
    if (!r.expanded) r.showBreakdown = false; // Cerramos el ticket si pliega
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString();
  }

  formatCurrency(v?: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v || 0);
  }

  onSearch(ev: any) { this.searchTerm = ev?.detail?.value ?? ''; }

  onContentScroll(ev: any) { this.showScrollTop = (ev?.detail?.scrollTop ?? 0) > 200; }
  scrollToTop() { this.content.scrollToTop(400); }

  async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'dark' });
    t.present();
  }
}