import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AtualizarOrdemServicoPayload, CriarOrdemServicoPayload, OrdemServico } from '../models/ordem-servico.model';
import { mapBrutoParaOrdemServico, normalizarListaOrdens } from './ordem-servico-api-normalize';

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

  criar(payload: CriarOrdemServicoPayload): Observable<OrdemServico> {
    return this.http.post<OrdemServico>(`${this.API_URL}/app/ordens`, payload);
  }

  atualizar(id: string, payload: AtualizarOrdemServicoPayload): Observable<OrdemServico> {
    return this.http.put<OrdemServico>(`${this.API_URL}/app/ordens/${id}`, payload);
  }

  deletar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/app/ordens/${id}`);
  }
}
