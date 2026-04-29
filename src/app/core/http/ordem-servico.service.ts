import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CriarOrdemServicoPayload, OrdemServico } from '../models/ordem-servico.model';

@Injectable({
  providedIn: 'root', // disponível em toda a aplicação
})
export class OrdemServicoService {
  private readonly API_URL = 'http://localhost:3000';
  private http = inject(HttpClient);

  // GET /app/ordens → retorna array de OS
  // O AuthInterceptor já adiciona o Bearer Token automaticamente
  listar(): Observable<OrdemServico[]> {
    return this.http.get<OrdemServico[]>(`${this.API_URL}/app/ordens`);
  }

  criar(payload: CriarOrdemServicoPayload): Observable<OrdemServico> {
    return this.http.post<OrdemServico>(`${this.API_URL}/app/ordens`, payload);
  }
}
