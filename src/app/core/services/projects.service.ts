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
    return this.api.put<ProjectDto>(`/projects/${id}`, adaptProjectToDto(payload)).pipe(
      tap(dto => console.log('[ProjectsService] PUT /projects/' + id + ' response', dto)),
      map(dto => this.buildProject(dto))
    );
  }

  deleteProject(id: string): Observable<void> {
    return this.api.delete<void>(`/projects/${id}`);
  }

  private buildProject(dto: ProjectDto): Project {
    console.log('[ProjectsService] buildProject DTO in', dto);
    const project = adaptProjectDto(dto);
    const projectWithTotal = {
      ...project,
      total: calculateProjectTotal(project)
    };
    console.log('[ProjectsService] buildProject result', projectWithTotal);
    return projectWithTotal;
  }
}
