import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
  status: 'Pendiente' | 'Confirmada' | 'Denegada';
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
    fechaEntrada: '',
    fechaSalida: '',
    numeroHabitaciones: 1,
    adultos: 1,
    ninos: 0,
    precioTotal: 0,
    pension: 'Alojamiento y Desayuno',
    mascota: false,
    status: 'Pendiente'
  };

  pensionOptions = [
    'Alojamiento',
    'Alojamiento y Desayuno',
    'Media Pensión',
    'Pensión Completa'
  ];

  statusOptions: Array<ReservaInput['status']> = ['Pendiente', 'Confirmada', 'Denegada'];

  constructor(private modalCtrl: ModalController, private alertCtrl: AlertController) {}

  ngOnInit(): void {
    // si se pasa una reserva inicial (modo editar), mezclar los valores sin mutar el objeto original
    if (this.initial) {
      this.reserva = { ...this.reserva, ...this.initial } as ReservaInput;
    }
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  async save() {
    // validaciones básicas
    if (!this.reserva.habitacion || !this.reserva.titular || !this.reserva.fechaEntrada || !this.reserva.fechaSalida) {
      const alert = await this.alertCtrl.create({
        header: 'Campos requeridos',
        message: 'Por favor rellena habitación, titular y las fechas de entrada/salida.',
        cssClass: 'missing-alert',
        buttons: [
          {
            text: 'OK',
            role: 'cancel',
            cssClass: 'btn-ok-missing'
          }
        ]
      });
      await alert.present();
      return;
    }

    this.modalCtrl.dismiss({ reserva: this.reserva });
  }
}
