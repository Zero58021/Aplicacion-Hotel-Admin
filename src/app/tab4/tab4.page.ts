import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicModule, AlertController, ModalController, IonContent } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewsModalComponent } from '../reviews-modal/reviews-modal.component';
import { AddRoomModalComponent } from '../add-room-modal/add-room-modal.component';
import { ImageModalComponent } from '../image-modal/image-modal.component';

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
  rooms = [
    {
      images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'],
      roomNumber: '101',
      status: 'Activa',
      title: 'Individual Económica',
      type: 'Individual',
      floor: 'Primera',
      extras: ['WiFi'],
      oldPrice: '79 €',
      price: '47 €',
      note: 'Incluye tasas e impuestos',
      reviews: [
        { author: 'María', rating: 5, text: 'Excelente habitación, muy limpia y cómoda.' },
        { author: 'Carlos', rating: 3, text: 'Buena ubicación pero un poco ruidosa por la noche.' }
      ]
    },
    {
      images: ['https://images.unsplash.com/photo-1501117716987-c8e5f72b4d97?w=800&q=80'],
      roomNumber: '102',
        status: 'Activa',
      title: 'Doble Confort',
      type: 'Doble',
      floor: 'Segunda',
      extras: ['WiFi', 'Desayuno'],
      oldPrice: '120 €',
      price: '89 €',
      note: 'Cancelación gratuita',
      reviews: [
        { author: 'Lucía', rating: 4, text: 'Muy buena estancia, el desayuno merece la pena.' },
        { author: 'Andrés', rating: 2, text: 'La cama no era cómoda y la limpieza fue mejorable.' },
        { author: 'Sofía', rating: 5, text: 'Personal atento y habitación amplia.' }
      ]
    }
    ,
    {
      images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80','https://images.unsplash.com/photo-1505691723518-36a7be2f0b11?w=800&q=80'],
      roomNumber: '201',
      status: 'Activa',
      title: 'Suite Familiar',
      type: 'Suite',
      floor: 'Tercera',
      extras: ['WiFi', 'Desayuno', 'Terraza'],
      oldPrice: '220 €',
      price: '179 €',
      note: 'Ideal para familias, incluye desayuno y cuna bajo petición',
      reviews: [
        { author: 'Miguel', rating: 5, text: 'Perfecta para nuestra familia, amplia y con terraza.' },
        { author: 'Ana', rating: 4, text: 'Muy cómoda y con buenas vistas.' }
      ]
    }
  ];

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


  constructor(private alertCtrl: AlertController, private modalCtrl: ModalController) {
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
    // initialize visible image index per room
    this.imageIndex = this.rooms.map(() => 0);
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
    this.editingIndex = i;
    const room = this.rooms[i];
    this.editModel = { ...room, extras: Array.isArray(room.extras) ? [...room.extras] : [], images: Array.isArray(room.images) ? [...room.images] : [] };
  }
  
  async addNewRoom() {
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
      status: data.status || 'Activa',
      title: data.title || '',
      type: data.type || (this.roomTypes && this.roomTypes[0]) || '',
      floor: data.floor || (this.floors && this.floors[0]) || '',
      extras: Array.isArray(data.extras) ? data.extras : [],
      oldPrice: data.oldPrice || '',
      price: data.price || '',
      note: data.note || '',
      reviews: Array.isArray(data.reviews) ? data.reviews : []
    };
    this.rooms.push(room);
    // sort rooms by numeric roomNumber when possible; fallback to string compare
    this.rooms.sort((a: any, b: any) => {
      const na = Number(a.roomNumber);
      const nb = Number(b.roomNumber);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return (a.roomNumber || '').toString().localeCompare((b.roomNumber || '').toString(), undefined, { numeric: true });
    });
    // rebuild imageIndex
    this.imageIndex = this.rooms.map(() => 0);
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
    const extras = Array.isArray(this.editModel.extras) ? this.editModel.extras : [];
    const images = Array.isArray(this.editModel.images) ? this.editModel.images : [];
    const updated = { ...this.editModel, extras, images };
    this.rooms[this.editingIndex] = updated;
    // ensure image index for this room stays within bounds
    if (!this.imageIndex) this.imageIndex = [];
    if (this.imageIndex[this.editingIndex] === undefined) this.imageIndex[this.editingIndex] = 0;
    const idx = this.imageIndex[this.editingIndex];
    if (images.length === 0) {
      this.imageIndex[this.editingIndex] = 0;
    } else if (idx >= images.length) {
      this.imageIndex[this.editingIndex] = images.length - 1;
    }
    this.editingIndex = -1;
    this.editModel = {};
  }

  cancelEdit() {
    this.editingIndex = -1;
    this.editModel = {};
  }

  async confirmDelete(i: number) {
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
    if (i < 0 || i >= this.rooms.length) return;
    this.rooms.splice(i, 1);
    // keep imageIndex array in sync
    if (this.imageIndex && this.imageIndex.length > i) this.imageIndex.splice(i, 1);
    // if we were editing this room, cancel edit; if editing index after removed, shift it
    if (this.editingIndex === i) {
      this.editingIndex = -1;
      this.editModel = {};
    } else if (this.editingIndex > i) {
      this.editingIndex = this.editingIndex - 1;
    }
    // no creatingIndex to adjust (modal-based creation)
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
