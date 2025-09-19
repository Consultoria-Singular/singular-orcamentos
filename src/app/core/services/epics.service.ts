import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Epic } from '../models/epic.model';
import { adaptEpicDto, EpicDto } from '../../services/adapters';

export interface EpicPayload {
  name: string;
}

@Injectable({ providedIn: 'root' })
export class EpicsService {
  private readonly api = inject(ApiService);

  list(projectId: string): Observable<Epic[]> {
    return this.api.get<EpicDto[]>(`/projects/${projectId}/epics`).pipe(
      map(epics => epics.map(adaptEpicDto))
    );
  }

  create(projectId: string, payload: EpicPayload): Observable<Epic> {
    return this.api.post<EpicDto>(`/projects/${projectId}/epics`, payload).pipe(
      map(adaptEpicDto)
    );
  }

  update(projectId: string, epicId: string, payload: EpicPayload): Observable<Epic> {
    return this.api.put<EpicDto>(`/projects/${projectId}/epics/${epicId}`, payload).pipe(
      map(adaptEpicDto)
    );
  }

  delete(projectId: string, epicId: string): Observable<void> {
    return this.api.delete<void>(`/projects/${projectId}/epics/${epicId}`);
  }
}
