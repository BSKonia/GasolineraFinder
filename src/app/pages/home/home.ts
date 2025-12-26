import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Location } from '../../models/location';
import { Filter } from '../../models/filter';
import { Station } from '../../models/station';

import { LocationSelector } from '../../components/location-selector/location-selector';
import { Filters } from '../../components/filters/filters';

import { haversineKm } from '../../utils/haversine';
import { GasolineraService } from '../../services/api/gasolinera';
import { StationList } from '../../components/station-list/station-list';
import { SummaryBox } from '../../components/summary-box/summary-box';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LocationSelector, Filters, StationList, SummaryBox],  // Añadido SummaryBox aquí
  templateUrl: './home.html',
  styleUrl: './home.scss',
})

export class Home implements OnInit {
  // Ubicación seleccionada
  location: Location | null = null;

  // Filtros (valores por defecto)
  filters: Filter = {
    fuel: 'Gasolina 95 E5',
    radiusKm: 10,
    brandMode: 'all',
    brands: [],
    sortBy: 'distance',
  };

  // Datos
  stations: Station[] = [];
  stationsView: Station[] = [];

  constructor(private gasolineraService: GasolineraService) {}

  ngOnInit(): void {
    this.gasolineraService.getGasolineras().subscribe((data) => {
      this.stations = data;
      this.recompute();
    });
  }

  onLocationChange(loc: Location): void {
    this.location = loc;
    this.recompute();
  }

  onFilterChange(f: Filter): void {
    this.filters = f;
    this.recompute();
  }

  recompute(): void {
    // Si no hay ubicación, no mostramos resultados
    if (!this.location) {
      this.stationsView = [];
      return;
    }

    const fuel = this.filters.fuel;

    // 1) Calcular distancia
    let list: Station[] = this.stations.map((s) => ({
      ...s,
      distanceKm: haversineKm(
        this.location!.lat,
        this.location!.lon,
        s.lat,
        s.lon
      ),
    }));

    // 2) Filtrar por radio (si radiusKm > 0)
    if (this.filters.radiusKm > 0) {
      list = list.filter((s) => (s.distanceKm ?? 0) <= this.filters.radiusKm);
    }

    // 3) Filtrar por carburante (que exista precio)
    list = list.filter((s) => s.prices[fuel] != null);

    // 4) Filtrar por marca (lista blanca/negra)
    if (this.filters.brandMode !== 'all' && this.filters.brands.length > 0) {
      const brandsSet = new Set(
        this.filters.brands.map((b) => b.trim().toLowerCase())
      );

      if (this.filters.brandMode === 'whitelist') {
        list = list.filter((s) => brandsSet.has(s.rotulo.trim().toLowerCase()));
      } else if (this.filters.brandMode === 'blacklist') {
        list = list.filter((s) => !brandsSet.has(s.rotulo.trim().toLowerCase()));
      }
    }

    // 5) Ordenación
    if (this.filters.sortBy === 'distance') {
      list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    } else {
      list.sort((a, b) => (a.prices[fuel] ?? 999) - (b.prices[fuel] ?? 999));
    }

    this.stationsView = list;
  }
}
