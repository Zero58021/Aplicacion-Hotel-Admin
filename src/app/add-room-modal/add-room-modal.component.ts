import { Component } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-room-modal',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './add-room-modal.component.html',
  styleUrls: ['./add-room-modal.component.scss']
})
export class AddRoomModalComponent {
  newRoom: any = {
    images: [],
    roomNumber: '',
    status: 'Libre',
    title: '',
    type: '',
    floor: '',
    extras: [],
    oldPrice: '',
    price: '',
    description: '',
    reviews: []
  };

  roomTypes = ['Individual', 'Doble', 'Doble individual', 'Triple', 'Suite', 'Familiar'];
  floors = ['Baja', 'Primera', 'Segunda', 'Tercera', 'Cuarta'];
  extrasOptions = ['Balcón', 'Bañera', 'Cuna', 'Ducha', 'Frigorífico', 'Televisión', 'Terraza', 'WiFi', 'Limpieza', 'Silla de ruedas', 'Toallas extras'];

  constructor(private modalCtrl: ModalController) {
    // default type/floor
    this.newRoom.type = this.roomTypes[0];
    this.newRoom.floor = this.floors[0];
  }

  addPhotoFile(event: any) {
    const file = event?.target?.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (!this.newRoom.images) this.newRoom.images = [];
      this.newRoom.images.push(reader.result as string);
      this.newRoom.images = [...this.newRoom.images];
    };
    reader.readAsDataURL(file);
  }

  removePhoto(index: number) {
    if (!this.newRoom.images) return;
    this.newRoom.images.splice(index, 1);
    this.newRoom.images = [...this.newRoom.images];
  }

  toggleExtra(opt: string) {
    if (!this.newRoom || !Array.isArray(this.newRoom.extras)) this.newRoom.extras = [];
    const idx = this.newRoom.extras.indexOf(opt);
    if (idx >= 0) this.newRoom.extras.splice(idx, 1);
    else this.newRoom.extras.push(opt);
    this.newRoom.extras = [...this.newRoom.extras];
  }

  save() {
    // ensure prices include euro sign
    this.newRoom.price = this.formatPrice(this.newRoom.price);
    this.newRoom.oldPrice = this.formatPrice(this.newRoom.oldPrice);
    this.modalCtrl.dismiss(this.newRoom);
  }

  private formatPrice(val: any): string {
    if (val === null || val === undefined) return '';
    let s = val.toString().trim();
    if (!s) return '';
    // if already contains euro symbol, return as-is
    if (s.indexOf('€') >= 0) return s;
    // append space + euro sign
    return s + ' €';
  }

  cancel() {
    this.modalCtrl.dismiss(null);
  }
}
