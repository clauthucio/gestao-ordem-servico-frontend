import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AtualizarOrdemServicoPayload, AguardandoPecaLogResponse, CriarOrdemServicoPayload, OrdemServico } from '../models/ordem-servico.model';
import {
  mapBrutoParaAguardandoPecaLogResponse,
  mapBrutoParaOrdemServico,
  normalizarListaOrdens,
} from './ordem-servico-api-normalize';

@Injectable({
  providedIn: 'root', // disponível em toda a aplicação
})
export class OrdemServicoService {
  private readonly API_URL = environment.apiUrl;
  private http = inject(HttpClient);

  /** Evita 304 / resposta em cache com entidade desatualizada após mutação. */
  private readonly getOrdensNoCache = {
    headers: new HttpHeaders({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    }),
  };

  // GET /app/ordens → array direto ou envelope; normalizado para `OrdemServico[]`.
  // O AuthInterceptor já adiciona o Bearer Token automaticamente
  listar(): Observable<OrdemServico[]> {
    return this.http
      .get<unknown>(`${this.API_URL}/app/ordens`, this.getOrdensNoCache)
      .pipe(map((body) => normalizarListaOrdens(body)));
  }

  buscarPorId(id: string): Observable<OrdemServico> {
    return this.http
      .get<unknown>(`${this.API_URL}/app/ordens/${id}`, this.getOrdensNoCache)
      .pipe(map((body) => mapBrutoParaOrdemServico(body)));
  }

  buscarAguardandoPecaLog(id: string): Observable<AguardandoPecaLogResponse> {
    return this.http
      .get<unknown>(`${this.API_URL}/app/ordens/${id}/aguardando-peca-log`, this.getOrdensNoCache)
      .pipe(map((body) => mapBrutoParaAguardandoPecaLogResponse(body)));
  }

  criar(payload: CriarOrdemServicoPayload): Observable<OrdemServico> {
    return this.http
      .post<unknown>(`${this.API_URL}/app/ordens`, payload)
      .pipe(map((body) => mapBrutoParaOrdemServico(body)));
  }

  /**
   * Atualização parcial — `PATCH {apiUrl}/app/ordens/:id` (camelCase).
   * Se a UI divergir da BD, confirmar no DevTools (URL, status, corpo do pedido/resposta) e o mesmo `apiUrl` que a instância da API usa.
   */
  atualizar(id: string, payload: AtualizarOrdemServicoPayload): Observable<OrdemServico> {
    return this.http
      .patch<unknown>(`${this.API_URL}/app/ordens/${id}`, payload)
      .pipe(map((body) => mapBrutoParaOrdemServico(body)));
  }

  deletar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/app/ordens/${id}`);
  }
}
