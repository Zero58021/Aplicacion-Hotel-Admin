import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicModule, AlertController, ModalController, IonContent } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewsModalComponent } from '../reviews-modal/reviews-modal.component';
import { AddRoomModalComponent } from '../add-room-modal/add-room-modal.component';
import { ImageModalComponent } from '../image-modal/image-modal.component';
import { AuthService } from '../services/auth.service';
import { RoomService } from '../services/room.service';

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
  // creatingIndex removed; new rooms are added via modal


  constructor(private alertCtrl: AlertController, private modalCtrl: ModalController, public auth: AuthService, private roomService: RoomService) {
    // Force styles on extras-alert overlays when they present (Shadow DOM safe)
    document.addEventListener('ionAlertDidPresent', (ev: any) => {
      const alertEl = ev.target as HTMLElement;
      if (!alertEl) return;
      if (alertEl.classList && (alertEl.classList.contains('extras-alert') || alertEl.classList.contains('reviews-alert'))) {
        // set CSS variables on the ion-alert host so inner shadow DOM picks them up
        try {
          // Use white background for the extras alert so the selector appears white
          alertEl.style.setProperty('--background', '#ffffff');
          alertEl.style.setProperty('color', '#000');
          alertEl.style.setProperty('--color', '#000');
          // Force button backgrounds and colors inside the alert
          alertEl.style.setProperty('--button-background', '#ffffff');
          alertEl.style.setProperty('--button-color', '#000');
          alertEl.style.setProperty('--button-border-color', 'rgba(0,0,0,0.06)');
          alertEl.style.setProperty('--button-height', '44px');

          // also ensure wrapper children inherit the white background and adjust button nodes
          const wrapper = alertEl.shadowRoot?.querySelector('.alert-wrapper') as HTMLElement | null;
          if (wrapper) {
            wrapper.style.background = '#ffffff';
            wrapper.style.color = '#000';
            // try to find button group and style native buttons
            const btnGroup = wrapper.querySelector('.alert-button-group') as HTMLElement | null;
            if (btnGroup) {
              btnGroup.style.background = '#ffffff';
              const buttons = btnGroup.querySelectorAll('button');
              buttons.forEach((b: any) => {
                try {
                  b.style.background = '#ffffff';
                  b.style.color = '#000';
                  b.style.border = '1px solid rgba(0,0,0,0.04)';
                } catch (err) {
                  // ignore per-button styling errors
                }
              });
            }
          }
        } catch (e) {
          // silently ignore if styling fails (Shadow DOM may restrict some operations)
        }
      }
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
  ngOnInit() {
    // subscribe to global room list and initialize imageIndex when it changes
    this.roomService.getRooms$().subscribe(list => {
      this.rooms = list.map(r => ({ ...r }));
      this.imageIndex = this.rooms.map(() => 0);
    });
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
    // animate scroll to top; 300ms for smoothness
    this.content?.scrollToTop(300);
  }

  ionViewWillEnter() {
    document.body.classList.add('tab4-no-white-active');
  }

  ionViewWillLeave() {
    document.body.classList.remove('tab4-no-white-active');
  }

  startEdit(i: number) {
    if (!this.auth.hasPermission('habitaciones.edit')) return;
    this.editingIndex = i;
    const room = this.rooms[i];
    this.editModel = { ...room, extras: Array.isArray(room.extras) ? [...room.extras] : [], images: Array.isArray(room.images) ? [...room.images] : [] };
  }
  
  async addNewRoom() {
    if (!this.auth.hasPermission('habitaciones.edit')) return;

    const modal = await this.modalCtrl.create({
      component: AddRoomModalComponent,
      cssClass: 'add-room-modal'
    });
    await modal.present();
    const res = await modal.onDidDismiss();
    const data = res?.data;
    if (!data) return;
    // ensure defaults
    const room = {
      images: Array.isArray(data.images) ? data.images : [],
      roomNumber: data.roomNumber || '',
      status: data.status || 'Libre',
      title: data.title || '',
      type: data.type || (this.roomTypes && this.roomTypes[0]) || '',
      floor: data.floor || (this.floors && this.floors[0]) || '',
      extras: Array.isArray(data.extras) ? data.extras : [],
      oldPrice: data.oldPrice || '',
      price: data.price || '',
      description: data.description || '',
      reviews: Array.isArray(data.reviews) ? data.reviews : []
    };
    // delegate to RoomService so all subscribers update
    this.roomService.addRoom(room);
  }

  onFileSelected(event: any) {
    // kept for backward compatibility — add first selected as main image
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (!this.editModel.images) this.editModel.images = [];
      this.editModel.images.push(reader.result as string);
      this.editModel.images = [...this.editModel.images];
    };
    reader.readAsDataURL(file);
  }


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
    if (!file || !this.editModel.images) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.editModel.images[index] = reader.result as string;
      this.editModel.images = [...this.editModel.images];
    };
    reader.readAsDataURL(file);
  }

  prevImage(roomIdx: number) {
    const imgs = this.rooms[roomIdx]?.images;
    if (!imgs || imgs.length === 0) return;
    const cur = this.imageIndex[roomIdx] ?? 0;
    const next = (cur - 1 + imgs.length) % imgs.length;
    this.imageIndex[roomIdx] = next;
  }

  nextImage(roomIdx: number) {
    const imgs = this.rooms[roomIdx]?.images;
    if (!imgs || imgs.length === 0) return;
    const cur = this.imageIndex[roomIdx] ?? 0;
    const next = (cur + 1) % imgs.length;
    this.imageIndex[roomIdx] = next;
  }

  removePhoto(index: number) {
    if (!this.editModel.images) return;
    this.editModel.images.splice(index, 1);
    this.editModel.images = [...this.editModel.images];
  }

  saveEdit() {
    if (this.editingIndex < 0) return;
    if (!this.auth.hasPermission('habitaciones.edit')) return;
    const extras = Array.isArray(this.editModel.extras) ? this.editModel.extras : [];
    const images = Array.isArray(this.editModel.images) ? this.editModel.images : [];
    const updated = { ...this.editModel, extras, images };
    // update via service so change propagates
    this.roomService.updateRoom(this.editingIndex, updated);
    // reset edit state; imageIndex will be adjusted when the rooms list emits
    this.editingIndex = -1;
    this.editModel = {};
  }

  cancelEdit() {
    console.log('cancelEdit invoked');
    // Ensure any open Ionic overlays (alerts, popovers, action-sheets) are dismissed
    try {
      const alert = document.querySelector('ion-alert') as any | null;
      const pop = document.querySelector('ion-popover') as any | null;
      const as = document.querySelector('ion-action-sheet') as any | null;
      if (alert && typeof alert.dismiss === 'function') alert.dismiss().catch(() => {});
      if (pop && typeof pop.dismiss === 'function') pop.dismiss().catch(() => {});
      if (as && typeof as.dismiss === 'function') as.dismiss().catch(() => {});
    } catch (e) {
      // ignore overlay dismissal errors
    }
    this.editingIndex = -1;
    this.editModel = {};
  }

  async confirmDelete(i: number) {
    if (!this.auth.hasPermission('habitaciones.edit')) return;

    const alert = await this.alertCtrl.create({
      header: 'Borrar habitación',
      message: '¿Estás seguro de que deseas borrar esta habitación?',
      cssClass: 'extras-alert',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Borrar', cssClass: 'danger', handler: () => this.deleteRoom(i) }
      ]
    });
    await alert.present();
  }

  deleteRoom(i: number) {
    if (!this.auth.hasPermission('habitaciones.edit')) return;
    this.roomService.deleteRoom(i);
  }

  toggleExtra(opt: string) {
    if (!this.editModel || !Array.isArray(this.editModel.extras)) {
      this.editModel.extras = [];
    }
    const idx = this.editModel.extras.indexOf(opt);
    if (idx >= 0) {
      this.editModel.extras.splice(idx, 1);
    } else {
      this.editModel.extras.push(opt);
    }
    this.editModel.extras = [...this.editModel.extras];
  }

  renderStars(rating: number) {
    const r = Math.max(0, Math.min(5, Math.floor(rating)));
    const filled = '★'.repeat(r);
    const empty = '☆'.repeat(5 - r);
    return `<span style="color:#f5b50a; font-size:14px; margin-right:6px">${filled}${empty}</span>`;
  }

  avgRating(room: any): number {
    const reviews = Array.isArray(room?.reviews) ? room.reviews : [];
    if (!reviews.length) return 0;
    const sum = reviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0);
    // return one decimal precision
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  getStatusClass(status: string) {
    switch ((status || '').toString()) {
      case 'Limpieza':
        return 'limpieza';
      case 'Mantenimiento':
        return 'mantenimiento';
      case 'Reservada':
        return 'reservada';
      case 'Ocupada':
        return 'ocupada';
      case 'Libre':
        return 'libre';
      case 'Activa':
        return 'active';
      case 'No activa':
        return 'inactive';
      default:
        return '';
    }
  }

  async setRoomStatus(i: number, status: string) {
    if (i < 0 || i >= this.rooms.length) return;
    this.roomService.setRoomStatus(i, status);
  }

  onPriceChange(i: number, value: any, field: 'price' | 'oldPrice' = 'price') {
    if (!this.auth.hasPermission('habitaciones.edit')) return;
    if (field === 'price') {
      this.roomService.setRoomPrice(i, value);
    } else {
      this.roomService.setRoomOldPrice(i, value);
    }
  }

  starState(avg: number): boolean[] {
    const rounded = Math.round(avg || 0);
    return Array.from({ length: 5 }, (_v, i) => i < rounded);
  }

  async showReviews(room: any) {
    const reviews = Array.isArray(room.reviews) ? room.reviews : [];
    const modal = await this.modalCtrl.create({
      component: ReviewsModalComponent,
      componentProps: { reviews }
    });
    await modal.present();
  }

  async openImage(room: any, idx: number) {
    const imgs = Array.isArray(room?.images) ? room.images : [];
    const modal = await this.modalCtrl.create({
      component: ImageModalComponent,
      componentProps: { images: imgs, index: idx || 0 },
      cssClass: 'image-viewer-modal'
    });
    await modal.present();
  }

}
