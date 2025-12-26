import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SummaryBox } from './summary-box';

describe('SummaryBox', () => {
  let component: SummaryBox;
  let fixture: ComponentFixture<SummaryBox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryBox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SummaryBox);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
