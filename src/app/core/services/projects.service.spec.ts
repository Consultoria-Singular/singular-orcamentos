import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProjectsService } from './projects.service';
import { ApiService } from './api.service';
import { ProjectDto } from '../../services/adapters';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService, ProjectsService]
    });

    service = TestBed.inject(ProjectsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should map the incoming project dto and calculate totals', () => {
    const dto: ProjectDto = {
      id: 'p1',
      name: 'Projeto 1',
      devHourlyRate: 100,
      poHourlyRate: 0,
      qaHourlyRate: 0,
      architectHourlyRate: 0,
      designHourlyRate: 0,
      opsHourlyRate: 0,
      poPercentage: 0,
      qaPercentage: 0,
      architectPercentage: 0,
      designPercentage: 0,
      opsPercentage: 0,
      taxPercentage: 0,
      pointerPercentage: 0,
      marginPercentage: 0,
      budgetItens: [
        {
          id: 'b1',
          epicId: 'e1',
          name: 'Item 1',
          hours: 10,
          qa: false,
          architect: false,
          design: false
        }
      ],
      epics: [
        { id: 'e1', name: 'Epic 1' }
      ]
    };

    service.getProjects().subscribe(projects => {
      expect(projects.length).toBe(1);
      const project = projects[0];
      expect(project.id).toBe('p1');
      expect(project.total).toBe(1000);
      expect(project.budgetItems[0].hours).toBe(10);
    });

    const req = http.expectOne('http://localhost:3000/projects');
    expect(req.request.method).toBe('GET');
    req.flush([dto]);
  });
});
