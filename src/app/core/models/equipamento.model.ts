export type TipoEquipamento = 'ELETRICO' | 'MECANICO' | 'HIDRAULICO' | 'PREDIAL';

export interface Equipamento {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoEquipamento;
  localizacao: string;
  fabricante?: string | null;
  modelo?: string | null;
  ativo: boolean;
  dataCriacao: Date | string;
  dataAtualizacao: Date | string;
}

/** Linha retornada pelo GET /app/equipamentos (backend enriquecido). */
export interface EquipamentoListItem extends Equipamento {
  ordensAbertasCount: number;
  nomeUsuarioCriacao: string | null;
  nomeUsuarioUltimaModificacao: string | null;
  idUsuarioCriacao?: string | null;
  idUsuarioUltimaModificacao?: string | null;
}

/** Corpo do POST /app/equipamentos (código gerado pelo backend). */
export interface CriarEquipamentoPayload {
  nome: string;
  tipo: TipoEquipamento;
  localizacao: string;
  fabricante?: string | null;
  modelo?: string | null;
  ativo?: boolean;
}

/** Corpo do PUT /app/equipamentos/:id (sem código — somente leitura na UI). */
export interface AtualizarEquipamentoPayload {
  nome?: string;
  tipo?: TipoEquipamento;
  localizacao?: string;
  fabricante?: string | null;
  modelo?: string | null;
  ativo?: boolean;
}
