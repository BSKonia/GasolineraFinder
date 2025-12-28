import { Injectable } from '@angular/core';
import { Ubicacion } from '../models/location';
import { Filtros } from '../models/filter';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  
  // Guardar ubicación
  guardarUbicacion(ubicacion: Ubicacion): void {
    try {
      localStorage.setItem('gasolineraFinder_ubicacion', JSON.stringify(ubicacion));
      console.log('💾 Ubicación guardada:', ubicacion);
    } catch (error) {
      console.error('❌ Error guardando ubicación:', error);
    }
  }

  // Obtener ubicación guardada
  obtenerUbicacion(): Ubicacion | null {
    try {
      const data = localStorage.getItem('gasolineraFinder_ubicacion');
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ Error obteniendo ubicación:', error);
    }
    return null;
  }

  // Guardar filtros
  guardarFiltros(filtros: Filtros): void {
    try {
      localStorage.setItem('gasolineraFinder_filtros', JSON.stringify(filtros));
      console.log('💾 Filtros guardados:', filtros);
    } catch (error) {
      console.error('❌ Error guardando filtros:', error);
    }
  }

  // Obtener filtros guardados
  obtenerFiltros(): Filtros | null {
    try {
      const data = localStorage.getItem('gasolineraFinder_filtros');
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ Error obteniendo filtros:', error);
    }
    return null;
  }

  // Limpiar todo
  limpiarCache(): void {
    localStorage.removeItem('gasolineraFinder_ubicacion');
    localStorage.removeItem('gasolineraFinder_filtros');
    console.log('🧹 Cache limpiada');
  }
}