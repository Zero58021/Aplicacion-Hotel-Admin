import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

interface ReservaInput {
  numero?: string;
  habitacion: string;
  titular: string;
  fechaEntrada: string;
  fechaSalida: string;
  numeroHabitaciones: number;
  adultos: number;
  ninos: number;
  precioTotal: number;
  pension: string;
  mascota: boolean;
  hasAllergies?: boolean;
  alergias?: string;
  status: 'Pendiente' | 'Confirmada' | 'Denegada' | 'Cancelada por cliente';
}

@Component({
  selector: 'app-reserva-modal',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './reserva-modal.component.html',
  styleUrls: ['./reserva-modal.component.scss']
})
export class ReservaModalComponent implements OnInit {
  @Input() initial?: Partial<ReservaInput>;

  reserva: ReservaInput = {
    habitacion: '',
    titular: '',
    fechaEntrada: new Date().toISOString(), // Inicia con hoy
    fechaSalida: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), // Mañana
    numeroHabitaciones: 1,
    adultos: 1,
    ninos: 0,
    precioTotal: 0,
    pension: 'Alojamiento y Desayuno',
    mascota: false,
    hasAllergies: false,
    alergias: '',
    status: 'Pendiente'
  };

  pensionOptions = [
    'Alojamiento',
    'Alojamiento y Desayuno',
    'Media Pensión',
    'Pensión Completa'
  ];

  isRecepcion: boolean = false;

  constructor(
    private modalCtrl: ModalController, 
    private toastCtrl: ToastController, 
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.initial) {
      this.reserva = { ...this.reserva, ...this.initial } as ReservaInput;
    }
    this.isRecepcion = this.auth.getRole() === 'recepcion';
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  async save() {
    // Validaciones básicas con Toast
    if (!this.reserva.habitacion || !this.reserva.titular || !this.reserva.fechaEntrada || !this.reserva.fechaSalida) {
      const toast = await this.toastCtrl.create({
        message: 'Faltan campos obligatorios (Habitación, Titular o Fechas).',
        duration: 3500,
        color: 'danger',
        position: 'top',
        icon: 'warning-outline'
      });
      toast.present();
      return;
    }

    this.modalCtrl.dismiss({ reserva: this.reserva });
  }

  // Acción específica para recepcion: cancelar reserva como "Cancelada por cliente"
  async cancelAsClient() {
    this.reserva.status = 'Cancelada por cliente';
    this.modalCtrl.dismiss({ reserva: this.reserva });
  }
}