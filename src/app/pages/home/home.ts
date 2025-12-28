import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GasolineraService } from '../../services/api/gasolinera';
import { GeolocationService } from '../../services/geolocation';
import { StorageService } from '../../services/storage';
import { Gasolinera } from '../../models/station';
import { Filtros } from '../../models/filter';
import { Ubicacion } from '../../models/location';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {
  gasolineras: Gasolinera[] = [];
  gasolinerasFiltradas: Gasolinera[] = [];
  gasolineraSeleccionada: Gasolinera | null = null;
  
  ubicacionUsuario: Ubicacion = {
    latitud: 40.4168,
    longitud: -3.7038,
    ciudad: 'Madrid'
  };
  
  filtros: Filtros = {
    tipoCombustible: 'todos',
    empresas: [],
    precioMaximo: 0,
    distanciaMaxima: 50,
    soloAbiertas: false,
    ordenarPor: 'distancia'
  };
  
  cargando = false;
  error: string | null = null;
  empresasDisponibles: string[] = [];

  constructor(
    private gasolineraService: GasolineraService,
    private geolocationService: GeolocationService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Inicializando GasolineraFinder...');
    
    // 1. Primero intenta cargar ubicación guardada
    const ubicacionGuardada = this.storageService.obtenerUbicacion();
    if (ubicacionGuardada) {
      this.ubicacionUsuario = ubicacionGuardada;
      console.log('📍 Ubicación cargada de storage:', ubicacionGuardada);
      this.cargarGasolineras();
      return;
    }
    
    // 2. Si no hay guardada, intenta geolocalización
    this.obtenerUbicacion();
  }

  obtenerUbicacion(): void {
    console.log('📍 Intentando obtener ubicación...');
    
    this.geolocationService.getCurrentLocation().then((ubicacion) => {
      console.log('📍 Ubicación obtenida:', ubicacion);
      this.ubicacionUsuario = {
        ...ubicacion,
        ciudad: 'Ubicación actual' // Añade ciudad si no viene
      };
      this.storageService.guardarUbicacion(this.ubicacionUsuario);
      this.cargarGasolineras();
    }).catch((error) => {
      console.warn('⚠️ Error en geolocalización:', error);
      
      // Fallback: usar Madrid por defecto
      console.log('📍 Usando ubicación por defecto (Madrid)');
      this.ubicacionUsuario = {
        latitud: 40.4168,
        longitud: -3.7038,
        ciudad: 'Madrid'
      };
      
      this.cargarGasolineras();
    });
  }

  cargarGasolineras(): void {
    console.log('🌐 Iniciando carga de gasolineras para:', this.ubicacionUsuario);
    
    this.cargando = true;
    this.error = null;
    
    console.log('✅ Llamando a API para obtener gasolineras...');
    
    this.gasolineraService.getGasolineras().subscribe({
      next: (data) => {
        console.log('✅ API respondió con', data.length, 'gasolineras');
        
        if (data.length === 0) {
          this.error = 'No se encontraron gasolineras en la API.';
          this.cargando = false;
          return;
        }
        
        console.log('Primera gasolinera:', data[0]);
        
        this.gasolineras = data;
        this.extraerEmpresasUnicas();
        this.aplicarFiltros();
        this.cargando = false;
        
        console.log('🎯 Gasolineras filtradas:', this.gasolinerasFiltradas.length);
      },
      error: (error) => {
        console.error('❌ Error en API:', error);
        this.error = 'Error al cargar las gasolineras. La API podría no estar disponible.';
        this.cargando = false;
      }
    });
  }

  extraerEmpresasUnicas(): void {
    const empresas = this.gasolineras
      .map(g => g.rotulo)
      .filter((rotulo, index, self) => rotulo && self.indexOf(rotulo) === index)
      .sort();
    
    this.empresasDisponibles = empresas.slice(0, 20);
    console.log('🏢 Empresas disponibles:', this.empresasDisponibles.length);
  }

  aplicarFiltros(): void {
    if (!this.gasolineras.length) {
      console.log('⚠️ No hay gasolineras para filtrar');
      return;
    }
    
    console.log('🔧 Aplicando filtros:', this.filtros);
    
    this.gasolinerasFiltradas = this.gasolineraService.filtrarGasolineras(
      this.gasolineras,
      this.filtros,
      this.ubicacionUsuario
    );
    
    // Guardar filtros
    this.storageService.guardarFiltros(this.filtros);
    
    console.log('📊 Resultados después de filtrar:', this.gasolinerasFiltradas.length);
  }

  onFiltrosCambiados(nuevosFiltros: Filtros): void {
    console.log('🔄 Filtros cambiados:', nuevosFiltros);
    this.filtros = nuevosFiltros;
    this.aplicarFiltros();
  }

  onUbicacionCambiada(nuevaUbicacion: Ubicacion): void {
    console.log('📍 Ubicación cambiada:', nuevaUbicacion);
    this.ubicacionUsuario = nuevaUbicacion;
    this.storageService.guardarUbicacion(nuevaUbicacion);
    this.aplicarFiltros();
  }

  onGasolineraSeleccionada(gasolinera: Gasolinera): void {
    console.log('🎯 Gasolinera seleccionada:', gasolinera.rotulo);
    this.gasolineraSeleccionada = gasolinera;
  }
  
  obtenerPrecioRelevante(gasolinera: Gasolinera): number {
    const precios = [];
    
    if (gasolinera.precioGasolina95 > 0) precios.push(gasolinera.precioGasolina95);
    if (gasolinera.precioGasolina98 > 0) precios.push(gasolinera.precioGasolina98);
    if (gasolinera.precioDiesel > 0) precios.push(gasolinera.precioDiesel);
    if (gasolinera.precioDieselPremium > 0) precios.push(gasolinera.precioDieselPremium);
    if (gasolinera.precioGLP > 0) precios.push(gasolinera.precioGLP);
    
    return precios.length > 0 ? Math.min(...precios) : 0;
  }
  
  // Método para recargar gasolineras manualmente
  recargarGasolineras(): void {
    console.log('🔄 Recargando gasolineras manualmente...');
    this.cargarGasolineras();
  }
  
  // Método para usar coordenadas manuales (si añades inputs)
  usarCoordenadasManuales(latitud: number, longitud: number): void {
    console.log('📍 Estableciendo coordenadas manuales:', { latitud, longitud });
    this.ubicacionUsuario = {
      latitud: latitud,
      longitud: longitud,
      ciudad: 'Ubicación manual'
    };
    this.storageService.guardarUbicacion(this.ubicacionUsuario);
    this.cargarGasolineras();
  }
}