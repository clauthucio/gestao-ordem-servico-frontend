import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { OrdemServicoService } from '../../core/http/ordem-servico.service';
import { EquipamentoService } from '../../core/http/equipamento.service';
import { UsuarioService } from '../../core/http/usuario.service';
import { AuthService } from '../../core/services/auth.service';
import { OrdemStatus } from '../../core/enums/status.enum';
import { UserRole } from '../../core/enums/roles.enum';
import { Equipamento } from '../../core/models/equipamento.model';
import { Usuario } from '../../core/models/usuario.model';
import {
  AtualizarOrdemServicoPayload,
  CriarOrdemServicoPayload,
  OrdemServico,
} from '../../core/models/ordem-servico.model';
import { DialogComponent, DialogBotao } from '../dialog/dialog.component';

@Component({
  selector: 'app-os-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogComponent],
  templateUrl: './os-form.html',
})
export class OsFormComponent implements OnInit {
  @Input() osParaEditar: OrdemServico | null = null;
  @Input() osParaIniciar: OrdemServico | null = null;
  @Input() osParaEncerrar: OrdemServico | null = null;
  @Output() salvo = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  get modoEdicao(): boolean {
    return this.osParaEditar !== null && this.osParaIniciar === null && this.osParaEncerrar === null;
  }

  get modoIniciar(): boolean {
    return this.osParaIniciar !== null;
  }

  get modoEncerrar(): boolean {
    return this.osParaEncerrar !== null;
  }

  /** Nova OS (modal sem `osPara*`). */
  get modoCriacao(): boolean {
    return (
      this.osParaEditar === null &&
      this.osParaIniciar === null &&
      this.osParaEncerrar === null
    );
  }

  /** Técnico obrigatório: criação ou edição de OS em status ABERTO. */
  get requerTecnico(): boolean {
    if (this.modoCriacao) return true;
    if (
      this.modoEdicao &&
      this.osParaEditar?.statusOrdemServico === OrdemStatus.ABERTO
    ) {
      return true;
    }
    return false;
  }

  private readonly fb = inject(FormBuilder);
  private readonly ordemService = inject(OrdemServicoService);
  private readonly equipamentoService = inject(EquipamentoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  equipamentos: Equipamento[] = [];
  tecnicos: Usuario[] = [];
  carregandoDados = true;
  salvando = false;
  erro: string | null = null;

  // Dialog state
  dialogVisivel = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogTipo: 'confirmacao' | 'erro' | 'info' = 'info';
  dialogBotoes: DialogBotao[] = [];

  readonly tiposManutencao = [
    { value: 'CORRETIVA', label: 'Corretiva' },
    { value: 'PREVENTIVA', label: 'Preventiva' },
    { value: 'PREDITIVA', label: 'Preditiva' },
  ];

  readonly prioridades = [
    { value: 'BAIXA', label: 'Baixa' },
    { value: 'MEDIA', label: 'Média' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'CRITICA', label: 'Crítica' },
  ];

  form = this.fb.group({
    idEquipamento: ['', Validators.required],
    tipoManutencao: ['', Validators.required],
    prioridadeOrdemServico: ['', Validators.required],
    descricaoFalha: ['', [Validators.required, Validators.maxLength(2000)]],
    idTecnico: [''],
    descricaoServico: ['', Validators.maxLength(2000)],
    pecasUtilizadas: ['', Validators.maxLength(2000)],
    horasTrabalhadas: [null as number | null, Validators.min(0)],
    conclusaoEm: [''],
  });

  ngOnInit(): void {
    this.aplicarValidadorTecnico();

    forkJoin({
      equipamentos: this.equipamentoService.listar(),
      usuarios: this.usuarioService.listar(),
    }).subscribe({
      next: ({ equipamentos, usuarios }) => {
        this.equipamentos = equipamentos;
        this.tecnicos = usuarios.filter(
          (u) => u.perfilUsuario === UserRole.TECNICO
        );
        this.carregandoDados = false;

        if (this.modoEdicao) {
          this.popularFormParaEdicao();
          // Equipamento é readonly no modo edição
          this.form.get('idEquipamento')?.disable();

          // Prioridade só pode ser editada por ADMIN ou SOLICITANTE
          const usuario = this.authService.getCurrentUser();
          const podeEditarPrioridade = usuario?.perfilUsuario === UserRole.ADMIN
            || usuario?.perfilUsuario === UserRole.SOLICITANTE;
          if (!podeEditarPrioridade) {
            this.form.get('prioridadeOrdemServico')?.disable();
          }
        } else if (this.modoIniciar) {
          this.popularFormParaIniciar();
          // Em modo iniciar, todos os campos são readonly EXCETO conclusaoEm (para ADMIN/SOLICITANTE)
          this.form.get('idEquipamento')?.disable();
          this.form.get('tipoManutencao')?.disable();
          this.form.get('prioridadeOrdemServico')?.disable();
          this.form.get('descricaoFalha')?.disable();
          this.form.get('idTecnico')?.disable();
          this.form.get('descricaoServico')?.disable();
          this.form.get('pecasUtilizadas')?.disable();
          this.form.get('horasTrabalhadas')?.disable();

          // conclusaoEm editável APENAS para ADMIN/SOLICITANTE
          const usuario = this.authService.getCurrentUser();
          const podeEditarConclusao = usuario?.perfilUsuario === UserRole.ADMIN
            || usuario?.perfilUsuario === UserRole.SOLICITANTE;
          if (!podeEditarConclusao) {
            this.form.get('conclusaoEm')?.disable();
          }
        } else if (this.modoEncerrar) {
          this.popularFormParaEncerrar();
          // Em modo encerrar, descricaoFalha é readonly; descrição do serviço e peças editáveis (horas calculadas no backend).
          this.form.get('idEquipamento')?.disable();
          this.form.get('tipoManutencao')?.disable();
          this.form.get('prioridadeOrdemServico')?.disable();
          this.form.get('descricaoFalha')?.disable();
          this.form.get('idTecnico')?.disable();
        }

        this.aplicarValidadorTecnico();

        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Não foi possível carregar os dados do formulário.';
        this.carregandoDados = false;
        this.cdr.markForCheck();
      },
    });
  }

  private popularFormParaEdicao(): void {
    if (!this.osParaEditar) return;
    const os = this.osParaEditar;
    this.form.patchValue({
      idEquipamento: os.idEquipamento,
      tipoManutencao: os.tipoManutencao,
      prioridadeOrdemServico: os.prioridadeOrdemServico,
      descricaoFalha: os.descricaoFalha,
      idTecnico: os.idTecnico ?? '',
      descricaoServico: os.descricaoServico ?? '',
      pecasUtilizadas: os.pecasUtilizadas ?? '',
      horasTrabalhadas: os.horasTrabalhadas ?? null,
      conclusaoEm: os.conclusaoEm ? String(os.conclusaoEm).substring(0, 10) : '',
    });
  }

  private popularFormParaIniciar(): void {
    if (!this.osParaIniciar) return;
    const os = this.osParaIniciar;
    this.form.patchValue({
      idEquipamento: os.idEquipamento,
      tipoManutencao: os.tipoManutencao,
      prioridadeOrdemServico: os.prioridadeOrdemServico,
      descricaoFalha: os.descricaoFalha,
      idTecnico: os.idTecnico ?? '',
      descricaoServico: os.descricaoServico ?? '',
      pecasUtilizadas: os.pecasUtilizadas ?? '',
      horasTrabalhadas: os.horasTrabalhadas ?? null,
      conclusaoEm: os.conclusaoEm ? String(os.conclusaoEm).substring(0, 10) : '',
    });
  }

  private popularFormParaEncerrar(): void {
    if (!this.osParaEncerrar) return;
    const os = this.osParaEncerrar;
    this.form.patchValue({
      idEquipamento: os.idEquipamento,
      tipoManutencao: os.tipoManutencao,
      prioridadeOrdemServico: os.prioridadeOrdemServico,
      descricaoFalha: os.descricaoFalha,
      idTecnico: os.idTecnico ?? '',
      descricaoServico: os.descricaoServico ?? '',
      pecasUtilizadas: os.pecasUtilizadas ?? '',
      horasTrabalhadas: os.horasTrabalhadas ?? null,
      conclusaoEm: os.conclusaoEm ? String(os.conclusaoEm).substring(0, 10) : '',
    });
  }

  onEquipamentoClick(): void {
    if (!this.modoEdicao) return;
    this.dialogTitulo = 'Campo não editável';
    this.dialogMensagem = 'O equipamento vinculado a uma OS não pode ser alterado após sua criação. Para um equipamento diferente, crie uma nova OS.';
    this.dialogTipo = 'info';
    this.dialogBotoes = [{ label: 'Entendi', acao: 'ok', estilo: 'primario' }];
    this.dialogVisivel = true;
  }

  onDialogAcao(acao: string): void {
    this.dialogVisivel = false;
    // Método pode ser sobrescrito por salvarIniciar() para handler customizado
  }

  get f() {
    return this.form.controls;
  }

  isInvalid(campo: string): boolean {
    const ctrl = this.form.get(campo);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  private aplicarValidadorTecnico(): void {
    const ctrl = this.form.get('idTecnico');
    if (!ctrl) return;
    if (this.requerTecnico) {
      ctrl.setValidators([Validators.required]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private mostrarDialogValidacaoFormulario(): void {
    const idTecnicoCtrl = this.form.get('idTecnico');
    if (this.requerTecnico && idTecnicoCtrl?.invalid) {
      this.dialogTitulo = 'Campo obrigatório';
      this.dialogMensagem =
        'Técnico responsável é obrigatório.';
    } else {
      this.dialogTitulo = 'Campos obrigatórios';
      this.dialogMensagem =
        'Preencha todos os campos obrigatórios marcados com * antes de salvar.';
    }
    this.dialogTipo = 'erro';
    this.dialogBotoes = [{ label: 'Entendi', acao: 'ok', estilo: 'primario' }];
    this.dialogVisivel = true;
    this.cdr.markForCheck();
  }

  onSalvar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.mostrarDialogValidacaoFormulario();
      return;
    }

    const usuario = this.authService.getCurrentUser();
    if (!usuario) {
      this.erro = 'Sessão expirada. Faça login novamente.';
      return;
    }

    const raw = this.form.getRawValue();
    this.salvando = true;
    this.erro = null;

    if (this.modoIniciar) {
      this.salvarIniciar(raw);
    } else if (this.modoEncerrar) {
      this.salvarEncerrar(raw);
    } else if (this.modoEdicao) {
      this.salvarEdicao(raw);
    } else {
      this.salvarCriacao(raw, usuario);
    }
  }

  private salvarCriacao(raw: ReturnType<typeof this.form.getRawValue>, usuario: NonNullable<ReturnType<typeof this.authService.getCurrentUser>>): void {
    const payload: CriarOrdemServicoPayload = {
      idEquipamento: raw.idEquipamento!,
      idSolicitante: usuario.idUsuario,
      tipoManutencao: raw.tipoManutencao as CriarOrdemServicoPayload['tipoManutencao'],
      prioridadeOrdemServico:
        raw.prioridadeOrdemServico as CriarOrdemServicoPayload['prioridadeOrdemServico'],
      statusOrdemServico: OrdemStatus.ABERTO,
      descricaoFalha: raw.descricaoFalha!,
      idTecnico: raw.idTecnico!.trim(),
    };

    if (raw.descricaoServico?.trim()) payload.descricaoServico = raw.descricaoServico;

    this.ordemService.criar(payload).subscribe({
      next: () => { this.salvando = false; this.salvo.emit(); },
      error: (err) => {
        this.erro = err?.error?.message ?? 'Erro ao salvar a ordem de serviço.';
        this.salvando = false;
        this.cdr.markForCheck();
      },
    });
  }

  private salvarEdicao(raw: ReturnType<typeof this.form.getRawValue>): void {
    const payload: any = {
      tipoManutencao: raw.tipoManutencao as any,
      prioridadeOrdemServico: raw.prioridadeOrdemServico as any,
      descricaoFalha: raw.descricaoFalha!,
    };

    const osAberta =
      this.osParaEditar!.statusOrdemServico === OrdemStatus.ABERTO;
    if (osAberta) {
      payload.idTecnico = raw.idTecnico!.trim();
    } else if (raw.idTecnico?.trim()) {
      payload.idTecnico = raw.idTecnico;
    } else {
      payload.idTecnico = null;
    }
    if (raw.descricaoServico?.trim()) payload.descricaoServico = raw.descricaoServico;
    if (raw.pecasUtilizadas?.trim()) payload.pecasUtilizadas = raw.pecasUtilizadas;
    if (raw.horasTrabalhadas) payload.horasTrabalhadas = Number(raw.horasTrabalhadas);
    if (raw.conclusaoEm?.trim()) payload.conclusaoEm = raw.conclusaoEm;

    this.ordemService.atualizar(this.osParaEditar!.idOrdemServico, payload).subscribe({
      next: () => { this.salvando = false; this.salvo.emit(); },
      error: (err) => {
        this.erro = err?.error?.message ?? 'Erro ao atualizar a ordem de serviço.';
        this.salvando = false;
        this.cdr.markForCheck();
      },
    });
  }

  private salvarIniciar(raw: ReturnType<typeof this.form.getRawValue>): void {
    // Validar conclusaoEm obrigatório
    if (!raw.conclusaoEm?.trim()) {
      this.dialogTitulo = 'Campo obrigatório';
      this.dialogMensagem = 'Data prevista para conclusão é obrigatória para iniciar o atendimento.';
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Entendi', acao: 'ok', estilo: 'primario' }];
      this.dialogVisivel = true;
      this.salvando = false;
      return;
    }

    // Dialog de confirmação
    this.dialogTitulo = 'Confirmar Início';
    this.dialogMensagem = 'Você deseja iniciar o atendimento desta ordem de serviço?';
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim', acao: 'confirmar', estilo: 'primario' },
    ];
    this.dialogVisivel = true;

    // Armazenar callback para executar após confirmação
    const callback = () => {
      const payload: AtualizarOrdemServicoPayload = {
        statusOrdemServico: OrdemStatus.EM_ANDAMENTO,
        conclusaoEm: raw.conclusaoEm!.trim(),
        inicioEm: new Date().toISOString(),
      };
      this.ordemService.atualizar(this.osParaIniciar!.idOrdemServico, payload).subscribe({
        next: () => {
          this.salvando = false;
          this.salvo.emit();
        },
        error: (err) => {
          this.erro = err?.error?.message ?? 'Erro ao iniciar a ordem de serviço.';
          this.salvando = false;
          this.cdr.markForCheck();
        },
      });
    };

    // Interceptar onDialogAcao para executar callback
    const originalOnDialog = this.onDialogAcao.bind(this);
    this.onDialogAcao = (acao: string) => {
      this.dialogVisivel = false;
      if (acao === 'confirmar') {
        callback();
      } else {
        // Quando clica "Não" ou "Cancelar", desabilitar salvando
        this.salvando = false;
        this.cdr.markForCheck();
      }
      this.onDialogAcao = originalOnDialog; // Restaurar
    };
  }

  private salvarEncerrar(raw: ReturnType<typeof this.form.getRawValue>): void {
    // Validar 3 campos obrigatórios
    const camposObrigatorios = [
      { nome: 'Descrição do Serviço', valor: raw.descricaoServico?.trim() },
      { nome: 'Peças Utilizadas', valor: raw.pecasUtilizadas?.trim() },
    ];

    const camposVazios = camposObrigatorios.filter(c => !c.valor);
    if (camposVazios.length > 0) {
      const nomes = camposVazios.map(c => c.nome).join(', ');
      this.dialogTitulo = 'Campos obrigatórios';
      this.dialogMensagem = `${nomes} ${camposVazios.length === 1 ? 'é obrigatório' : 'são obrigatórios'} para encerrar a ordem de serviço.`;
      this.dialogTipo = 'erro';
      this.dialogBotoes = [{ label: 'Entendi', acao: 'ok', estilo: 'primario' }];
      this.dialogVisivel = true;
      this.salvando = false;
      return;
    }

    // Payload de encerramento
    const payload: any = {
      statusOrdemServico: OrdemStatus.CONCLUIDO,
      descricaoServico: raw.descricaoServico,
      pecasUtilizadas: raw.pecasUtilizadas,
    };

    this.ordemService.atualizar(this.osParaEncerrar!.idOrdemServico, payload).subscribe({
      next: () => {
        this.salvando = false;
        this.salvo.emit();
      },
      error: (err) => {
        this.erro = err?.error?.message ?? 'Erro ao encerrar a ordem de serviço.';
        this.salvando = false;
        this.cdr.markForCheck();
      },
    });
  }
}
