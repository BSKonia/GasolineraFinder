// src/app/pages/home/home.ts

import { Component, OnInit, OnDestroy, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { GasolineraService } from '../../services/api/gasolinera';
import { GeolocationService } from '../../services/geolocation';
import { StorageService } from '../../services/storage';
import { CompanyNormalizerService } from '../../services/company-normalizer';

import { Gasolinera, CandidateRouteInfo } from '../../models/station';
import { Filters, FuelType } from '../../models/filter';
import { FiltersComponent } from '../../components/filters/filters';
import { SummaryBoxComponent } from '../../components/summary-box/summary-box';
import { Ubicacion } from '../../models/location';

import { haversineKm } from '../../utils/haversine';

// ✅ Tipos auxiliares para modo ruta
type LatLng = { lat: number; lng: number };

type RouteBaseInfo = {
  distBaseKm: number;
  durBaseSec: number;
  polyline: string;
  points: LatLng[];
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, FiltersComponent, SummaryBoxComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home implements OnInit, OnDestroy, AfterViewChecked {
  // ---------------------------
  // DATA
  // ---------------------------
  gasolineras: Gasolinera[] = [];
  gasolinerasFiltradas: Gasolinera[] = [];
  gasolineraSeleccionada: Gasolinera | null = null;

  modoSeleccionado: 'buscar' | 'ruta' = 'buscar';

  ubicacionUsuario: Ubicacion = {
    latitud: 40.4168,
    longitud: -3.7038,
    calle: '',
    numero: '',
    ciudad: 'Madrid',
    provincia: 'Madrid',
    direccionCompleta: '',
  };

  destino: Ubicacion = {
    latitud: 0,
    longitud: 0,
    calle: '',
    numero: '',
    ciudad: '',
    provincia: '',
    direccionCompleta: '',
  };

  // ✅ Autonomía (km) y reserva (km)
  kmDisponiblesUsuario: number = 0;
  readonly reservaMinKm = 15;
  readonly consumoFijoL100 = 6.0;

  // ✅ Google (opcional). Si no pones key, usa fallback Nominatim para geocoding.
  // Importante: en producción, esto debe ir en environment.ts (no hardcodear keys).
  googleApiKey: string = '';

  filters: Filters = {
    fuelType: 'Gasolina 95 E5',
    companies: [],
    maxPrice: 0,
    maxDistance: 50, // en modo ruta lo usamos como radioKm (corredor)
    onlyOpen: false,
    sortBy: 'distance',
    companyMode: 'include',
  };

  cargando = false;
  busquedaEnCurso = false;
  mostrarResultados = false;
  error: string | null = null;
  empresasDisponibles: string[] = [];
  mostrarBotonScrollTop = false;

  acordeonAbierto = {
    modo: false,
    inicio: false,
    destino: false,
    filtros: false,
    resultados: false,
    detalles: false,
    depuracion: false,
  };

  // Variable para guardar los filtros mientras el usuario los modifica
  filtersTemporales: Filters = { ...this.filters };

  // Observers / listeners
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;

  // ✅ Mantener referencias para poder hacer removeEventListener correctamente
  private onWinResize = () => this.checkScrollNeeded();
  private onWinScroll = () => this.checkScrollNeeded();

  constructor(
    private gasolineraService: GasolineraService,
    private geolocationService: GeolocationService,
    private storageService: StorageService,
    private companyNormalizer: CompanyNormalizerService,
    private http: HttpClient
  ) {}

  // ---------------------------
  // LIFECYCLE
  // ---------------------------
  ngOnInit(): void {
    const savedLocation = this.storageService.obtenerUbicacion();
    if (savedLocation) this.ubicacionUsuario = savedLocation;

    const savedFilters = this.storageService.obtenerFiltros();
    if (savedFilters) {
      this.filtersTemporales = savedFilters;
      this.filters = { ...savedFilters };
    }

    if (!this.filters.companyMode) {
      this.filters.companyMode = 'include';
      this.filtersTemporales.companyMode = 'include';
    }

    this.cargarGasolineras();

    this.setupObservers();
    setTimeout(() => this.checkScrollNeeded(), 100);
  }

  ngAfterViewChecked(): void {
    setTimeout(() => this.checkScrollNeeded(), 50);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.mutationObserver) this.mutationObserver.disconnect();

    window.removeEventListener('resize', this.onWinResize);
    window.removeEventListener('scroll', this.onWinScroll);
  }

  // ---------------------------
  // UI / ACCORDEON
  // ---------------------------
  setModo(modo: 'buscar' | 'ruta'): void {
    if (this.modoSeleccionado === modo) return;

    this.modoSeleccionado = modo;

    if (modo === 'ruta') {
      this.destino = {
        latitud: 0,
        longitud: 0,
        calle: '',
        numero: '',
        ciudad: '',
        provincia: '',
        direccionCompleta: '',
      };
    } else {
      this.acordeonAbierto.destino = false;
    }

    setTimeout(() => this.checkScrollNeeded(), 100);
  }

  toggleAcordeon(seccion: keyof typeof this.acordeonAbierto): void {
    this.acordeonAbierto[seccion] = !this.acordeonAbierto[seccion];
    setTimeout(() => this.checkScrollNeeded(), 350);
  }

  private setupObservers(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.checkScrollNeeded());

      const homeContainer = document.querySelector('.home-container');
      if (homeContainer) this.resizeObserver.observe(homeContainer);

      this.resizeObserver.observe(document.body);
    }

    this.mutationObserver = new MutationObserver(() => this.checkScrollNeeded());

    const homeContainer = document.querySelector('.home-container');
    if (homeContainer) {
      this.mutationObserver.observe(homeContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    window.addEventListener('resize', this.onWinResize);
    window.addEventListener('scroll', this.onWinScroll);
  }

  checkScrollNeeded(): void {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    this.mostrarBotonScrollTop = documentHeight > windowHeight + 50;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------------------------
  // LOCATION
  // ---------------------------
  obtenerUbicacion(): void {
    this.geolocationService
      .getCurrentLocation()
      .then((nuevaUbicacion) => {
        this.ubicacionUsuario = {
          latitud: nuevaUbicacion.latitud,
          longitud: nuevaUbicacion.longitud,
          calle: nuevaUbicacion.calle || '',
          numero: nuevaUbicacion.numero || '',
          ciudad: nuevaUbicacion.ciudad || 'Ubicación actual',
          provincia: nuevaUbicacion.provincia || '',
          direccionCompleta: nuevaUbicacion.direccionCompleta || '',
        };

        this.storageService.guardarUbicacion(this.ubicacionUsuario);
      })
      .catch((error) => {
        alert(`Error obteniendo ubicación: ${error.message}`);
      });
  }

  // ---------------------------
  // SEARCH ENTRYPOINT
  // ---------------------------
  async ejecutarBusqueda(): Promise<void> {
    if (!this.ubicacionUsuario.ciudad && !this.ubicacionUsuario.calle) {
      alert('Por favor, ingresa una ubicación de inicio');
      return;
    }

    if (this.modoSeleccionado === 'ruta' && !this.destino.ciudad && !this.destino.calle) {
      alert('En modo ruta, ingresa una ubicación de destino');
      return;
    }

    if (this.gasolineras.length === 0) {
      alert('No hay gasolineras disponibles. Intenta recargar la página.');
      return;
    }

    this.busquedaEnCurso = true;
    this.error = null;

    this.filters = { ...this.filtersTemporales };

    try {
      if (this.modoSeleccionado === 'buscar') {
        this.ejecutarBusquedaLocal();
      } else {
        await this.ejecutarBusquedaEnRuta();
      }

      this.mostrarResultados = true;

      if (this.gasolinerasFiltradas.length > 0) {
        this.acordeonAbierto.resultados = true;
        setTimeout(() => {
          const elementoResultados = document.getElementById('resultados-container');
          if (elementoResultados) {
            elementoResultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }

      this.storageService.guardarFiltros(this.filters);
      setTimeout(() => this.checkScrollNeeded(), 500);
    } catch (e: any) {
      this.error = e?.message ?? 'Error en la búsqueda.';
    } finally {
      this.busquedaEnCurso = false;
    }
  }

  private ejecutarBusquedaLocal(): void {
    this.aplicarFilters();
  }

  // ---------------------------
  // LOAD STATIONS
  // ---------------------------
  cargarGasolineras(): void {
    this.cargando = true;
    this.error = null;

    this.gasolineraService.getGasolineras().subscribe({
      next: (data) => {
        if (data.length === 0) {
          this.error = 'No se encontraron gasolineras en la API.';
          this.cargando = false;
          return;
        }
        this.gasolineras = data;
        this.extraerEmpresasUnicas();
        this.cargando = false;

        setTimeout(() => this.checkScrollNeeded(), 300);
      },
      error: () => {
        this.error = 'Error al cargar gasolineras. La API podría no estar disponible.';
        this.cargando = false;
      },
    });
  }

  extraerEmpresasUnicas(): void {
    const empresas = this.gasolineras
      .map((g) => this.companyNormalizer.normalizeCompanyName(g.rotulo) || g.rotulo)
      .filter((empresa, index, self) => empresa && self.indexOf(empresa) === index)
      .sort();

    this.empresasDisponibles = empresas;
  }

  // ---------------------------
  // FILTERS (local)
  // ---------------------------
  aplicarFilters(): void {
    if (!this.gasolineras.length) return;

    this.gasolinerasFiltradas = this.gasolineraService.filtrarGasolineras(
      this.gasolineras,
      this.filters,
      this.ubicacionUsuario
    );

    this.ordenarGasolineras();
    setTimeout(() => this.checkScrollNeeded(), 100);
  }

  ordenarGasolineras(): void {
    this.gasolinerasFiltradas.forEach((g) => {
      g.distanceKm = this.gasolineraService.calcularDistancia(
        this.ubicacionUsuario.latitud,
        this.ubicacionUsuario.longitud,
        g.latitud,
        g.longitud
      );
    });

    if (this.filters.sortBy === 'distance') {
      this.gasolinerasFiltradas.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
    } else if (this.filters.sortBy === 'price') {
      this.gasolinerasFiltradas.sort((a, b) => {
        const precioA = this.obtenerPrecioRelevante(a);
        const precioB = this.obtenerPrecioRelevante(b);

        if (precioA === 0 && precioB === 0) return 0;
        if (precioA === 0) return 1;
        if (precioB === 0) return -1;

        return precioA - precioB;
      });
    }
  }

  obtenerPrecioRelevante(g: Gasolinera): number {
    switch (this.filters.fuelType) {
      case 'Gasolina 95 E5':
        return g.precioGasolina95;
      case 'Gasolina 98 E5':
        return g.precioGasolina98;
      case 'Gasóleo A':
        return g.precioDiesel;
      case 'Gasóleo Premium':
        return g.precioDieselPremium;
      case 'GLP':
        return g.precioGLP;
      default:
        return g.precioGasolina95;
    }
  }

  onFiltersCambiados(nuevosFilters: Filters): void {
    this.filtersTemporales = nuevosFilters;
  }

  onGasolineraSeleccionada(g: Gasolinera): void {
    this.gasolinerasFiltradas = this.gasolinerasFiltradas;
    this.gasolineraSeleccionada = g;
    this.acordeonAbierto.detalles = true;
    setTimeout(() => this.checkScrollNeeded(), 100);
  }

  // ---------------------------
  // RESET
  // ---------------------------
  restablecerTodo(): void {
    Object.keys(this.acordeonAbierto).forEach((key) => {
      this.acordeonAbierto[key as keyof typeof this.acordeonAbierto] = false;
    });

    this.filters = {
      fuelType: 'Gasolina 95 E5',
      companies: [],
      maxPrice: 0,
      maxDistance: 50,
      onlyOpen: false,
      sortBy: 'distance',
      companyMode: 'include',
    };
    this.filtersTemporales = { ...this.filters };

    this.ubicacionUsuario = {
      latitud: 0,
      longitud: 0,
      calle: '',
      numero: '',
      ciudad: '',
      provincia: '',
      direccionCompleta: '',
    };

    this.setModo('buscar');

    this.destino = {
      latitud: 0,
      longitud: 0,
      calle: '',
      numero: '',
      ciudad: '',
      provincia: '',
      direccionCompleta: '',
    };

    this.kmDisponiblesUsuario = 0;

    this.gasolineraSeleccionada = null;
    this.error = null;
    this.mostrarResultados = false;
    this.gasolinerasFiltradas = [];

    this.storageService.guardarUbicacion(this.ubicacionUsuario);
    this.storageService.guardarFiltros(this.filters);

    this.cargarGasolineras();
  }

  restablecerFiltros(): void {
    this.filtersTemporales = {
      fuelType: 'Gasolina 95 E5',
      companies: [],
      maxPrice: 0,
      maxDistance: 50,
      onlyOpen: false,
      sortBy: 'distance',
      companyMode: 'include',
    };

    if (this.mostrarResultados) {
      this.filters = { ...this.filtersTemporales };
      this.aplicarFilters();
      this.storageService.guardarFiltros(this.filters);
    }
  }

  // =========================================================
  // ✅ MODO RUTA
  // =========================================================
  private async ejecutarBusquedaEnRuta(): Promise<void> {
    const kmUsables = Number(this.kmDisponiblesUsuario) - this.reservaMinKm;
    if (!Number.isFinite(kmUsables) || kmUsables <= 0) {
      throw new Error(`Autonomía insuficiente: reserva mínima ${this.reservaMinKm} km.`);
    }

    const origen = await this.resolveLatLngFromUbicacion(this.ubicacionUsuario);
    const destino = await this.resolveLatLngFromUbicacion(this.destino);

    // ✅ Ruta base real
    const base = await this.getRouteBase(origen, destino);

    const filtradasPorDataset = this.filtrarDatasetSinDistanciaCircular(this.gasolineras, this.filters);

    const radioKm = this.filters.maxDistance;
    const candidatasCorredor = this.filtrarPorCorredorRuta(filtradasPorDataset, base.points, radioKm);

    let N = this.clamp(Math.round((base.distBaseKm / 100) * 20), 20, 60);
    if (kmUsables < 80) N = Math.min(N, 30);

    const preRank = this.preRankCandidates(candidatasCorredor, base.points, this.filters);
    const topN = preRank.slice(0, N);

    const enriched = await this.mapWithConcurrency(topN, 5, async (g) => {
      const stop = { lat: g.latitud, lng: g.longitud };

      // ✅ Ruta con parada (distancias reales)
      const info = await this.getRouteWithStop(origen, stop, destino);

      // ✅ FIX CRÍTICO: calcular extraKmReal con la base
      const extraKmReal = Math.max(0, info.distConParadaKm - base.distBaseKm);

      // Autonomía “hasta llegar”
      if (info.distToGasKm > kmUsables) return null;

      const precioLitro = this.getPrecioLitroSegunFiltro(g, this.filters.fuelType);
      const litrosExtra = (extraKmReal * this.consumoFijoL100) / 100;
      const costeDesvio = litrosExtra * precioLitro;

      const finalInfo: CandidateRouteInfo = {
        distToGasKm: info.distToGasKm,
        distConParadaKm: info.distConParadaKm,
        extraKmReal,
        litrosExtra,
        costeDesvio,
      };

      g.routeInfo = finalInfo;

      // Para ordenar por “distance” en modo ruta, usamos extraKmReal
      g.distanceKm = finalInfo.extraKmReal;

      return g;
    });

    const validas = enriched.filter((x): x is Gasolinera => x !== null);

    validas.sort((a, b) => {
      // ✅ SIN any (ya está tipado en el modelo)
      const ia = a.routeInfo;
      const ib = b.routeInfo;

      const extraA = ia?.extraKmReal ?? Number.POSITIVE_INFINITY;
      const extraB = ib?.extraKmReal ?? Number.POSITIVE_INFINITY;

      const precioA = this.getPrecioLitroSegunFiltro(a, this.filters.fuelType);
      const precioB = this.getPrecioLitroSegunFiltro(b, this.filters.fuelType);

      if (this.filters.sortBy === 'distance') {
        if (extraA !== extraB) return extraA - extraB;
        return precioA - precioB;
      } else {
        if (precioA !== precioB) return precioA - precioB;
        return extraA - extraB;
      }
    });

    this.gasolinerasFiltradas = validas.slice(0, 3);
  }

  // ---------------------------
  // Dataset filtering (ruta)
  // ---------------------------
  private filtrarDatasetSinDistanciaCircular(gasolineras: Gasolinera[], filtros: Filters): Gasolinera[] {
    return gasolineras.filter((g) => {
      if (!this.tieneCombustibleYPrecioOK(g, filtros)) return false;

      if (filtros.companies && filtros.companies.length > 0) {
        const pertenece = filtros.companies.some((empresa) =>
          this.companyNormalizer.belongsToCompany(g.rotulo, empresa)
        );

        if (filtros.companyMode === 'include' && !pertenece) return false;
        if (filtros.companyMode === 'exclude' && pertenece) return false;
      }

      if (filtros.onlyOpen) {
        if (!this.estaAbiertaRudimentario(g.horario || '')) return false;
      }

      return true;
    });
  }

  private tieneCombustibleYPrecioOK(g: Gasolinera, filtros: Filters): boolean {
    if (filtros.fuelType === 'all') {
      const precios = [
        g.precioGasolina95,
        g.precioGasolina98,
        g.precioDiesel,
        g.precioDieselPremium,
        g.precioGLP,
      ].filter((p) => p > 0);

      if (precios.length === 0) return false;

      if (filtros.maxPrice > 0) {
        const min = Math.min(...precios);
        if (min > filtros.maxPrice) return false;
      }
      return true;
    }

    const precio = this.getPrecioLitroSegunFiltro(g, filtros.fuelType);
    if (!(precio > 0)) return false;

    if (filtros.maxPrice > 0 && precio > filtros.maxPrice) return false;

    return true;
  }

  private getPrecioLitroSegunFiltro(g: Gasolinera, fuelType: FuelType): number {
    switch (fuelType) {
      case 'Gasolina 95 E5':
        return g.precioGasolina95 || 0;
      case 'Gasolina 98 E5':
        return g.precioGasolina98 || 0;
      case 'Gasóleo A':
        return g.precioDiesel || 0;
      case 'Gasóleo Premium':
        return g.precioDieselPremium || 0;
      case 'GLP':
        return g.precioGLP || 0;
      case 'all': {
        const precios = [
          g.precioGasolina95,
          g.precioGasolina98,
          g.precioDiesel,
          g.precioDieselPremium,
          g.precioGLP,
        ].filter((p) => p > 0);
        return precios.length ? Math.min(...precios) : 0;
      }
      default:
        return 0;
    }
  }

  private estaAbiertaRudimentario(horario: string): boolean {
    const h = (horario || '').toLowerCase();
    if (!h) return true;
    if (h.includes('cerrad')) return false;
    if (h.includes('clausur')) return false;
    return true;
  }

  // ---------------------------
  // Corredor de ruta
  // ---------------------------
  private filtrarPorCorredorRuta(gasolineras: Gasolinera[], routePoints: LatLng[], radioKm: number): Gasolinera[] {
    if (routePoints.length < 2) return [];

    const sampled = this.sampleRoutePoints(routePoints, 1.5);

    return gasolineras.filter((g) => {
      const p: LatLng = { lat: g.latitud, lng: g.longitud };
      const d = this.minDistancePointToPolylineKm(p, sampled);
      return d <= radioKm;
    });
  }

  private preRankCandidates(candidates: Gasolinera[], routePoints: LatLng[], filtros: Filters): Gasolinera[] {
    const sampled = this.sampleRoutePoints(routePoints, 1.5);

    const withMetric = candidates.map((g) => {
      const p = { lat: g.latitud, lng: g.longitud };
      const minDist = this.minDistancePointToPolylineKm(p, sampled);
      (g as any)._minDistToRouteKm = minDist;
      return g;
    });

    if (filtros.sortBy === 'price') {
      withMetric.sort((a, b) => {
        const pa = this.getPrecioLitroSegunFiltro(a, filtros.fuelType);
        const pb = this.getPrecioLitroSegunFiltro(b, filtros.fuelType);
        if (pa !== pb) return pa - pb;
        return ((a as any)._minDistToRouteKm ?? 999) - ((b as any)._minDistToRouteKm ?? 999);
      });
    } else {
      withMetric.sort((a, b) => {
        const da = (a as any)._minDistToRouteKm ?? 999;
        const db = (b as any)._minDistToRouteKm ?? 999;
        if (da !== db) return da - db;
        const pa = this.getPrecioLitroSegunFiltro(a, filtros.fuelType);
        const pb = this.getPrecioLitroSegunFiltro(b, filtros.fuelType);
        return pa - pb;
      });
    }

    return withMetric;
  }

  private sampleRoutePoints(points: LatLng[], stepKm: number): LatLng[] {
    if (points.length <= 2) return points;

    const out: LatLng[] = [points[0]];
    let acc = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const d = haversineKm(prev.lat, prev.lng, cur.lat, cur.lng);
      acc += d;

      if (acc >= stepKm) {
        out.push(cur);
        acc = 0;
      }
    }

    if (out[out.length - 1] !== points[points.length - 1]) {
      out.push(points[points.length - 1]);
    }
    return out;
  }

  private minDistancePointToPolylineKm(p: LatLng, poly: LatLng[]): number {
    let best = Number.POSITIVE_INFINITY;

    for (let i = 1; i < poly.length; i++) {
      const a = poly[i - 1];
      const b = poly[i];
      const d = this.distancePointToSegmentKm(p, a, b);
      if (d < best) best = d;
    }
    return best;
  }

  private distancePointToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
    const R = 6371;

    const lat0 = (p.lat * Math.PI) / 180;
    const x = (lng: number) => ((lng * Math.PI) / 180) * Math.cos(lat0) * R;
    const y = (lat: number) => ((lat * Math.PI) / 180) * R;

    const px = x(p.lng);
    const py = y(p.lat);

    const ax = x(a.lng);
    const ay = y(a.lat);

    const bx = x(b.lng);
    const by = y(b.lat);

    const abx = bx - ax;
    const aby = by - ay;

    const apx = px - ax;
    const apy = py - ay;

    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) {
      const dx = px - ax;
      const dy = py - ay;
      return Math.sqrt(dx * dx + dy * dy);
    }

    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));

    const cx = ax + t * abx;
    const cy = ay + t * aby;

    const dx = px - cx;
    const dy = py - cy;

    return Math.sqrt(dx * dx + dy * dy);
  }

  // ---------------------------
  // Geocoding + Routes (Google / fallback)
  // ---------------------------
  private async resolveLatLngFromUbicacion(u: Ubicacion): Promise<LatLng> {
    if (Number.isFinite(u.latitud) && Number.isFinite(u.longitud) && u.latitud !== 0 && u.longitud !== 0) {
      return { lat: u.latitud, lng: u.longitud };
    }

    const texto = this.formatAddress(u);
    if (!texto.trim()) throw new Error('Dirección inválida para geocodificar.');

    if (this.googleApiKey) {
      return await this.googleGeocode(texto);
    }

    return await this.nominatimGeocode(texto);
  }

  private formatAddress(u: Ubicacion): string {
    const parts = [u.calle, u.numero, u.ciudad, u.provincia].filter(Boolean);
    return parts.join(', ');
  }

  private async googleGeocode(address: string): Promise<LatLng> {
    const url =
      'https://maps.googleapis.com/maps/api/geocode/json?address=' +
      encodeURIComponent(address) +
      '&key=' +
      encodeURIComponent(this.googleApiKey);

    const res: any = await this.http.get(url).toPromise();
    const loc = res?.results?.[0]?.geometry?.location;
    if (!loc) throw new Error('No se pudo geocodificar la dirección (Google).');

    return { lat: loc.lat, lng: loc.lng };
  }

  private async nominatimGeocode(address: string): Promise<LatLng> {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es&q=' +
      encodeURIComponent(address);

    const res: any = await this.http.get(url).toPromise();
    const item = res?.[0];
    if (!item) throw new Error('No se pudo geocodificar la dirección (Nominatim).');

    return { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
  }

  private async getRouteBase(origen: LatLng, destino: LatLng): Promise<RouteBaseInfo> {
    if (!this.googleApiKey) {
      const dist = haversineKm(origen.lat, origen.lng, destino.lat, destino.lng);
      const points = [origen, destino];
      return { distBaseKm: dist, durBaseSec: 0, polyline: '', points };
    }

    const body = {
      origin: { location: { latLng: { latitude: origen.lat, longitude: origen.lng } } },
      destination: { location: { latLng: { latitude: destino.lat, longitude: destino.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
      computeAlternativeRoutes: false,
      routeModifiers: { avoidTolls: false, avoidHighways: false, avoidFerries: false },
      languageCode: 'es-ES',
      units: 'METRIC',
    };

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.googleApiKey,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    };

    const res: any = await this.http.post(url, body, { headers }).toPromise();

    const route = res?.routes?.[0];
    if (!route) throw new Error('No se pudo calcular la ruta base (Google Routes).');

    const distBaseKm = (route.distanceMeters || 0) / 1000;
    const durBaseSec = this.parseGoogleDurationSeconds(route.duration);
    const polyline = route.polyline?.encodedPolyline || '';
    const points = polyline ? this.decodePolyline(polyline) : [origen, destino];

    return { distBaseKm, durBaseSec, polyline, points };
  }

  private async getRouteWithStop(
    origen: LatLng,
    stop: LatLng,
    destino: LatLng
  ): Promise<{ distToGasKm: number; distConParadaKm: number }> {
    if (!this.googleApiKey) {
      const distTo = haversineKm(origen.lat, origen.lng, stop.lat, stop.lng);
      const distTot = distTo + haversineKm(stop.lat, stop.lng, destino.lat, destino.lng);
      return { distToGasKm: distTo, distConParadaKm: distTot };
    }

    const body = {
      origin: { location: { latLng: { latitude: origen.lat, longitude: origen.lng } } },
      destination: { location: { latLng: { latitude: destino.lat, longitude: destino.lng } } },
      intermediates: [{ location: { latLng: { latitude: stop.lat, longitude: stop.lng } } }],
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
      computeAlternativeRoutes: false,
      languageCode: 'es-ES',
      units: 'METRIC',
    };

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.googleApiKey,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.legs.distanceMeters',
    };

    const res: any = await this.http.post(url, body, { headers }).toPromise();
    const route = res?.routes?.[0];
    if (!route) throw new Error('No se pudo calcular la ruta con parada (Google Routes).');

    const legs = route.legs || [];
    const leg1 = legs[0];
    const distToGasKm = ((leg1?.distanceMeters || 0) / 1000) || 0;
    const distConParadaKm = (route.distanceMeters || 0) / 1000;

    return { distToGasKm, distConParadaKm };
  }

  private parseGoogleDurationSeconds(duration: any): number {
    if (typeof duration === 'string' && duration.endsWith('s')) {
      const n = Number(duration.replace('s', ''));
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  private decodePolyline(encoded: string): LatLng[] {
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;
    const points: LatLng[] = [];

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }

    return points;
  }

  // ---------------------------
  // Helpers
  // ---------------------------
  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T, idx: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length) as any;
    let i = 0;

    const workers = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await fn(items[idx], idx);
      }
    });

    await Promise.all(workers);
    return results;
  }
}
