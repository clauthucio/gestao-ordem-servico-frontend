import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type CategoriaEquipamento = 'eletrico' | 'hidraulico' | 'mecanico' | 'pneumatico' | 'termico';
export type StatusEquipamento = 'operacional' | 'manutencao' | 'parado' | 'critico';
export type Criticidade = 'a' | 'b' | 'c';

export interface CategoriaOption {
  value: CategoriaEquipamento;
  label: string;
  icone: string;
}

export interface StatusOption {
  value: StatusEquipamento;
  label: string;
  cor: string;
  bgCor: string;
  icone: string;
}

@Component({
  selector: 'app-cadastro-equipamento',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './cadastro-equipamentos.html'
})
export class CadastroEquipamento {
  // Header
  titulo = 'Cadastro de Equipamento';
  subtitulo = 'Registre um novo ativo industrial no sistema de gestão.';

  // Dados do form
  codigo = '';
  nome = '';
  categoria: CategoriaEquipamento | '' = '';
  marca = '';
  modelo = '';
  numeroSerie = '';
  dataAquisicao = '';
  localizacao = '';
  setor = '';
  status: StatusEquipamento = 'operacional';
  criticidade: Criticidade = 'b';
  periodicidadePreventiva = 6;
  observacoes = '';
  anexoNome = '';

  // QR Code
  qrCodeGerado = false;

  // Options
  categorias: CategoriaOption[] = [
    { value: 'eletrico', label: 'Elétrico', icone: 'bolt' },
    { value: 'hidraulico', label: 'Hidráulico', icone: 'water' },
    { value: 'mecanico', label: 'Mecânico', icone: 'settings' },
    { value: 'pneumatico', label: 'Pneumático', icone: 'air' },
    { value: 'termico', label: 'Térmico', icone: 'thermostat' }
  ];

  statusOptions: StatusOption[] = [
    { value: 'operacional', label: 'Operacional', cor: 'text-tertiary', bgCor: 'bg-tertiary/10', icone: 'check_circle' },
    { value: 'manutencao', label: 'Em Manutenção', cor: 'text-secondary', bgCor: 'bg-secondary/10', icone: 'build' },
    { value: 'parado', label: 'Parado', cor: 'text-on-surface-variant', bgCor: 'bg-on-surface-variant/10', icone: 'block' },
    { value: 'critico', label: 'Crítico', cor: 'text-error', bgCor: 'bg-error/10', icone: 'warning' }
  ];

  criticidadeOptions = [
    { value: 'a' as Criticidade, label: 'A - Alta Prioridade', cor: 'bg-error text-error' },
    { value: 'b' as Criticidade, label: 'B - Média Prioridade', cor: 'bg-secondary text-secondary' },
    { value: 'c' as Criticidade, label: 'C - Baixa Prioridade', cor: 'bg-tertiary text-tertiary' }
  ];

  periodicidadeOptions = [1, 3, 6, 12, 24];

  getCategoriaIcon(categoria: CategoriaEquipamento): string {
    const map: Record<CategoriaEquipamento, string> = {
      eletrico: 'bolt',
      hidraulico: 'water',
      mecanico: 'settings',
      pneumatico: 'air',
      termico: 'thermostat'
    };
    return map[categoria];
  }

  getStatusClass(status: StatusEquipamento): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option ? `${option.bgCor} ${option.cor} px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1` : '';
  }

  getStatusLabel(status: StatusEquipamento): string {
    const option = this.statusOptions.find(s => s.value === status);
    return option ? option.label : status;
  }

  getCriticidadeClass(criticidade: Criticidade): string {
    const map: Record<Criticidade, string> = {
      a: 'bg-error/10 text-error border-error/20',
      b: 'bg-secondary/10 text-secondary border-secondary/20',
      c: 'bg-tertiary/10 text-tertiary border-tertiary/20'
    };
    return `px-3 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider ${map[criticidade]}`;
  }

  onGerarQRCode(): void {
    this.qrCodeGerado = true;
    console.log('QR Code gerado para:', this.codigo);
  }

  onAnexarArquivo(): void {
    this.anexoNome = 'manual_tecnico.pdf';
    console.log('Arquivo anexado');
  }

  onSalvar(): void {
    console.log('Salvar equipamento:', {
      codigo: this.codigo,
      nome: this.nome,
      categoria: this.categoria,
      status: this.status,
      criticidade: this.criticidade
    });
  }

  onCancelar(): void {
    console.log('Cancelar cadastro');
  }

  onLimpar(): void {
    this.codigo = '';
    this.nome = '';
    this.categoria = '';
    this.marca = '';
    this.modelo = '';
    this.numeroSerie = '';
    this.dataAquisicao = '';
    this.localizacao = '';
    this.setor = '';
    this.status = 'operacional';
    this.criticidade = 'b';
    this.periodicidadePreventiva = 6;
    this.observacoes = '';
    this.anexoNome = '';
    this.qrCodeGerado = false;
  }
}