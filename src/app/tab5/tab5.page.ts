import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicModule, IonContent } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

@Component({
  selector: 'app-tab5',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ExploreContainerComponentModule],
  templateUrl: './tab5.page.html',
  styleUrls: ['./tab5.page.scss'],
})
export class Tab5Page implements OnInit {

  @ViewChild(IonContent, { static: false }) content: IonContent | undefined;
  showScrollTop: boolean = false;

  constructor() { }

  ngOnInit() {
  }

  onContentScroll(ev: any) {
    const y = ev?.detail?.scrollTop ?? 0;
    this.showScrollTop = y > 200;
  }

  scrollToTop() {
    this.content?.scrollToTop(300);
  }

}
