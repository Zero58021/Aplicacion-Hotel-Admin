import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicModule, AlertController, ModalController, IonContent, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewsModalComponent } from '../reviews-modal/reviews-modal.component';
import { AddRoomModalComponent } from '../add-room-modal/add-room-modal.component';
import { ImageModalComponent } from '../image-modal/image-modal.component';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-tab4',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
})
export class Tab4Page implements OnInit {
  @ViewChild(IonContent) content: IonContent | undefined;
  showScrollTop: boolean = false;
  rooms: any[] = [];

  roomTypes = ['Individual', 'Doble', 'Doble individual', 'Triple', 'Suite', 'Familiar'];
  floors = ['Baja', 'Primera', 'Segunda', 'Tercera', 'Cuarta'];
  extrasOptions = ['Balcón', 'Bañera', 'Cuna', 'Ducha', 'Frigorífico', 'Televisión', 'Terraza', 'WiFi', 'Limpieza', 'Silla de ruedas', 'Toallas extras'];

  editingIndex: number = -1;
  editModel: any = {};
  imageIndex: number[] = [];
  searchTerm: string = '';
  selectedTypes: string[] = [];
  selectedFloors: string[] = [];
  selectedStatus: string = 'Todas';

  constructor(
    private alertCtrl: AlertController, 
    private modalCtrl: ModalController, 
    public auth: AuthService, 
    private api: ApiService,
    private toastCtrl: ToastController
  ) {
    // Tu código para forzar estilos en las alertas (intacto)
    document.addEventListener('ionAlertDidPresent', (ev: any) => {
      const alertEl = ev.target as HTMLElement;
      if (!alertEl) return;
      // Soportar varias alertas que queremos forzar a fondo blanco
      if (alertEl.classList && (
        alertEl.classList.contains('extras-alert') ||
        alertEl.classList.contains('reviews-alert') ||
        alertEl.classList.contains('white-alert')
      )) {
        try {
          // Force host CSS variables so shadow DOM parts render a white card
          alertEl.style.setProperty('--background', '#ffffff');
          alertEl.style.setProperty('--backdrop-opacity', '0.4');
          alertEl.style.setProperty('--ion-background-color', '#ffffff');
          alertEl.style.setProperty('color', '#000');
          // Extra fallbacks for wrapper if accessible
          const wrapper = alertEl.shadowRoot?.querySelector('.alert-wrapper') as HTMLElement;
          if (wrapper) {
            wrapper.style.background = '#ffffff';
            wrapper.style.backgroundColor = '#ffffff';
            wrapper.style.color = '#000';
            wrapper.style.borderRadius = '8px';
            wrapper.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
          }
        } catch (e) {}
      }
    });
  }

  ngOnInit() {
    this.cargarHabitaciones();
  }

  ionViewWillEnter() {
    document.body.classList.add('tab4-no-white-active');
    this.cargarHabitaciones();
  }

  ionViewWillLeave() {
    document.body.classList.remove('tab4-no-white-active');
  }

  cargarHabitaciones() {
    this.api.getHabitaciones().subscribe({
      next: (data) => {
        // MAPEO DE DATOS: JSON -> HTML
        this.rooms = data.map(r => {
          const rawPrice = r.price ?? r.precio ?? '0';
          const priceStr = String(rawPrice);
          const displayPrice = priceStr;

          return {
            ...r,
            // Prioridad: nombre en DB (español) || nombre en HTML (inglés)
            roomNumber: r.numero || r.roomNumber,
            status: r.estado || r.status || 'Libre',
            type: r.tipo || r.type || 'Estándar',
            floor: r.planta || r.floor || 'Baja',

            title: r.title || `Habitación ${r.numero || ''}`,
            price: rawPrice,
            displayPrice,
            oldPrice: r.oldPrice || r.precioAnterior || '',
            extras: r.extras || [],

            note: r.note || r.descripcion || '',
            reviews: r.reviews || r.comentarios || [],

            images: r.images || r.imagenes || []
          };
        });

        // Inicializar índices de imágenes
        if (this.imageIndex.length !== this.rooms.length) {
          this.imageIndex = this.rooms.map(() => 0);
        }
      },
      error: (err) => console.error('Error cargando habitaciones:', err)
    });
  }

  get filteredRooms() {
    const term = (this.searchTerm || '').toString().trim().toLowerCase();
    return this.rooms.filter(r => {
      if (Array.isArray(this.selectedTypes) && this.selectedTypes.length > 0 && !this.selectedTypes.includes(r.type)) return false;
      if (Array.isArray(this.selectedFloors) && this.selectedFloors.length > 0 && !this.selectedFloors.includes(r.floor)) return false;
      if (this.selectedStatus && this.selectedStatus !== 'Todas' && (r.status || '') !== this.selectedStatus) return false;
      
      const title = (r.title || '').toString().toLowerCase();
      const num = (r.roomNumber || '').toString().toLowerCase();
      if (!term) return true;
      return title.includes(term) || num.includes(term);
    });
  }

  originalIndex(room: any) {
    return this.rooms.indexOf(room);
  }

  get showScrollForRole(): boolean {
    const r = this.auth.getRole();
    return r === 'recepcion' || r === 'limpieza';
  }

  onContentScroll(ev: any) {
    const y = ev?.detail?.scrollTop || 0;
    this.showScrollTop = y > 300;
  }

  scrollToTop() {
    this.content?.scrollToTop(300);
  }

  // --- MODO EDICIÓN ---
  startEdit(i: number) {
    if (!this.auth.hasPermission('habitaciones.edit')) return;
    this.editingIndex = i;
    const room = this.rooms[i];
    this.editModel = JSON.parse(JSON.stringify(room));
    // Aseguramos arrays
    this.editModel.extras = Array.isArray(this.editModel.extras) ? this.editModel.extras : [];
    this.editModel.images = Array.isArray(this.editModel.images) ? this.editModel.images : [];
  }
  
  saveEdit() {
    if (this.editingIndex < 0) return;
    
    const roomToUpdate = this.rooms[this.editingIndex];
    const updatedData = {
      ...this.editModel,
      // Guardamos en formato compatible con JSON Server
      numero: this.editModel.roomNumber,
      estado: this.editModel.status,
      tipo: this.editModel.type,
      planta: this.editModel.floor,
      precio: this.editModel.price,
      extras: this.editModel.extras,
      title: this.editModel.title,
      images: this.editModel.images
    };

    this.api.actualizarHabitacion(roomToUpdate.id, updatedData).subscribe(() => {
      this.showToast('Cambios guardados');
      this.editingIndex = -1;
      this.editModel = {};
      this.cargarHabitaciones();
    });
  }

  cancelEdit() {
    this.editingIndex = -1;
    this.editModel = {};
  }

  // --- AÑADIR HABITACIÓN ---
  async addNewRoom() {
    if (!this.auth.hasPermission('habitaciones.edit')) return;

    const modal = await this.modalCtrl.create({
      component: AddRoomModalComponent,
      cssClass: 'add-room-modal'
    });
    await modal.present();
    const res = await modal.onDidDismiss();
    const data = res?.data;
    
    if (data) {
      const newRoomPayload = {
        ...data,
        numero: data.roomNumber,
        estado: data.status,
        tipo: data.type,
        planta: data.floor,
        precio: data.price
      };
      
      this.api.guardarNuevaHabitacion(newRoomPayload).subscribe(() => {
        this.showToast('Habitación creada');
        this.cargarHabitaciones();
      });
    }
  }

  // --- FOTOS ---
  addPhotoFile(event: any) {
    const file = event?.target?.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (!this.editModel.images) this.editModel.images = [];
      this.editModel.images.push(reader.result as string);
      this.editModel.images = [...this.editModel.images];
    };
    reader.readAsDataURL(file);
  }

  replacePhotoFile(index: number, event: any) {
    const file = event?.target?.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.editModel.images[index] = reader.result as string;
      this.editModel.images = [...this.editModel.images];
    };
    reader.readAsDataURL(file);
  }

  removePhoto(index: number) {
    this.editModel.images.splice(index, 1);
    this.editModel.images = [...this.editModel.images];
  }

  prevImage(roomIdx: number) {
    const imgs = this.rooms[roomIdx]?.images;
    if (!imgs || imgs.length === 0) return;
    const cur = this.imageIndex[roomIdx] ?? 0;
    this.imageIndex[roomIdx] = (cur - 1 + imgs.length) % imgs.length;
  }

  nextImage(roomIdx: number) {
    const imgs = this.rooms[roomIdx]?.images;
    if (!imgs || imgs.length === 0) return;
    const cur = this.imageIndex[roomIdx] ?? 0;
    this.imageIndex[roomIdx] = (cur + 1) % imgs.length;
  }

  // --- OTROS ---
  async confirmDelete(i: number) {
    const alert = await this.alertCtrl.create({
      header: 'Borrar habitación',
      message: '¿Estás seguro?',
      cssClass: 'white-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Borrar', handler: () => this.deleteRoom(i) }
      ]
    });
    await alert.present();
  }

  deleteRoom(i: number) {
    const room = this.rooms[i];
    this.api.borrarHabitacion(room.id).subscribe(() => {
      this.showToast('Habitación eliminada');
      this.cargarHabitaciones();
    });
  }

  // --- HELPERS ---
  avgRating(room: any): number {
    const reviews = room.reviews || room.comentarios || [];
    if (!reviews.length) return 0;
    const sum = reviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  getStatusClass(status: string) {
    return (status || '').toLowerCase();
  }

  async setRoomStatus(i: number, status: string) {
    const room = this.rooms[i];
    this.api.actualizarHabitacion(room.id, { estado: status }).subscribe(() => {
      this.showToast(`Estado cambiado a ${status}`);
      this.cargarHabitaciones();
    });
  }

  starState(avg: number): boolean[] {
    const rounded = Math.round(avg || 0);
    return Array.from({ length: 5 }, (_v, i) => i < rounded);
  }

  async showReviews(room: any) {
    const reviews = room.reviews || room.comentarios || [];
    const modal = await this.modalCtrl.create({
      component: ReviewsModalComponent,
      componentProps: { reviews }
    });
    await modal.present();
  }

  async openImage(room: any, idx: number) {
    const imgs = room.images || [];
    const modal = await this.modalCtrl.create({
      component: ImageModalComponent,
      componentProps: { images: imgs, index: idx || 0 },
      cssClass: 'image-viewer-modal'
    });
    await modal.present();
  }

  async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'dark' });
    t.present();
  }
}