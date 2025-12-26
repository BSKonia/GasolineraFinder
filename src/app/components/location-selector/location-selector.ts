import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Location } from '../../models/location';
import { Geolocation } from '../../services/geolocation';

@Component({
  selector: 'app-location-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-selector.html',
  styleUrl: './location-selector.scss',
})
export class LocationSelector {
  @Output() locationChange = new EventEmitter<Location>();

  latText = '';
  lonText = '';

  errorMsg: string | null = null;
  loading = false;

  constructor(private geo: Geolocation) {}

  emitManualLocation(): void {
    this.errorMsg = null;

    const lat = Number(this.latText.replace(',', '.'));
    const lon = Number(this.lonText.replace(',', '.'));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      this.errorMsg = 'Latitud/longitud inválidas.';
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      this.errorMsg = 'Latitud o longitud fuera de rango.';
      return;
    }

    this.locationChange.emit({ lat, lon });
  }

  async useMyLocation(): Promise<void> {
    this.errorMsg = null;
    this.loading = true;

    try {
      const loc = await this.geo.getCurrentLocation();
      this.latText = String(loc.lat);
      this.lonText = String(loc.lon);
      this.locationChange.emit(loc);
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Error obteniendo ubicación.';
    } finally {
      this.loading = false;
    }
  }
}
