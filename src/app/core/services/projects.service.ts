import { Injectable, inject } from '@angular/core';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Project } from '../models/project.model';
import { adaptProjectDto, adaptProjectToDto, ProjectDto } from '../../services/adapters';
import { calculateProjectTotal } from '../../utils/cost.utils';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly api = inject(ApiService);

  getProjects(): Observable<Project[]> {
    return this.api.get<ProjectDto[]>('/projects').pipe(
      tap(dto => console.log('[ProjectsService] GET /projects DTO', dto)),
      map(projects => projects.map(dto => this.buildProject(dto)))
    );
  }

  getProject(id: string): Observable<Project> {
    return this.api.get<ProjectDto>(`/projects/${id}`).pipe(
      tap(dto => console.log('[ProjectsService] GET /projects/' + id + ' DTO', dto)),
      map(dto => this.buildProject(dto))
    );
  }

  createProject(payload: Project): Observable<Project> {
    return this.api.post<ProjectDto>('/projects', adaptProjectToDto(payload)).pipe(
      tap(dto => console.log('[ProjectsService] POST /projects response', dto)),
      map(dto => this.buildProject(dto))
    );
  }

  updateProject(id: string, payload: Project): Observable<Project> {
    return this.api.patch<ProjectDto>(`/projects/${id}`, adaptProjectToDto(payload)).pipe(
      tap(dto => console.log('[ProjectsService] PATCH /projects/' + id + ' response', dto)),
      map(dto => this.buildProject(dto))
    );
  }

  cloneProject(id: string, payload?: { name?: string }): Observable<Project> {
    const body = payload?.name?.trim().length ? { name: payload.name.trim() } : undefined;
    return this.api.post<ProjectDto>(`/projects/${id}/clone`, body).pipe(
      tap(dto => console.log('[ProjectsService] POST /projects/' + id + '/clone response', dto)),
      map(dto => this.buildProject(dto))
    );
  }

  cloneProjectItems(id: string, itemIds: string[]): Observable<Project> {
    const body = { itemIds };
    return this.api.post<ProjectDto>(`/projects/${id}/clone-items`, body).pipe(
      tap(dto => console.log('[ProjectsService] POST /projects/' + id + '/clone-items response', dto)),
      map(dto => this.buildProject(dto, { preferCalculatedTotal: true }))
    );
  }

  deleteProject(id: string): Observable<void> {
    return this.api.delete<void>(`/projects/${id}`);
  }

  private buildProject(dto: ProjectDto, options?: { preferCalculatedTotal?: boolean }): Project {
    console.log('[ProjectsService] buildProject DTO in', dto);
    const project = adaptProjectDto(dto);
    const preferCalculatedTotal = options?.preferCalculatedTotal ?? false;
    const hasDetailedBudgetItems = Array.isArray(project.budgetItems) && project.budgetItems.some(item => {
      if (!item) {
        return false;
      }
      const hasName = typeof (item as { name?: unknown }).name === 'string' && String((item as { name?: string }).name).trim().length > 0;
      const hasHours = typeof (item as { hours?: unknown }).hours === 'number' && !Number.isNaN((item as { hours?: number }).hours);
      return hasName && hasHours;
    });

    const totalsSnapshot = project.totals ? { ...project.totals } : undefined;
    const providedTotalSource = totalsSnapshot?.total ?? project.total;
    const providedTotal = typeof providedTotalSource === 'number' && !Number.isNaN(providedTotalSource)
      ? Number(providedTotalSource.toFixed(2))
      : undefined;
    const calculatedTotal = hasDetailedBudgetItems ? calculateProjectTotal(project) : undefined;
    const total = preferCalculatedTotal && calculatedTotal !== undefined
      ? calculatedTotal
      : (providedTotal ?? calculatedTotal ?? 0);

    let normalizedTotals = totalsSnapshot ? { ...totalsSnapshot } : undefined;
    if (normalizedTotals) {
      normalizedTotals.total = total;
    } else if (preferCalculatedTotal || total !== 0) {
      normalizedTotals = { total };
    }

    const projectWithTotal = {
      ...project,
      totals: normalizedTotals,
      total
    };
    console.log('[ProjectsService] buildProject result', projectWithTotal);
    return projectWithTotal;
  }
}
