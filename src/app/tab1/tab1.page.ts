import { Component, OnInit } from '@angular/core';
import { StateService } from '../services/state.service';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  showText = false;

  constructor(private router: Router, private navCtrl: NavController, private state: StateService) {}

  ngOnInit() {
    const saved = this.state.getState() || {};
    if (saved.tab1 && typeof saved.tab1.showText === 'boolean') {
      this.showText = saved.tab1.showText;
    }
    // keep UI in sync if other parts update the global state
    this.state.state$.subscribe(s => {
      if (s && s.tab1 && typeof s.tab1.showText === 'boolean') {
        this.showText = s.tab1.showText;
      }
    });
  }

  toggleText() {
    this.showText = !this.showText;
    this.state.update({ tab1: { showText: this.showText } });
  }

  navigate(path: string) {
    console.log('[Tab1] navigate()', path);
    // Prefer navigateRoot to switch tabs and reset navigation stack
    this.navCtrl.navigateRoot(path).then(() => {
      console.log('[Tab1] navigate: success', path);
    }).catch(err => {
      console.error('[Tab1] navigate: error', err);
      // fallback to router
      this.router.navigateByUrl(path).catch(e => console.error('[Tab1] router fallback error', e));
    });
  }

  selectTab(ev: Event) {
    ev && ev.preventDefault && ev.preventDefault();
    ev && ev.stopPropagation && ev.stopPropagation();
    const tabPath = '/tabs/tab5';
    console.log('[Tab1] selectTab() ->', tabPath);
    // First try NavController
    this.navCtrl.navigateRoot(tabPath).then(() => {
      console.log('[Tab1] selectTab navigateRoot success');
    }).catch(err => console.error('[Tab1] selectTab navigateRoot error', err));

    // Also try to select ion-tabs directly as fallback
    try {
      const tabs = document.querySelector('ion-tabs') as any;
      if (tabs && typeof tabs.select === 'function') {
        tabs.select('tab5').then((res: any) => console.log('[Tab1] tabs.select result', res)).catch((e: any) => console.error('[Tab1] tabs.select error', e));
      }
    } catch (e) {
      console.error('[Tab1] selectTab DOM error', e);
    }
  }
}

