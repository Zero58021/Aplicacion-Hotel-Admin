export interface Employee {
  id?: any; // Necesario para editar/borrar en el servidor
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
  
  // Campos nuevos para Finanzas y Login
  salario?: number;
  usuario?: string;
  password?: string;
  rol?: string;
}