import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AtualizarEquipamentoPayload,
  CriarEquipamentoPayload,
  EquipamentoListItem,
} from '../models/equipamento.model';

@Injectable({
  providedIn: 'root',
})
export class EquipamentoService {
  private readonly API_URL = environment.apiUrl;
  private http = inject(HttpClient);

  listar(): Observable<EquipamentoListItem[]> {
    return this.http.get<EquipamentoListItem[]>(`${this.API_URL}/app/equipamentos`);
  }

  criar(body: CriarEquipamentoPayload): Observable<EquipamentoListItem> {
    return this.http.post<EquipamentoListItem>(`${this.API_URL}/app/equipamentos`, body);
  }

  buscarPorId(id: string): Observable<EquipamentoListItem> {
    return this.http.get<EquipamentoListItem>(`${this.API_URL}/app/equipamentos/${id}`);
  }

  atualizar(id: string, body: AtualizarEquipamentoPayload): Observable<EquipamentoListItem> {
    return this.http.put<EquipamentoListItem>(`${this.API_URL}/app/equipamentos/${id}`, body);
  }

  deletar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/app/equipamentos/${id}`);
  }
}
