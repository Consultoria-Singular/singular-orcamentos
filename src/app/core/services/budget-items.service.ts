import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BudgetItem } from '../models/budget-item.model';
import { adaptBudgetItemDto, BudgetItemDto } from '../../services/adapters';

export interface BudgetItemPayload {
  epicId: string;
  name: string;
  hours: number;
  qa?: boolean;
  architect?: boolean;
  design?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BudgetItemsService {
  private readonly api = inject(ApiService);

  list(projectId: string): Observable<BudgetItem[]> {
    return this.api.get<BudgetItemDto[]>(`/projects/${projectId}/budget-items`).pipe(
      tap(dto => console.log('[BudgetItemsService] list dto', dto)),
      map(items => items.map(adaptBudgetItemDto))
    );
  }

  create(projectId: string, payload: BudgetItemPayload): Observable<BudgetItem> {
    console.log('[BudgetItemsService] create payload', payload);
    return this.api.post<BudgetItemDto>(`/projects/${projectId}/budget-items`, payload).pipe(
      tap(dto => console.log('[BudgetItemsService] create response dto', dto)),
      map(dto => {
        const item = adaptBudgetItemDto(dto);
        if (!item.epicId) {
          item.epicId = payload.epicId;
        }
        return item;
      })
    );
  }

  update(projectId: string, itemId: string, payload: BudgetItemPayload): Observable<BudgetItem> {
    console.log('[BudgetItemsService] update payload', payload);
    return this.api.put<BudgetItemDto>(`/projects/${projectId}/budget-items/${itemId}`, payload).pipe(
      tap(dto => console.log('[BudgetItemsService] update response dto', dto)),
      map(dto => {
        const item = adaptBudgetItemDto(dto);
        if (!item.epicId) {
          item.epicId = payload.epicId;
        }
        return item;
      })
    );
  }

  delete(projectId: string, itemId: string): Observable<void> {
    return this.api.delete<void>(`/projects/${projectId}/budget-items/${itemId}`);
  }
}
