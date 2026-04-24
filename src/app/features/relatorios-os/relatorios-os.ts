import { Component } from '@angular/core';

export interface TecnicoRanking {
  iniciais: string;
  nome: string;
  osConcluidas: number;
  horasTotais: number;
  mediaOs: number;
  corIniciais: string;
  corMedia: string;
}

export interface BarChartItem {
  nome: string;
  valor: number;
  percentual: number;
  cor: string;
}

@Component({
  selector: 'app-relatorios-os',
  standalone: true,
  templateUrl: './relatorios-os.html'
})
export class RelatoriosOs {
  // Header
  titulo = 'Relatório de Produtividade';
  subtitulo = 'Análise detalhada do desempenho da equipe técnica no Polo Industrial.';
  periodo = '01 Out, 2023 - 31 Out, 2023';

  // KPIs
  totalOsConcluidas = 342;
  variacaoOs = '+12%';
  totalHoras = '1.840h';
  statusHoras = 'Estável';
  eficienciaMedia = '94.2%';
  variacaoEficiencia = '-3%';

  // Ranking
  tecnicos: TecnicoRanking[] = [
    { iniciais: 'AM', nome: 'Anderson Melo', osConcluidas: 48, horasTotais: 162, mediaOs: 3.3, corIniciais: 'bg-primary/10 text-primary', corMedia: 'text-tertiary' },
    { iniciais: 'JS', nome: 'Juliana Silva', osConcluidas: 45, horasTotais: 158, mediaOs: 3.5, corIniciais: 'bg-secondary/10 text-secondary', corMedia: 'text-tertiary' },
    { iniciais: 'RC', nome: 'Ricardo Costa', osConcluidas: 42, horasTotais: 175, mediaOs: 4.1, corIniciais: 'bg-on-surface-variant/10 text-on-surface-variant', corMedia: 'text-on-primary-container' },
    { iniciais: 'FG', nome: 'Felipe Gomes', osConcluidas: 39, horasTotais: 182, mediaOs: 4.6, corIniciais: 'bg-error/10 text-error', corMedia: 'text-error' },
    { iniciais: 'ML', nome: 'Mariana Lima', osConcluidas: 36, horasTotais: 144, mediaOs: 4.0, corIniciais: 'bg-tertiary/10 text-tertiary', corMedia: 'text-tertiary' }
  ];

  // Chart
  chartData: BarChartItem[] = [
    { nome: 'Anderson Melo', valor: 48, percentual: 100, cor: 'bg-primary' },
    { nome: 'Juliana Silva', valor: 45, percentual: 93, cor: 'bg-primary-dim' },
    { nome: 'Ricardo Costa', valor: 42, percentual: 87, cor: 'bg-outline' },
    { nome: 'Felipe Gomes', valor: 39, percentual: 81, cor: 'bg-outline-variant' },
    { nome: 'Mariana Lima', valor: 36, percentual: 75, cor: 'bg-surface-container-highest' }
  ];

  // Insight
  insightTitulo = 'Insight do Mês';
  insightTexto = 'Anderson Melo atingiu o menor tempo médio de resolução (3.3h) mantendo a maior taxa de conformidade. Recomendado para treinamentos internos.';

  // Bottom cards
  tecnicosAtivos = 24;
  slaSeguranca = '100%';
  proximaRevisao = '15 de Novembro, 2023';

  onExportar(): void {
    console.log('Exportar relatório');
  }

  onFiltrar(): void {
    console.log('Filtrar');
  }

  onVerListaCompleta(): void {
    console.log('Ver lista completa');
  }

  onAgendarReuniao(): void {
    console.log('Agendar reunião');
  }
}