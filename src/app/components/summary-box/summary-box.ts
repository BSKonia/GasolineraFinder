import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Station } from '../../models/station';
import { Filter } from '../../models/filter';

@Component({
  selector: 'app-summary-box',  // Asegúrate de que esto sea 'app-summary-box'
  standalone: true,
  imports: [CommonModule],
  templateUrl: './summary-box.html',
  styleUrl: './summary-box.scss',
})
export class SummaryBox {
  @Input() stations: Station[] = [];
  @Input() filters!: Filter;

  get nearest(): Station | null {
    if (!this.stations?.length) return null;
    return [...this.stations].sort(
      (a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
    )[0];
  }

  get cheapestInRadius(): Station | null {
    if (!this.stations?.length) return null;
    const fuel = this.filters?.fuel;
    return [...this.stations].sort(
      (a, b) => (a.prices[fuel] ?? 999) - (b.prices[fuel] ?? 999)
    )[0];
  }
}
