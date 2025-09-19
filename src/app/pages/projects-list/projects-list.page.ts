import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProjectsService } from '../../core/services/projects.service';
import { Project } from '../../core/models/project.model';
import { ToolbarComponent } from '../../components/shared/toolbar.component';
import { DsButtonComponent } from '../../components/ds/ds-button.component';
import { CurrencyFormatPipe } from '../../utils/pipes/currency-format.pipe';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, ToolbarComponent, DsButtonComponent, CurrencyFormatPipe],
  templateUrl: './projects-list.page.html',
  styleUrls: ['./projects-list.page.scss']
})
export class ProjectsListPage implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);

  projects: Project[] = [];
  loading = false;
  error?: string;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.error = undefined;

    this.projectsService.getProjects().subscribe({
      next: projects => {
        this.projects = projects;
        this.loading = false;
      },
      error: () => {
        this.error = 'Nao foi possivel carregar os projetos.';
        this.loading = false;
      }
    });
  }

  onCreateProject(): void {
    this.router.navigate(['/projects', 'new']);
  }

  onViewSettings(projectId: string): void {
    this.router.navigate(['/projects', projectId, 'settings']);
  }

  onViewItems(projectId: string): void {
    this.router.navigate(['/projects', projectId, 'items']);
  }

  onViewClient(projectId: string): void {
    this.router.navigate(['/projects', projectId, 'items'], { queryParams: { mode: 'client' } });
  }

  trackByProject(_index: number, project: Project): string {
    return project.id;
  }
}
