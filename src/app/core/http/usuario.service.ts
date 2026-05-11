import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AlterarSenhaRequest,
  AlterarSenhaResponse,
  AtualizarUsuarioPayload,
  CadastrarUsuarioPayload,
  Usuario,
} from '../models/usuario.model';
import { normalizarListaUsuarios } from './usuario-api-normalize';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private readonly API_URL = environment.apiUrl;
  private http = inject(HttpClient);

  listar(): Observable<Usuario[]> {
    return this.http
      .get<unknown>(`${this.API_URL}/app/usuarios`)
      .pipe(map((body) => normalizarListaUsuarios(body)));
  }

  /**
   * POST /app/usuarios — cadastro admin.
   * O backend valida com `UsuarioCreateSchema`: nomeUsuario, emailUsuario, senhaUsuario, perfilUsuario, statusUsuario.
   */
  cadastrar(payload: CadastrarUsuarioPayload): Observable<Usuario> {
    const body = {
      nomeUsuario: payload.nome,
      emailUsuario: payload.email,
      senhaUsuario: payload.senhaTemporaria,
      perfilUsuario: payload.perfil,
      statusUsuario: payload.status === 'ATIVO',
    };
    return this.http.post<Usuario>(`${this.API_URL}/app/usuarios`, body);
  }

  /**
   * PUT /app/usuarios/:id — dados gerais (nome, e-mail, perfil, status).
   * A senha não deve ser enviada aqui; use `alterarSenha`.
   */
  atualizar(id: string, body: AtualizarUsuarioPayload): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.API_URL}/app/usuarios/${id}`, body);
  }

  /** PATCH /app/usuarios/:id/senha — qualquer papel autenticado, só a própria conta. */
  alterarSenha(idUsuario: string, body: AlterarSenhaRequest): Observable<AlterarSenhaResponse> {
    return this.http.patch<AlterarSenhaResponse>(
      `${this.API_URL}/app/usuarios/${idUsuario}/senha`,
      body,
    );
  }

  deletar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/app/usuarios/${id}`);
  }
}
