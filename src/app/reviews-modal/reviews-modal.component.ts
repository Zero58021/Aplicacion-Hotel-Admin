import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reviews-modal',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './reviews-modal.component.html',
  styleUrls: ['./reviews-modal.component.scss']
})
export class ReviewsModalComponent {
  @Input() reviews: any[] = [];

  constructor(private modalCtrl: ModalController) {}

  getStars() {
    return [1, 2, 3, 4, 5];
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
