import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { TopToolbarComponent } from './top-toolbar.component';
import { AuthFacade } from '../../core/facades/auth.facade';
import { By } from '@angular/platform-browser';

class AuthFacadeStub {
  private readonly emailSignal = signal('user@example.com');

  currentUserEmail = computed(() => this.emailSignal());
  logoutRequested = jasmine.createSpy('logoutRequested');

  setEmail(email: string): void {
    this.emailSignal.set(email);
  }
}

describe('TopToolbarComponent', () => {
  let component: TopToolbarComponent;
  let fixture: ComponentFixture<TopToolbarComponent>;
  let authFacadeStub: AuthFacadeStub;

  beforeEach(async () => {
    authFacadeStub = new AuthFacadeStub();

    await TestBed.configureTestingModule({
      imports: [TopToolbarComponent, RouterTestingModule],
      providers: [
        { provide: AuthFacade, useValue: authFacadeStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TopToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render nav links and user email', () => {
    const links = fixture.nativeElement.querySelectorAll('a.toolbar-link');
    const linkTexts = Array.from(links).map(link => (link as HTMLElement).textContent?.trim());
    expect(linkTexts).toEqual([
      'Projetos',
      'Usuarios'
    ]);

    const userInfo: HTMLElement | null = fixture.nativeElement.querySelector('.toolbar-user');
    expect(userInfo?.textContent?.trim()).toContain('user@example.com');
  });

  it('should trigger logout on sair button click', () => {
    const button = fixture.debugElement.query(By.css('button.toolbar-button')).nativeElement as HTMLButtonElement;
    button.click();
    expect(authFacadeStub.logoutRequested).toHaveBeenCalledTimes(1);
  });

  it('should update email when store emits new value', () => {
    authFacadeStub.setEmail('new@example.com');
    fixture.detectChanges();

    const userInfo: HTMLElement | null = fixture.nativeElement.querySelector('.toolbar-user');
    expect(userInfo?.textContent?.trim()).toContain('new@example.com');
  });
});
