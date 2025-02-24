import { TestBed } from '@angular/core/testing';

import { TransformersService } from './transformers.service';

describe('TransformersService', () => {
  let service: TransformersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransformersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
