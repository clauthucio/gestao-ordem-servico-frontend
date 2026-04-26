export interface Equipamento {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'ELETRICO' | 'MECANICO' | 'HIDRAULICO' | 'PREDIAL';
  localizacao: string;
  fabricante?: string;
  modelo?: string;
  ativo: boolean;
  dataCriacao: Date | string;
  dataAtualizacao: Date | string;
}
