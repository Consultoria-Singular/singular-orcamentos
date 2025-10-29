import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

type RequestOptions = {
  headers?: HttpHeaders | {[header: string]: string | string[]};
  params?: HttpParams | {[param: string]: string | number | readonly (string | number)[]};
  withCredentials?: boolean;
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.API_BASE_URL.replace(/\/$/, '');

  constructor(private readonly http: HttpClient) {}

  private buildUrl(path: string): string {
    if (!path) {
      return this.baseUrl;
    }
    const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${sanitizedPath}`;
  }

  get<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(this.buildUrl(path), this.mergeOptions(options));
  }

  post<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(this.buildUrl(path), body, this.mergeOptions(options));
  }

  put<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.put<T>(this.buildUrl(path), body, this.mergeOptions(options));
  }

  patch<T>(path: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.patch<T>(this.buildUrl(path), body, this.mergeOptions(options));
  }

  delete<T>(path: string, options?: RequestOptions): Observable<T> {
    return this.http.delete<T>(this.buildUrl(path), this.mergeOptions(options));
  }

  private mergeOptions(options?: RequestOptions): RequestOptions {
    return {
      withCredentials: true,
      ...options
    };
  }
}
