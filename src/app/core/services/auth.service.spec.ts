import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { AuthStore } from '../state/auth.store';

describe('AuthService', () => {
  let service: AuthService;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(AuthService);
    TestBed.inject(AuthStore); // ensure store provided
    fetchSpy = spyOn(window, 'fetch');
  });

  it('should perform logout with credentials include and accept header', done => {
    fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 204 })));

    service.logout(() => null).subscribe({
      next: status => {
        expect(status).toBe(204);
        const [, options] = fetchSpy.calls.mostRecent().args;
        expect(options?.credentials).toBe('include');

        const headers = options?.headers as Record<string, string>;
        expect(headers?.['Accept']).toBe('application/json');
        done();
      },
      error: done.fail
    });
  });

  it('should append authorization header when token is present', done => {
    fetchSpy.and.returnValue(Promise.resolve(new Response(null, { status: 204 })));

    service.logout(() => 'jwt-token').subscribe({
      next: () => {
        const [, options] = fetchSpy.calls.mostRecent().args;
        const headers = options?.headers as Record<string, string>;
        expect(headers?.['Authorization']).toBe('Bearer jwt-token');
        done();
      },
      error: done.fail
    });
  });

  it('should propagate fetch errors', done => {
    const networkError = new Error('network error');
    fetchSpy.and.returnValue(Promise.reject(networkError));

    service.logout(() => null).subscribe({
      next: () => done.fail('Expected an error but got next'),
      error: err => {
        expect(err).toBe(networkError);
        done();
      }
    });
  });
});
