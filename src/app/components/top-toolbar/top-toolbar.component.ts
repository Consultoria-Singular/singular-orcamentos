import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthFacade } from '../../core/facades/auth.facade';

@Component({
  selector: 'app-top-toolbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './top-toolbar.component.html',
  styleUrls: ['./top-toolbar.component.scss']
})
export class TopToolbarComponent {
  private readonly authFacade = inject(AuthFacade);

  readonly userEmail = computed(() => this.authFacade.currentUserEmail());

  onLogout(): void {
    this.authFacade.logoutRequested();
  }
}
