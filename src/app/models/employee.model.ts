export interface Employee {
  numero: string;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  email: string;
  photo?: string;
  puesto: 'Limpieza' | 'Restaurante' | 'Mostrador' | string;
  status: 'Activo' | 'Baja' | 'En licencia' | string;
  contrato: 'Indefinido' | 'Temporal' | 'Por obra o servicio' | 'A tiempo completo' | 'A tiempo parcial' | string;
}
