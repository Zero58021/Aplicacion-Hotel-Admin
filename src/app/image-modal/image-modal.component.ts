import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-modal',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './image-modal.component.html',
  styleUrls: ['./image-modal.component.scss']
})
export class ImageModalComponent {
  @Input() images: string[] = [];
  @Input() index: number = 0;
  zoomed = false;

  constructor(private modalCtrl: ModalController) {}

  close() {
    this.modalCtrl.dismiss();
  }

  prev() {
    if (!this.images || !this.images.length) return;
    this.index = (this.index - 1 + this.images.length) % this.images.length;
  }

  next() {
    if (!this.images || !this.images.length) return;
    this.index = (this.index + 1) % this.images.length;
  }

  toggleZoom() {
    this.zoomed = !this.zoomed;
  }
}
