import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Station } from '../../models/station';
import { Filter } from '../../models/filter';

@Component({
  selector: 'app-station-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './station-list.html',
  styleUrl: './station-list.scss',
})
export class StationList {
  @Input() stations: Station[] = [];
  @Input() filters!: Filter;
}
