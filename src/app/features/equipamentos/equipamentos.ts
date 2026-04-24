import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';

export interface Equipamento {
  codigo: string;
  nome: string;
  modelo: string;
  tipo: string;
  localizacao: string;
  status: 'ativo' | 'critico' | 'inativo';
  icone: string;
}

@Component({
  selector: 'app-equipamentos',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './equipamentos.html'
})
export class Equipamentos {
  private router = inject(Router);
  // KPIs
  totalAtivos = 1284;
  variacaoMes = '+3% este mês';
  operacional = 1240;
  manutencao = 44;
  oee = '84.2%';
  variacaoOee = '2.1%';

  // Filtros
  filtrosAtivos = ['Tipo: Todos', 'Setor: Todos', 'Status: Ativos'];
  paginaAtual = 1;
  totalPaginas = 129;
  itensPorPagina = 10;
  totalItens = 1284;

  // Equipamentos
  equipamentos: Equipamento[] = [
    {
      codigo: 'CNC-402-A',
      nome: 'Torno CNC Mazak',
      modelo: 'Modelo Quick Turn 250',
      tipo: 'Usinagem Pesada',
      localizacao: 'Bloco B - Galpão 04',
      status: 'ativo',
      icone: 'precision_manufacturing'
    },
    {
      codigo: 'HYD-118-B',
      nome: 'Prensa Hidráulica 50T',
      modelo: 'Fabricante: Schuler',
      tipo: 'Hidráulica',
      localizacao: 'Bloco A - Estampagem',
      status: 'critico',
      icone: 'compress'
    },
    {
      codigo: 'AIR-COMP-09',
      nome: 'Compressor de Ar Atlas',
      modelo: 'Série GA 30+ VSD',
      tipo: 'Utilidades',
      localizacao: 'Casa de Máquinas 01',
      status: 'ativo',
      icone: 'mode_fan'
    },
    {
      codigo: 'ROB-ARM-22',
      nome: 'Braço Robótico Kuka',
      modelo: 'KR QUANTEC-2',
      tipo: 'Automação',
      localizacao: 'Linha de Solda 03',
      status: 'inativo',
      icone: 'smart_toy'
    }
  ];

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      ativo: 'bg-tertiary/10 text-tertiary',
      critico: 'bg-error/10 text-error',
      inativo: 'bg-slate-200 text-slate-600'
    };
    return `px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${map[status]}`;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      ativo: 'Ativo',
      critico: 'Crítico',
      inativo: 'Inativo'
    };
    return map[status];
  }

  onNovoEquipamento(): void {
    this.router.navigate(['/cadastro-equipamento']);
  }

  onExportarCsv(): void {
    console.log('Exportar CSV');
  }

  onVerHistorico(codigo: string): void {
    console.log('Histórico:', codigo);
  }

  onVerRelatorioPredicao(): void {
    console.log('Ver relatório de predição');
  }

  onPaginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  }

  onProximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  }

  onIrParaPagina(pagina: number): void {
    this.paginaAtual = pagina;
  }

  onFabClick(): void {
    console.log('FAB equipamentos');
  }
}