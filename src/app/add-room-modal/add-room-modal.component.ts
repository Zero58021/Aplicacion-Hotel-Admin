import { Component, OnInit } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-room-modal',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './add-room-modal.component.html',
  styleUrls: ['./add-room-modal.component.scss']
})
export class AddRoomModalComponent implements OnInit {
  newRoom: any = {
    images: [],
    roomNumber: '',
    title: '',
    status: 'Libre',
    type: '',
    floor: '',
    extras: [],
    oldPrice: '',
    price: '',
    note: '',
    condiciones: {
      soloFinesDeSemana: false,
      estanciaMinima: 1,
      diasPermitidos: 'Todos',
      bloqueadaTemporalmente: false
    }
  };

  roomTypes = ['Individual', 'Doble', 'Doble individual', 'Triple', 'Suite', 'Familiar'];
  floors = ['Baja', 'Primera', 'Segunda', 'Tercera', 'Cuarta'];
  extrasOptions = ['Balcón', 'Bañera', 'Cuna', 'Ducha', 'Frigorífico', 'Televisión', 'Terraza', 'WiFi', 'Limpieza', 'Silla de ruedas', 'Toallas extras'];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {}

  hasExtra(ex: string) {
    return Array.isArray(this.newRoom.extras) && this.newRoom.extras.includes(ex);
  }

  toggleExtra(ex: string) {
    if (!Array.isArray(this.newRoom.extras)) this.newRoom.extras = [];
    const idx = this.newRoom.extras.indexOf(ex);
    if (idx === -1) this.newRoom.extras.push(ex);
    else this.newRoom.extras.splice(idx, 1);
  }

  addPhotoFile(ev: any) {
    const f = ev?.target?.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.newRoom.images.push(e.target.result);
    };
    reader.readAsDataURL(f);
  }

  removePhoto(idx: number) {
    if (!Array.isArray(this.newRoom.images)) return;
    this.newRoom.images.splice(idx, 1);
  }

  formatPrice(val: any) {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    return s === '' ? '' : (s.includes('€') ? s : s + ' €');
  }

  save() {
    this.newRoom.price = this.formatPrice(this.newRoom.price);
    this.newRoom.oldPrice = this.formatPrice(this.newRoom.oldPrice);
    this.modalCtrl.dismiss(this.newRoom);
  }

  cancel() {
    this.modalCtrl.dismiss(null);
  }
}