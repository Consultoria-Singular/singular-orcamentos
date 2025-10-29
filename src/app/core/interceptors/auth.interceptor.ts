import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthStore } from '../state/auth.store';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly authStore = inject(AuthStore);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const session = this.authStore.snapshot();

    let headers = req.headers;
    const shouldSkipAuth = headers.has('X-Skip-Auth');

    if (shouldSkipAuth) {
      headers = headers.delete('X-Skip-Auth');
    } else if (session?.token && !headers.has('Authorization')) {
      headers = headers.set('Authorization', `Bearer ${session.token}`);
    }

    const authenticatedRequest = req.clone({
      headers,
      withCredentials: shouldSkipAuth ? req.withCredentials : true
    });

    return next.handle(authenticatedRequest);
  }
}
