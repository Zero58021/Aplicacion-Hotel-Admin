import { Component } from '@angular/core';
import { StateService } from './services/state.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private stateService: StateService) {
    // Ensure storage is initialized and state restored on app start
    this.stateService.init();
  }
}
