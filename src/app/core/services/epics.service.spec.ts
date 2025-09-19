import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EpicsService } from './epics.service';
import { ApiService } from './api.service';

describe('EpicsService', () => {
  let service: EpicsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService, EpicsService]
    });
    service = TestBed.inject(EpicsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should retrieve epics for a project', () => {
    service.list('p1').subscribe(epics => {
      expect(epics).toEqual([{ id: 'e1', name: 'Epic 1' }]);
    });

    const req = http.expectOne('http://localhost:3000/projects/p1/epics');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'e1', name: 'Epic 1' }]);
  });
});
