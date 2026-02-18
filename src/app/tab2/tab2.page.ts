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

        // 1. FILTRO DE SEGURIDAD (Solo el Jefe ve el historial)
        if (userRole !== 'jefe') {
          filteredList = list.filter(r => {
            if (!r.fechaSalida) return false;
            const salida = new Date(r.fechaSalida);
            return salida >= hoy; // Solo activas o futuras
          });
        }

        // 2. MAPEO Y ETIQUETA "COMPLETADA"
        this.reservas = filteredList.map(r => {
          const salida = new Date(r.fechaSalida);
          const esAntigua = salida < hoy;

          // Si estaba confirmada y ya pasó la fecha -> "Completada"
          let estadoVisual = r.estado;
          if (r.estado === 'Confirmada' && esAntigua) {
            estadoVisual = 'Completada';
          }

          return {
            ...r,
            numero: r.id, 
            status: estadoVisual,
            titular: r.nombreCliente,
            habitacion: r.selectedRoom?.name || 'Sin asignar',
            ninos: r.children,
            adultos: r.adults,
            precioTotal: r.total,
            pension: r.selectedPension?.name,
            numeroHabitaciones: r.habitaciones,
            hasAllergies: (r.notas && r.notas !== '') || r.passengers?.some((p:any) => p.allergies && p.allergies !== ''),
            alergias: r.notas || (r.passengers?.find((p:any) => p.allergies)?.allergies) || 'No',
            expanded: false
          };
        });

        // 3. ORDENAR: Las más recientes (o próximas entradas) primero
        this.reservas.sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime());
      },
      error: (err) => console.error('Error cargando reservas:', err)
    });
  }

  get filteredReservas(): any[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    let pool = this.reservas;
    const role = this.auth.getRole();

    // Filtros por Rol
    if (role === 'restaurante') {
      pool = pool.filter(r => (r.status === 'Confirmada' || r.status === 'Completada') && r.hasAllergies);
    }

    const results = pool.filter(r => {
      // --- LÓGICA DE FILTRADO EXCLUSIVO ---
      
      if (this.statusFilter === 'Todos') {
        // En "Todos", excluimos explícitamente las Completadas
        if (r.status === 'Completada') return false;
      } else {
        // En cualquier otra pestaña (Pendiente, Confirmada, Denegada, Completada)
        // debe coincidir exactamente el estado.
        if (r.status !== this.statusFilter) return false;
      }
      
      // Buscador de texto
      if (!term) return true;
      const inTitular = r.titular?.toLowerCase().includes(term);
      const inNumero = r.numero?.toLowerCase().includes(term);
      return inTitular || inNumero;
    });

    return results;
  }

  // --- ACCIONES ---

  confirmReservation(r: any) {
    this.api.updateReserva(r.id, { estado: 'Confirmada' }).subscribe(() => {
      this.showToast('Reserva confirmada');
      this.cargarDatos();
    });
  }

  denyReservation(r: any) {
    this.api.updateReserva(r.id, { estado: 'Denegada' }).subscribe(() => {
      this.showToast('Reserva denegada');
      this.cargarDatos();
    });
  }

  cancelByClient(r: any) {
    this.api.updateReserva(r.id, { estado: 'Cancelada' }).subscribe(() => {
      this.showToast('Cancelada por cliente');
      this.cargarDatos();
    });
  }

  async confirmDeleteReservation(r: any) {
    this.showCustomConfirm(r);
  }

  deleteReservation(r: any) {
    this.api.eliminarReserva(r.id).subscribe(() => {
      this.showToast('Reserva eliminada');
      this.cargarDatos();
    });
  }

  showCustomConfirm(r: any) {
    (async () => {
      const alert = await this.alertCtrl.create({
        header: 'Confirmar borrado',
        message: `¿Borrar reserva ${r.numero}? Esta acción no se puede deshacer.`,
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
    this.reservas.forEach(x => { if (x !== r) x.expanded = false; });
    r.expanded = !r.expanded;
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
  
  onFilter(ev: any) { 
    this.statusFilter = ev?.detail?.value ?? 'Todos';
    this.reservas.forEach(x => x.expanded = false);
  }

  onContentScroll(ev: any) { this.showScrollTop = (ev?.detail?.scrollTop ?? 0) > 200; }
  scrollToTop() { this.content.scrollToTop(400); }

  async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'dark' });
    t.present();
  }
}