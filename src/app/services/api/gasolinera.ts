import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap, catchError, of } from 'rxjs';
import { Gasolinera } from '../../models/station';  
import { Filtros } from '../../models/filter';      
import { Ubicacion } from '../../models/location';  

@Injectable({
  providedIn: 'root'
})
export class GasolineraService {  
  private apiUrl = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';

  // Encabezados para obtener JSON
  private httpHeaders = new HttpHeaders({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'GasolineraFinder/1.0'
  });

  constructor(private http: HttpClient) { }

  // Obtener todas las gasolineras
  getGasolineras(): Observable<Gasolinera[]> {
    console.log('🌐 Llamando a API:', `${this.apiUrl}/EstacionesTerrestres/`);
    
    return this.http.get<any>(`${this.apiUrl}/EstacionesTerrestres/`, { 
      headers: this.httpHeaders 
    }).pipe(
      tap(response => {
        console.log('📦 Respuesta API recibida');
        console.log('🔢 Número de gasolineras:', response?.ListaEESSPrecio?.length || 0);
        
        if (response?.ListaEESSPrecio?.length > 0) {
          const primera = response.ListaEESSPrecio[0];
          console.log('📋 Ejemplo de datos crudos:', {
            rotulo: primera.Rótulo,
            direccion: primera.Dirección,
            precio95: primera['Precio Gasolina 95 E5']
          });
        }
      }),
      map(response => this.transformarDatosAPI(response)),
      catchError(error => {
        console.error('❌ Error en petición HTTP:', error);
        console.log('💡 Probando con fetch directo...');
        
        // Fallback con fetch
        return this.getGasolinerasConFetch();
      })
    );
  }

  // Método fallback usando fetch
  private getGasolinerasConFetch(): Observable<Gasolinera[]> {
    return new Observable(observer => {
      console.log('🔧 Usando fetch como fallback...');
      
      fetch('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/')
        .then(response => {
          console.log('🔧 Fetch status:', response.status, response.statusText);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          return response.text();
        })
        .then(text => {
          console.log('🔧 Fetch response recibida, longitud:', text.length);
          
          // Limpiar texto si hay BOM o caracteres extraños
          const cleanedText = text.replace(/^\uFEFF/, '');
          
          try {
            const data = JSON.parse(cleanedText);
            console.log('🔧 Parseo JSON exitoso');
            const gasolineras = this.transformarDatosAPI(data);
            observer.next(gasolineras);
            observer.complete();
          } catch (e) {
            console.error('❌ Error parseando JSON:', e);
            console.log('🔧 Primeros 500 caracteres del texto:', cleanedText.substring(0, 500));
            
            // Intentar ver si es XML
            if (cleanedText.includes('<?xml') || cleanedText.includes('<ListaEESSPrecio>')) {
              console.log('⚠️ La API devolvió XML en lugar de JSON');
            }
            
            observer.next([]);
            observer.complete();
          }
        })
        .catch(error => {
          console.error('❌ Error en fetch:', error);
          observer.next([]);
          observer.complete();
        });
    });
  }

  // Obtener gasolineras por provincia
  getGasolinerasPorProvincia(provincia: string): Observable<Gasolinera[]> {
    console.log('🌐 Llamando a API por provincia:', provincia);
    
    return this.http.get<any>(`${this.apiUrl}/EstacionesTerrestres/FiltroProvincia/${provincia}`, {
      headers: this.httpHeaders
    }).pipe(
      tap(response => console.log('📦 Respuesta provincia:', response?.ListaEESSPrecio?.length || 0)),
      map(response => this.transformarDatosAPI(response)),
      catchError(error => {
        console.error('❌ Error provincia:', error);
        return of([]);
      })
    );
  }

  // Obtener gasolineras por municipio
  getGasolinerasPorMunicipio(municipio: string): Observable<Gasolinera[]> {
    console.log('🌐 Llamando a API por municipio:', municipio);
    
    return this.http.get<any>(`${this.apiUrl}/EstacionesTerrestres/FiltroMunicipio/${municipio}`, {
      headers: this.httpHeaders
    }).pipe(
      tap(response => console.log('📦 Respuesta municipio:', response?.ListaEESSPrecio?.length || 0)),
      map(response => this.transformarDatosAPI(response)),
      catchError(error => {
        console.error('❌ Error municipio:', error);
        return of([]);
      })
    );
  }

  // Transformar datos de la API
  private transformarDatosAPI(data: any): Gasolinera[] {
    if (!data?.ListaEESSPrecio) {
      console.log('⚠️ No hay ListaEESSPrecio en la respuesta');
      return [];
    }

    console.log('🔄 Transformando', data.ListaEESSPrecio.length, 'gasolineras...');
    
    const gasolineras = data.ListaEESSPrecio.map((estacion: any, index: number) => {
      const gasolinera: Gasolinera = {
        id: estacion['IDEESS'] || '',
        codigoPostal: estacion['C.P.'] || '',
        direccion: estacion['Dirección'] || '',
        horario: estacion['Horario'] || '',
        latitud: this.parsearCoordenada(estacion['Latitud']),  // Cambiado de latitud a lat
        longitud: this.parsearCoordenada(estacion['Longitud (WGS84)']), // Cambiado de longitud a lon
        localidad: estacion['Localidad'] || '',
        margen: estacion['Margen'] || '',
        municipio: estacion['Municipio'] || '',
        provincia: estacion['Provincia'] || '',
        remision: estacion['Remisión'] || '',
        rotulo: estacion['Rótulo'] || '',
        tipoVenta: estacion['Tipo Venta'] || '',
        bioEtanol: estacion['% BioEtanol'] || '',
        esterMetilico: estacion['% Éster metílico'] || '',
        porcentajeBioEtanol: estacion['Porcentaje BioEtanol'] || '',
        porcentajeEsterMetilico: estacion['Porcentaje Éster metílico'] || '',
  
  // Objeto de precios
  precios: {
    'Gasolina 95 E5': this.parsearPrecio(estacion['Precio Gasolina 95 E5']),
    'Gasolina 98 E5': this.parsearPrecio(estacion['Precio Gasolina 98 E5']),
    'Gasóleo A': this.parsearPrecio(estacion['Precio Gasóleo A']),
    'Gasóleo Premium': this.parsearPrecio(estacion['Precio Gasóleo Premium']),
    'GLP': this.parsearPrecio(estacion['Precio Gases licuados del petróleo'])
  },
  
  // Precios individuales
  precioGasolina95: this.parsearPrecio(estacion['Precio Gasolina 95 E5']),
  precioGasolina98: this.parsearPrecio(estacion['Precio Gasolina 98 E5']),
  precioDiesel: this.parsearPrecio(estacion['Precio Gasóleo A']),
  precioDieselPremium: this.parsearPrecio(estacion['Precio Gasóleo Premium']),
  precioGLP: this.parsearPrecio(estacion['Precio Gases licuados del petróleo'])
};
      
      // Log de la primera gasolinera para debug
      if (index === 0) {
        console.log('🔍 Ejemplo gasolinera transformada:', {
          rotulo: gasolinera.rotulo,
          direccion: gasolinera.direccion,
          latitud: gasolinera.latitud,
          longitud: gasolinera.longitud,
          precio95: gasolinera.precioGasolina95,
          precioDiesel: gasolinera.precioDiesel
        });
      }
      
      return gasolinera;
    });

    console.log('✅ Transformación completada:', gasolineras.length, 'gasolineras');
    
    // Filtrar gasolineras con coordenadas inválidas
    const gasolinerasValidas = gasolineras.filter((g: Gasolinera) => g.latitud !== 0 && g.longitud !== 0);
    
    if (gasolinerasValidas.length < gasolineras.length) {
      console.log('⚠️ Se filtraron', gasolineras.length - gasolinerasValidas.length, 
                  'gasolineras con coordenadas inválidas');
    }
    
    return gasolinerasValidas;
  }

  private parsearCoordenada(coordenada: string): number {
    if (!coordenada || coordenada.trim() === '') {
      console.warn('⚠️ Coordenada vacía:', coordenada);
      return 0;
    }
    
    // Limpiar y convertir
    const limpia = coordenada.replace(',', '.').trim();
    const numero = parseFloat(limpia);
    
    if (isNaN(numero)) {
      console.warn('⚠️ Coordenada no es número:', coordenada, '->', limpia);
      return 0;
    }
    
    return numero;
  }

  private parsearPrecio(precio: string): number {
    if (!precio || precio.trim() === '' || precio === 'N/A' || precio === 'N/D') {
      return 0;
    }
    
    // Limpiar y convertir
    const limpio = precio.replace(',', '.').trim();
    const numero = parseFloat(limpio);
    
    if (isNaN(numero)) {
      console.warn('⚠️ Precio no es número:', precio, '->', limpio);
      return 0;
    }
    
    return numero;
  }

  // Calcular distancia entre dos puntos (Haversine formula)
  calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (lat1 === 0 || lon1 === 0 || lat2 === 0 || lon2 === 0) {
      console.warn('⚠️ Coordenadas inválidas para calcular distancia');
      return Infinity;
    }
    
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  // Filtrar gasolineras según criterios
  filtrarGasolineras(
    gasolineras: Gasolinera[], 
    filtros: Filtros,
    ubicacionUsuario: Ubicacion
  ): Gasolinera[] {
    console.log('🔧 Filtrando', gasolineras.length, 'gasolineras...');
    console.log('📍 Ubicación usuario:', ubicacionUsuario);
    console.log('⚙️ Filtros:', filtros);
    
    if (gasolineras.length === 0) {
      console.log('⚠️ No hay gasolineras para filtrar');
      return [];
    }
    
    if (!ubicacionUsuario.latitud || !ubicacionUsuario.longitud) {
      console.log('⚠️ Ubicación del usuario no válida');
      return [];
    }

    const resultado = gasolineras
      .map(estacion => {
        const distancia = this.calcularDistancia(
          ubicacionUsuario.latitud,
          ubicacionUsuario.longitud,
          estacion.latitud,
          estacion.longitud
        );
        
        return {
          ...estacion,
          distancia: distancia,
          estaAbierta: this.estaAbierta(estacion.horario)
        };
      })
      .filter(estacion => {
        // Filtrar por distancia máxima
        if (filtros.distanciaMaxima > 0 && estacion.distancia > filtros.distanciaMaxima) {
          return false;
        }

        // Filtrar por empresas
        if (filtros.empresas && filtros.empresas.length > 0) {
          const empresaCoincide = filtros.empresas.some((empresa: string) => 
            estacion.rotulo.toLowerCase().includes(empresa.toLowerCase())
          );
          if (!empresaCoincide) {
            return false;
          }
        }

        // Filtrar por tipo de combustible
        if (filtros.tipoCombustible !== 'todos') {
          const propiedadPrecio = `precio${this.capitalize(filtros.tipoCombustible)}` as keyof Gasolinera;
          const precio = estacion[propiedadPrecio];
          
          if (typeof precio !== 'number' || precio <= 0) {
            return false;
          }
        }

        // Filtrar por precio máximo
        if (filtros.precioMaximo > 0) {
          let precioRelevante: number;
          
          if (filtros.tipoCombustible === 'todos') {
            const precios = [
              estacion.precioGasolina95 || Infinity,
              estacion.precioGasolina98 || Infinity,
              estacion.precioDiesel || Infinity,
              estacion.precioDieselPremium || Infinity,
              estacion.precioGLP || Infinity
            ];
            precioRelevante = Math.min(...precios);
          } else {
            const propiedadPrecio = `precio${this.capitalize(filtros.tipoCombustible)}` as keyof Gasolinera;
            precioRelevante = estacion[propiedadPrecio] as number || Infinity;
          }
          
          if (precioRelevante > filtros.precioMaximo) {
            return false;
          }
        }

        // Filtrar solo abiertas
        if (filtros.soloAbiertas && !estacion.estaAbierta) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (filtros.ordenarPor) {
          case 'precio':
            let precioA: number, precioB: number;
            
            if (filtros.tipoCombustible === 'todos') {
              const preciosA = [
                a.precioGasolina95 || Infinity,
                a.precioDiesel || Infinity,
                a.precioGLP || Infinity
              ];
              const preciosB = [
                b.precioGasolina95 || Infinity,
                b.precioDiesel || Infinity,
                b.precioGLP || Infinity
              ];
              precioA = Math.min(...preciosA);
              precioB = Math.min(...preciosB);
            } else {
              const propiedad = `precio${this.capitalize(filtros.tipoCombustible)}` as keyof Gasolinera;
              precioA = a[propiedad] as number || Infinity;
              precioB = b[propiedad] as number || Infinity;
            }
            
            return precioA - precioB;
          
          case 'distancia':
            return (a.distancia || Infinity) - (b.distancia || Infinity);
          
          case 'nombre':
            return a.rotulo.localeCompare(b.rotulo);
          
          default:
            return 0;
        }
      })
      .map((estacion, index, array) => ({
        ...estacion,
        esBarata: index === 0 // Marcar la más barata
      }));

    console.log('📊 Resultado filtrado:', resultado.length, 'gasolineras');
    
    if (resultado.length > 0) {
      console.log('🏆 Primera gasolinera después de filtrar:', {
        rotulo: resultado[0].rotulo,
        distancia: resultado[0].distancia?.toFixed(2),
        precio95: resultado[0].precioGasolina95,
        precioDiesel: resultado[0].precioDiesel
      });
    }
    
    return resultado;
  }

  private estaAbierta(horario: string): boolean {
    if (!horario) return true;
    
    const horarioLower = horario.toLowerCase();
    
    if (horarioLower.includes('24h') || 
        horarioLower.includes('24 horas') ||
        horarioLower.includes('24 horas/día')) {
      return true;
    }
    
    if (horarioLower.includes('l-d') || 
        horarioLower.includes('lunes a domingo')) {
      return true;
    }
    
    // Intentar analizar horario (podría mejorarse)
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutosActual = ahora.getMinutes();
    const tiempoActual = horaActual * 60 + minutosActual;
    
    // Ejemplo: "08:00-22:00"
    const regex = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/;
    const match = horario.match(regex);
    
    if (match) {
      const horaInicio = parseInt(match[1]) * 60 + parseInt(match[2]);
      const horaFin = parseInt(match[3]) * 60 + parseInt(match[4]);
      
      // Si cierra después de medianoche (ej: 22:00-06:00)
      if (horaFin < horaInicio) {
        return tiempoActual >= horaInicio || tiempoActual <= horaFin;
      }
      
      return tiempoActual >= horaInicio && tiempoActual <= horaFin;
    }
    
    // Por defecto, asumir abierta
    return true;
  }

  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
}