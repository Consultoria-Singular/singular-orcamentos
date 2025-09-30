import { Component, HostListener, OnInit, inject } from '@angular/core';
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
  openMenuProjectId: string | null = null;
  menuPosition: { top: number; left: number } | null = null;
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

  toggleMenu(projectId: string, event: MouseEvent): void {
    event.stopPropagation();

    if (this.openMenuProjectId === projectId) {
      this.closeMenu();
      return;
    }

    const trigger = event.currentTarget as HTMLElement | null;
    const rect = trigger?.getBoundingClientRect();

    if (!rect) {
      this.openMenuProjectId = projectId;
      this.menuPosition = null;
      return;
    }

    const offset = 4;
    const estimatedWidth = 192;
    const viewportPadding = 16;

    const maxLeft = window.innerWidth - viewportPadding - estimatedWidth;
    const preferredLeft = rect.right - estimatedWidth;
    const left = Math.max(Math.min(preferredLeft, maxLeft), viewportPadding);

    this.openMenuProjectId = projectId;
    this.menuPosition = {
      top: rect.bottom + offset,
      left: left < viewportPadding ? viewportPadding : left
    };
  }

  closeMenu(): void {
    this.openMenuProjectId = null;
    this.menuPosition = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeMenu();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.closeMenu();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.closeMenu();
  }

  onCreateProject(): void {
    this.router.navigate(['/projects', 'new']);
  }

  onViewSettings(projectId: string): void {
    this.closeMenu();
    this.router.navigate(['/projects', projectId, 'settings']);
  }

  onViewItems(projectId: string): void {
    this.closeMenu();
    this.router.navigate(['/projects', projectId, 'items']);
  }

  onViewClient(projectId: string): void {
    this.closeMenu();
    this.router.navigate(['/projects', projectId, 'client-view']);
  }

  onCloneProject(projectId: string): void {
    this.closeMenu();
    const name = window.prompt('Nome do novo projeto (opcional):');
    const payload = name && name.trim().length ? { name: name.trim() } : undefined;
    this.projectsService.cloneProject(projectId, payload).subscribe({
      next: project => {
        window.alert('Projeto clonado com sucesso!');
        this.router.navigate(['/projects', project.id, 'items']);
      },
      error: err => {
        console.error('[ProjectsList] clone failed', err);
        window.alert('Nao foi possivel clonar o projeto.');
      }
    });
  }

  onDeleteProject(projectId: string): void {
    this.closeMenu();
    if (!window.confirm('Deseja remover este projeto?')) {
      return;
    }
    this.projectsService.deleteProject(projectId).subscribe({
      next: () => {
        window.alert('Projeto removido com sucesso.');
        this.projects = this.projects.filter(project => project.id !== projectId);
      },
      error: err => {
        console.error('[ProjectsList] delete failed', err);
        window.alert('Nao foi possivel remover o projeto.');
      }
    });
  }

  trackByProject(_index: number, project: Project): string {
    return project.id;
  }
}
