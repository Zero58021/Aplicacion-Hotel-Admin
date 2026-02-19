import { Component } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
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
    note: '',
    reviews: []
  };

  roomTypes = ['Individual', 'Doble', 'Doble individual', 'Triple', 'Suite', 'Familiar'];
  floors = ['Baja', 'Primera', 'Segunda', 'Tercera', 'Cuarta'];
  extrasOptions = ['Balcón', 'Bañera', 'Cuna', 'Ducha', 'Frigorífico', 'Televisión', 'Terraza', 'WiFi', 'Limpieza', 'Silla de ruedas', 'Toallas extras'];

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController
  ) {
    this.newRoom.type = this.roomTypes[0];
    this.newRoom.floor = this.floors[0];
  }

  // --- GESTIÓN DE FOTOS ---
  addPhotoFile(event: any) {
    const file = event?.target?.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (!this.newRoom.images) this.newRoom.images = [];
      this.newRoom.images.push(reader.result as string);
      this.newRoom.images = [...this.newRoom.images];
      
      // Limpiar el input file para poder subir la misma foto 2 veces seguidas si se quiere
      if (event.target) event.target.value = '';
    };
    reader.readAsDataURL(file);
  }

  removePhoto(index: number) {
    if (!this.newRoom.images) return;
    this.newRoom.images.splice(index, 1);
    this.newRoom.images = [...this.newRoom.images];
  }

  // --- GESTIÓN DE EXTRAS (CHIPS) ---
  hasExtra(opt: string): boolean {
    return this.newRoom.extras && this.newRoom.extras.includes(opt);
  }

  toggleExtra(opt: string) {
    if (!this.newRoom || !Array.isArray(this.newRoom.extras)) this.newRoom.extras = [];
    const idx = this.newRoom.extras.indexOf(opt);
    if (idx >= 0) {
      this.newRoom.extras.splice(idx, 1); // Quitar si ya está
    } else {
      this.newRoom.extras.push(opt); // Añadir si no está
    }
    this.newRoom.extras = [...this.newRoom.extras];
  }

  // --- ACCIONES PRINCIPALES ---
  async save() {
    // Pequeña validación básica
    if (!this.newRoom.roomNumber || !this.newRoom.title || !this.newRoom.price) {
      const toast = await this.toastCtrl.create({
        message: 'Por favor, rellena al menos el Número, el Nombre y el Precio.',
        duration: 3000,
        color: 'danger',
        position: 'top',
        icon: 'warning-outline'
      });
      toast.present();
      return;
    }

    this.newRoom.price = this.formatPrice(this.newRoom.price);
    this.newRoom.oldPrice = this.formatPrice(this.newRoom.oldPrice);
    this.modalCtrl.dismiss(this.newRoom);
  }

  private formatPrice(val: any): string {
    if (val === null || val === undefined) return '';
    let s = val.toString().trim();
    if (!s) return '';
    return s;
  }

  cancel() {
    this.modalCtrl.dismiss(null);
  }
}