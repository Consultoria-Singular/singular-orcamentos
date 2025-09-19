import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BudgetItemsService } from './budget-items.service';
import { ApiService } from './api.service';

describe('BudgetItemsService', () => {
  let service: BudgetItemsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService, BudgetItemsService]
    });
    service = TestBed.inject(BudgetItemsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should create a budget item and adapt the response', () => {
    service.create('p1', {
      epicId: 'e1',
      name: 'Novo item',
      hours: 5,
      qa: true
    }).subscribe(item => {
      expect(item.id).toBe('b1');
      expect(item.epicId).toBe('e1');
      expect(item.qa).toBeTrue();
    });

    const req = http.expectOne('http://localhost:3000/projects/p1/budget-items');
    expect(req.request.method).toBe('POST');

    req.flush({
      id: 'b1',
      epic_id: 'e1',
      name: 'Novo item',
      hours: 5,
      qa: true
    });
  });
});
