import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Filter, FuelType, BrandMode } from '../../models/filter';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filters.html',
  styleUrl: './filters.scss',
})
export class Filters {
  @Output() filterChange = new EventEmitter<Filter>();

  // Valores UI
  fuel: FuelType = 'Gasolina 95 E5';
  radiusKm = 10;

  brandMode: BrandMode = 'all';
  brandsText = ''; // marcas separadas por coma

  sortBy: 'distance' | 'price' = 'distance';

  emitFilters(): void {
    const brands = this.brandsText
      .split(',')
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    this.filterChange.emit({
      fuel: this.fuel,
      radiusKm: Number(this.radiusKm) || 0,
      brandMode: this.brandMode,
      brands,
      sortBy: this.sortBy,
    });
  }
}
