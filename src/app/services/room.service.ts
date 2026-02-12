import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private roomsSub = new BehaviorSubject<any[]>([
    {
      images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'],
      roomNumber: '101',
      status: 'Libre',
      title: 'Individual Económica',
      type: 'Individual',
      floor: 'Primera',
      extras: ['WiFi'],
      oldPrice: '79 €',
      price: '47 €',
      note: 'Incluye tasas e impuestos',
      reviews: [
        { author: 'María', rating: 5, text: 'Excelente habitación, muy limpia y cómoda.' },
        { author: 'Carlos', rating: 3, text: 'Buena ubicación pero un poco ruidosa por la noche.' }
      ]
    },
    {
      images: ['assets/fotosInicio/1.webp'],
      roomNumber: '102',
      status: 'Libre',
      title: 'Doble Confort',
      type: 'Doble',
      floor: 'Segunda',
      extras: ['WiFi', 'Desayuno'],
      oldPrice: '120 €',
      price: '89 €',
      note: 'Cancelación gratuita',
      reviews: [
        { author: 'Lucía', rating: 4, text: 'Muy buena estancia, el desayuno merece la pena.' },
        { author: 'Andrés', rating: 2, text: 'La cama no era cómoda y la limpieza fue mejorable.' },
        { author: 'Sofía', rating: 5, text: 'Personal atento y habitación amplia.' }
      ]
    },
    {
      images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80','assets/fotosInicio/2.jpg'],
      roomNumber: '201',
      status: 'Libre',
      title: 'Suite Familiar',
      type: 'Suite',
      floor: 'Tercera',
      extras: ['WiFi', 'Desayuno', 'Terraza'],
      oldPrice: '220 €',
      price: '179 €',
      note: 'Ideal para familias, incluye desayuno y cuna bajo petición',
      reviews: [
        { author: 'Miguel', rating: 5, text: 'Perfecta para nuestra familia, amplia y con terraza.' },
        { author: 'Ana', rating: 4, text: 'Muy cómoda y con buenas vistas.' }
      ]
    }
  ]);

  constructor(private notificationService: NotificationService) {}

  getRooms$() {
    return this.roomsSub.asObservable();
  }

  getSnapshot() {
    return this.roomsSub.getValue();
  }

  private sortRooms(list: any[]) {
    list.sort((a: any, b: any) => {
      const na = Number(a.roomNumber);
      const nb = Number(b.roomNumber);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return (a.roomNumber || '').toString().localeCompare((b.roomNumber || '').toString(), undefined, { numeric: true });
    });
  }

  addRoom(room: any) {
    const list = [...this.getSnapshot(), room];
    this.sortRooms(list);
    this.roomsSub.next(list);
  }

  updateRoom(index: number, room: any) {
    const list = [...this.getSnapshot()];
    if (index < 0 || index >= list.length) return;
    list[index] = room;
    this.sortRooms(list);
    this.roomsSub.next(list);
  }

  setRoomStatus(index: number, status: string) {
    const list = [...this.getSnapshot()];
    if (index < 0 || index >= list.length) return;
    const prev = list[index];
    const old = prev.status;
    list[index] = { ...prev, status };
    this.roomsSub.next(list);
    // notificar cambio de estado
    const roomNumber = prev.roomNumber || `#${index}`;
    this.notificationService.notify('habitaciones', `ha cambiado el estado de la habitación ${roomNumber} de ${old} a ${status}`);
  }

  setRoomPrice(index: number, price: string) {
    const list = [...this.getSnapshot()];
    if (index < 0 || index >= list.length) return;
    const prev = list[index];
    const old = prev.price;
    list[index] = { ...prev, price };
    this.roomsSub.next(list);
    const roomNumber = prev.roomNumber || `#${index}`;
    this.notificationService.notify('habitaciones', `ha cambiado el precio de la habitación ${roomNumber} de ${old} a ${price}`);
  }

  setRoomOldPrice(index: number, oldPrice: string) {
    const list = [...this.getSnapshot()];
    if (index < 0 || index >= list.length) return;
    const prev = list[index];
    const old = prev.oldPrice;
    list[index] = { ...prev, oldPrice };
    this.roomsSub.next(list);
    const roomNumber = prev.roomNumber || `#${index}`;
    this.notificationService.notify('habitaciones', `ha actualizado el precio antiguo de la habitación ${roomNumber} de ${old} a ${oldPrice}`);
  }

  deleteRoom(index: number) {
    const list = [...this.getSnapshot()];
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    this.roomsSub.next(list);
  }
}
