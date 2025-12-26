import { TestBed } from '@angular/core/testing';
import { Geolocation } from './geolocation';

describe('Geolocation', () => {
  it('should be created', () => {
    const service = TestBed.inject(Geolocation);
    expect(service).toBeTruthy();
  });
});
