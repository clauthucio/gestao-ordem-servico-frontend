import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthInterceptor } from './auth.interceptor';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';

describe('AuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let routerNavigate: ReturnType<typeof vi.fn>;
  let refreshToken: ReturnType<typeof vi.fn>;

  const tokenStub = {
    getAccessToken: vi.fn(() => 'access-token'),
    getRefreshToken: vi.fn(() => 'refresh-token'),
  };

  beforeEach(() => {
    routerNavigate = vi.fn().mockResolvedValue(true);
    refreshToken = vi.fn(() => of({ access_token: 'new', refresh_token: 'r' }));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthInterceptor,
          multi: true,
        },
        { provide: TokenService, useValue: tokenStub },
        {
          provide: AuthService,
          useValue: { refreshToken },
        },
        { provide: Router, useValue: { navigate: routerNavigate } },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('400 "Dados inválidos" não dispara refresh nem redirect (validação de negócio)', () => {
    const errSpy = vi.fn();
    http.get('/app/equipamentos').subscribe({ error: errSpy });

    const req = httpMock.expectOne('/app/equipamentos');
    req.flush(
      { message: 'Dados inválidos' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(refreshToken).not.toHaveBeenCalled();
    expect(routerNavigate).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });

  it('400 com mensagem explícita de token tenta refresh e reenvia a requisição', () => {
    const nextSpy = vi.fn();
    http.get('/app/x').subscribe({ next: nextSpy });

    const first = httpMock.expectOne('/app/x');
    first.flush(
      { message: 'Token não fornecido' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(refreshToken).toHaveBeenCalled();

    const retry = httpMock.expectOne('/app/x');
    retry.flush({ ok: true });

    expect(nextSpy).toHaveBeenCalled();
    expect(routerNavigate).not.toHaveBeenCalled();
  });

  it('401 com refresh token chama refresh e reenvia', () => {
    const nextSpy = vi.fn();
    http.get('/app/y').subscribe({ next: nextSpy });

    const first = httpMock.expectOne('/app/y');
    first.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(refreshToken).toHaveBeenCalled();

    const retry = httpMock.expectOne('/app/y');
    retry.flush({ ok: true });

    expect(nextSpy).toHaveBeenCalled();
  });
});
