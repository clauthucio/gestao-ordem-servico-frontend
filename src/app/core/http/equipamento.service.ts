import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipamento } from '../models/equipamento.model';

@Injectable({
  providedIn: 'root',
})
export class EquipamentoService {
  private readonly API_URL = 'http://localhost:3000';
  private http = inject(HttpClient);

  listar(): Observable<Equipamento[]> {
    return this.http.get<Equipamento[]>(`${this.API_URL}/app/equipamentos`);
  }
}
