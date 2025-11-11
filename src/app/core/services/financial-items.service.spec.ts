import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FinancialItemsService } from './financial-items.service';
import { environment } from '@environments/environment';
import { FinancialItemInput } from '../models/financial-item.model';

describe('FinancialItemsService', () => {
  let service: FinancialItemsService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.API_BASE_URL.replace(/\/$/, '');

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FinancialItemsService]
    });

    service = TestBed.inject(FinancialItemsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list items and normalize payload', () => {
    const projectId = 'project-1';
    const dtoResponse = [
      {
        _id: 'fin-1',
        projectId,
        name: ' Sprint 10 pagamento ',
        type: 'expense',
        value: '1.234,50',
        status: 'pending',
        epicId: 'epic-1',
        sprint: 'Sprint 10',
        paymentDate: '2024-04-10T12:00:00.000Z',
        task: 'TASK-10'
      }
    ];

    service.list(projectId).subscribe(items => {
      expect(items).toEqual([
        {
          id: 'fin-1',
          projectId,
          name: 'Sprint 10 pagamento',
          type: 'expense',
          value: 1234.5,
          status: 'pending',
          epicId: 'epic-1',
          sprint: 'Sprint 10',
          paymentDate: '2024-04-10',
          task: 'TASK-10'
        }
      ]);
    });

    const request = httpMock.expectOne(`${baseUrl}/projects/${projectId}/financial-items`);
    expect(request.request.method).toBe('GET');
    request.flush(dtoResponse);
  });

  it('should create item with sanitized body', () => {
    const projectId = 'project-2';
    const payload: FinancialItemInput = {
      name: '  Nova receita ',
      type: 'revenue',
      value: 1500,
      status: 'pending',
      epicId: '',
      sprint: '   ',
      paymentDate: '2024-05-05',
      task: ' TASK-55 '
    };

    service.create(projectId, payload).subscribe();

    const request = httpMock.expectOne(`${baseUrl}/projects/${projectId}/financial-items`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Nova receita',
      type: 'revenue',
      value: 1500,
      status: 'pending',
      epicId: null,
      sprint: null,
      paymentDate: '2024-05-05',
      task: 'TASK-55'
    });
    request.flush({
      _id: 'fin-2',
      projectId,
      name: 'Nova receita',
      type: 'revenue',
      value: 1500,
      status: 'pending'
    });
  });

  it('should update item with provided fields only', () => {
    const itemId = 'fin-3';
    service.update(itemId, { status: 'paid', value: 0 }).subscribe();

    const request = httpMock.expectOne(`${baseUrl}/financial-items/${itemId}`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      status: 'paid',
      value: 0
    });
    request.flush({ _id: itemId });
  });

  it('should delete item', () => {
    const itemId = 'fin-4';
    service.delete(itemId).subscribe();

    const request = httpMock.expectOne(`${baseUrl}/financial-items/${itemId}`);
    expect(request.request.method).toBe('DELETE');
    request.flush({});
  });
});
