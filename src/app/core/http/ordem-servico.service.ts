import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  // GET /app/ordens → array direto ou envelope; normalizado para `OrdemServico[]`.
  // O AuthInterceptor já adiciona o Bearer Token automaticamente
  listar(): Observable<OrdemServico[]> {
    return this.http.get<unknown>(`${this.API_URL}/app/ordens`).pipe(map((body) => normalizarListaOrdens(body)));
  }

  buscarPorId(id: string): Observable<OrdemServico> {
    return this.http
      .get<unknown>(`${this.API_URL}/app/ordens/${id}`)
      .pipe(map((body) => mapBrutoParaOrdemServico(body)));
  }

  buscarAguardandoPecaLog(id: string): Observable<AguardandoPecaLogResponse> {
    return this.http
      .get<unknown>(`${this.API_URL}/app/ordens/${id}/aguardando-peca-log`)
      .pipe(map((body) => mapBrutoParaAguardandoPecaLogResponse(body)));
  }

  criar(payload: CriarOrdemServicoPayload): Observable<OrdemServico> {
    return this.http
      .post<unknown>(`${this.API_URL}/app/ordens`, payload)
      .pipe(map((body) => mapBrutoParaOrdemServico(body)));
  }

  /** Atualização parcial — PATCH alinha com a API (transição p.ex. EM_ANDAMENTO grava `inicioEm`). */
  atualizar(id: string, payload: AtualizarOrdemServicoPayload): Observable<OrdemServico> {
    return this.http
      .patch<unknown>(`${this.API_URL}/app/ordens/${id}`, payload)
      .pipe(map((body) => mapBrutoParaOrdemServico(body)));
  }

  deletar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/app/ordens/${id}`);
  }
}
