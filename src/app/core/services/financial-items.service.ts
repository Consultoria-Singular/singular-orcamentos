import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { FinancialItem, FinancialItemInput, FinancialItemUpdate } from '../models/financial-item.model';

type FinancialItemDto = {
  _id?: string;
  id?: string;
  projectId?: string;
  project?: string;
  name?: string;
  type?: string;
  value?: number | string;
  status?: string;
  epicId?: string | { _id?: string } | null;
  epic?: string | null;
  sprint?: string | null;
  paymentDate?: string | Date | null;
  task?: string | null;
};

@Injectable({ providedIn: 'root' })
export class FinancialItemsService {
  private readonly api = inject(ApiService);

  list(projectId: string): Observable<FinancialItem[]> {
    return this.api
      .get<FinancialItemDto[]>(`/projects/${projectId}/financial-items`)
      .pipe(map(items => (Array.isArray(items) ? items : []).map(adaptFinancialItemDto)));
  }

  create(projectId: string, payload: FinancialItemInput): Observable<FinancialItem> {
    const body = adaptFinancialItemInput(payload, { includeEmpty: true });
    return this.api
      .post<FinancialItemDto>(`/projects/${projectId}/financial-items`, body)
      .pipe(
        tap(response => console.log('[FinancialItemsService] POST financial item response', response)),
        map(adaptFinancialItemDto)
      );
  }

  update(itemId: string, payload: FinancialItemUpdate): Observable<FinancialItem> {
    const body = adaptFinancialItemInput(payload, { includeEmpty: false });
    return this.api
      .patch<FinancialItemDto>(`/financial-items/${itemId}`, body)
      .pipe(
        tap(response => console.log('[FinancialItemsService] PATCH financial item response', response)),
        map(adaptFinancialItemDto)
      );
  }

  delete(itemId: string): Observable<void> {
    return this.api.delete<void>(`/financial-items/${itemId}`);
  }
}

const adaptFinancialItemDto = (dto: FinancialItemDto): FinancialItem => {
  const id = (dto._id ?? dto.id ?? '').toString();
  const projectId = sanitizeId(dto.projectId ?? dto.project ?? '');
  const resolvedPaymentDate = normalizeDateOnly(dto.paymentDate);
  return {
    id: id || generateFallbackId(),
    projectId: projectId || '',
    name: sanitizeText(dto.name, 'Item financeiro'),
    type: sanitizeText(dto.type, 'N/A'),
    value: parseNumber(dto.value),
    status: sanitizeText(dto.status, 'pending'),
    epicId: resolveEpicId(dto),
    sprint: sanitizeOptional(dto.sprint),
    paymentDate: resolvedPaymentDate,
    task: sanitizeOptional(dto.task)
  };
};

const adaptFinancialItemInput = (
  payload: FinancialItemInput | FinancialItemUpdate,
  options: { includeEmpty: boolean }
): Record<string, unknown> => {
  const body: Record<string, unknown> = {};

  if (payload.name !== undefined || options.includeEmpty) {
    body['name'] = sanitizeText(payload.name, '');
  }
  if (payload.type !== undefined || options.includeEmpty) {
    body['type'] = sanitizeText(payload.type, '');
  }
  if (payload.value !== undefined || options.includeEmpty) {
    body['value'] = parseNumber(payload.value);
  }
  if (payload.status !== undefined || options.includeEmpty) {
    body['status'] = sanitizeText(payload.status ?? 'pending', 'pending');
  }
  if ('epicId' in payload || options.includeEmpty) {
    const epicId = typeof payload.epicId === 'string' ? payload.epicId.trim() : '';
    body['epicId'] = epicId.length ? epicId : null;
  }
  if ('sprint' in payload || options.includeEmpty) {
    body['sprint'] = sanitizeOptional(payload.sprint);
  }
  if ('paymentDate' in payload || options.includeEmpty) {
    body['paymentDate'] = payload.paymentDate ? normalizeDateOnly(payload.paymentDate) : null;
  }
  if ('task' in payload || options.includeEmpty) {
    body['task'] = sanitizeOptional(payload.task);
  }

  return body;
};

const sanitizeText = (value: unknown, fallback: string): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return fallback;
};

const sanitizeOptional = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return value ? String(value) : null;
};

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? 0 : value;
  }
  if (typeof value === 'string') {
    const normalized = value
      .replace(/[\s\u00A0]/g, '')
      .replace(/[R$]/gi, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(/,/g, '.')
      .replace(/[^0-9.-]/g, '');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const normalizeDateOnly = (value: unknown): string | null => {
  if (!value) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return trimmed;
  }
  return null;
};

const resolveEpicId = (dto: FinancialItemDto): string | null => {
  if (typeof dto.epic === 'string') {
    const trimmedEpic = dto.epic.trim();
    if (trimmedEpic.length) {
      return trimmedEpic;
    }
  }
  const epicObject = typeof dto.epic === 'object' && dto.epic !== null ? dto.epic : undefined;
  const epicSource = dto.epicId ?? (epicObject ? (epicObject as { _id?: string })._id : undefined);
  if (typeof epicSource === 'string') {
    const trimmed = epicSource.trim();
    return trimmed.length ? trimmed : null;
  }
  if (epicSource && typeof epicSource === 'object' && '_id' in epicSource && typeof epicSource._id === 'string') {
    const trimmed = epicSource._id.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
};

const sanitizeId = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return value ? String(value) : '';
};

const generateFallbackId = (): string => Math.random().toString(36).slice(2, 11);
