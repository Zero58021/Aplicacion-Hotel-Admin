import { Component, ViewChild, OnInit } from '@angular/core';
import { AlertController, IonContent, ModalController, ToastController } from '@ionic/angular';
import { ApiService } from '../services/api'; // Usamos ApiService (Servidor Real)
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
  // Ajuste: Tu HTML usa 'Todos' en el segment, así que iniciamos con eso
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
    this.api.getReservas().subscribe({
      next: (list) => {
        // --- TRADUCTOR DE DATOS ---
        // Convertimos lo que viene del JSON a lo que espera tu HTML
        this.reservas = list.map(r => ({
          ...r,
          // Mapeo básico
          numero: r.id, 
          status: r.estado, 
          titular: r.nombreCliente,
          habitacion: r.selectedRoom?.name || 'Sin asignar',
          
          // Mapeo de datos que te faltaban en la vista
          ninos: r.children,                // JSON: children -> HTML: {{r.ninos}}
          adultos: r.adults,                // JSON: adults -> HTML: {{r.adultos}}
          precioTotal: r.total,             // JSON: total -> HTML: {{r.precioTotal}}
          pension: r.selectedPension?.name, // JSON: objeto -> HTML: {{r.pension}}
          numeroHabitaciones: r.habitaciones,

          // Lógica de alergias
          hasAllergies: (r.notas && r.notas !== '') || r.passengers?.some((p:any) => p.allergies && p.allergies !== ''),
          alergias: r.notas || (r.passengers?.find((p:any) => p.allergies)?.allergies) || 'No',
          
          expanded: false
        }));
      },
      error: (err) => console.error('Error cargando reservas:', err)
    });
  }

  get filteredReservas(): any[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    let pool = this.reservas;
    const role = this.auth.getRole();

    // Filtros de Seguridad por Rol
    if (role === 'recepcion') {
      // Opcional: Si Recepción solo debe ver confirmadas
      // pool = pool.filter(r => r.status === 'Confirmada');
    }
    if (role === 'restaurante') {
      pool = pool.filter(r => r.status === 'Confirmada' && r.hasAllergies);
    }

    const results = pool.filter(r => {
      // Filtro visual (Segment)
      if (this.statusFilter !== 'Todos' && this.statusFilter !== 'Todas') {
        if (r.status !== this.statusFilter) return false;
      }
      
      // Buscador
      if (!term) return true;
      const inTitular = r.titular?.toLowerCase().includes(term);
      const inNumero = r.numero?.toLowerCase().includes(term);
      return inTitular || inNumero;
    });

    // Ordenar: Las más recientes primero
    return results.reverse();
  }

  // --- ACCIONES (Conectadas a la API) ---

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

  // --- HELPERS VISUALES (Tu código original) ---

  showCustomConfirm(r: any) {
    // Usar el AlertController de Ionic para mostrar una confirmación fiable
    (async () => {
      const alert = await this.alertCtrl.create({
        header: 'Confirmar borrado',
        message: `¿Borrar reserva ${r.numero}? Esta acción no se puede deshacer.`,
        cssClass: 'custom-delete-alert',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            cssClass: 'btn-cancel-green'
          },
          {
            text: 'Borrar',
            cssClass: 'btn-confirm-green',
            handler: () => { this.deleteReservation(r); }
          }
        ]
      });
      await alert.present();
    })();
  }

  // --- MODALES ---

  async openNewReservation() {
    if (this.auth.getRole() === 'restaurante') return; // Seguridad extra
    
    const modal = await this.modalCtrl.create({
      component: (await import('../reserva-modal/reserva-modal.component')).ReservaModalComponent
    });
    
    modal.onDidDismiss().then((res) => {
      if (res.data?.reserva) {
        // Guardar en servidor
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
        // Actualizar en servidor
        this.api.editarReserva(r.id, res.data.reserva).subscribe(() => this.cargarDatos());
      }
    });
    return await modal.present();
  }

  // --- UTILS ---
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