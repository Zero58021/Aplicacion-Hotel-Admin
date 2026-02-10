import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private _storageReady = false;
  private _state$ = new BehaviorSubject<any>({});
  public state$ = this._state$.asObservable();

  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    try {
      await this.storage.create();
      this._storageReady = true;
      const saved = await this.storage.get('appState');
      if (saved) this._state$.next(saved);
    } catch (e) {
      console.error('StateService init error', e);
    }
  }

  getState<T = any>(): T {
    return this._state$.getValue() as T;
  }

  async setState(state: any) {
    this._state$.next(state);
    if (this._storageReady) {
      await this.storage.set('appState', state);
    }
  }

  async update(partial: Record<string, any>) {
    const current = { ...(this._state$.getValue() || {}), ...partial };
    await this.setState(current);
  }

  async clear() {
    this._state$.next({});
    if (this._storageReady) {
      await this.storage.remove('appState');
    }
  }
}
