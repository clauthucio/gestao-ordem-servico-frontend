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
import { finalize } from 'rxjs/operators';

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
  ManutencaoType,
  OrdemServico,
  PrioridadeType,
} from '../../core/models/ordem-servico.model';
import { mensagemUsuarioErroApiOrdemServico } from '../../core/utils/ordem-servico-api-message.util';
import {
  dataPrevistaFormYmdParaIsoFimDoDiaLocal,
  dataPrevistaMinYmdLocal,
  dataPrevistaYmdEhAnteriorAHoje,
} from '../../core/utils/ordem-servico-data-prevista.util';
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
  /** Em edição: emite campos gravados para o pai fundir com o GET; nos outros modos, `undefined`. */
  @Output() salvo = new EventEmitter<Partial<OrdemServico> | undefined>();
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

  /** Limite inferior do `<input type="date">` da data prevista (modo iniciar). */
  get minDataPrevistaConclusaoYmd(): string {
    return dataPrevistaMinYmdLocal();
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
    dataPrevistaConclusao: [''],
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
          this.form.get('idEquipamento')?.disable();

          const usuario = this.authService.getCurrentUser();
          const podeEditarPrioridade = usuario?.perfilUsuario === UserRole.ADMIN
            || usuario?.perfilUsuario === UserRole.SOLICITANTE;
          if (!podeEditarPrioridade) {
            this.form.get('prioridadeOrdemServico')?.disable();
          }
        } else if (this.modoIniciar) {
          this.popularFormParaIniciar();
          this.form.get('idEquipamento')?.disable();
          this.form.get('tipoManutencao')?.disable();
          this.form.get('prioridadeOrdemServico')?.disable();
          this.form.get('descricaoFalha')?.disable();
          this.form.get('idTecnico')?.disable();
          this.form.get('descricaoServico')?.disable();
          this.form.get('pecasUtilizadas')?.disable();
        } else if (this.modoEncerrar) {
          this.popularFormParaEncerrar();
          this.form.get('idEquipamento')?.disable();
          this.form.get('tipoManutencao')?.disable();
          this.form.get('prioridadeOrdemServico')?.disable();
          this.form.get('descricaoFalha')?.disable();
          this.form.get('idTecnico')?.disable();
          this.form.get('dataPrevistaConclusao')?.disable();
        }

        this.aplicarValidadorTecnico();
        this.aplicarValidadorDataPrevistaConclusao();
        this.aplicarValidadoresEncerramento();

        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Não foi possível carregar os dados do formulário.';
        this.carregandoDados = false;
        this.cdr.markForCheck();
      },
    });
  }

  private dataPrevistaDoOsParaInput(os: OrdemServico): string {
    const v = os.dataPrevistaConclusao;
    if (!v) return '';
    return String(v).substring(0, 10);
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
      descricaoServico: '',
      pecasUtilizadas: os.pecasUtilizadas ?? '',
    });
  }

  private popularFormParaIniciar(): void {
    if (!this.osParaIniciar) return;
    const os = this.osParaIniciar;
    let ymd = this.dataPrevistaDoOsParaInput(os);
    if (dataPrevistaYmdEhAnteriorAHoje(ymd)) ymd = '';
    this.form.patchValue({
      idEquipamento: os.idEquipamento,
      tipoManutencao: os.tipoManutencao,
      prioridadeOrdemServico: os.prioridadeOrdemServico,
      descricaoFalha: os.descricaoFalha,
      idTecnico: os.idTecnico ?? '',
      descricaoServico: os.descricaoServico ?? '',
      pecasUtilizadas: os.pecasUtilizadas ?? '',
      dataPrevistaConclusao: ymd,
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

  private aplicarValidadorDataPrevistaConclusao(): void {
    const ctrl = this.form.get('dataPrevistaConclusao');
    if (!ctrl) return;
    if (this.modoIniciar) {
      ctrl.setValidators([Validators.required]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  /** Descrição do serviço e peças só são obrigatórios ao encerrar a OS. */
  private aplicarValidadoresEncerramento(): void {
    const ds = this.form.get('descricaoServico');
    const pu = this.form.get('pecasUtilizadas');
    if (!ds || !pu) return;
    const max = Validators.maxLength(2000);
    if (this.modoEncerrar) {
      ds.setValidators([Validators.required, max]);
      pu.setValidators([Validators.required, max]);
    } else {
      ds.setValidators([max]);
      pu.setValidators([max]);
    }
    ds.updateValueAndValidity({ emitEvent: false });
    pu.updateValueAndValidity({ emitEvent: false });
  }

  private mostrarDialogValidacaoFormulario(): void {
    const idTecnicoCtrl = this.form.get('idTecnico');
    const dpCtrl = this.form.get('dataPrevistaConclusao');
    if (this.modoIniciar && dpCtrl?.invalid) {
      this.dialogTitulo = 'Campo obrigatório';
      this.dialogMensagem =
        'Informe a data prevista para conclusão';
    } else if (this.requerTecnico && idTecnicoCtrl?.invalid) {
      this.dialogTitulo = 'Campo obrigatório';
      this.dialogMensagem =
        'Técnico responsável é obrigatório.';
    } else if (this.modoEncerrar) {
      this.dialogTitulo = 'Campos obrigatórios';
      this.dialogMensagem =
        'Informe a Descrição do Serviço e as Peças Utilizadas para finalizar a ordem.';
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

    this.ordemService.criar(payload).subscribe({
      next: () => {
        this.salvando = false;
        this.salvo.emit(undefined);
      },
      error: (err) => {
        this.erro = mensagemUsuarioErroApiOrdemServico(err, 'Erro ao salvar a ordem de serviço.');
        this.salvando = false;
        this.cdr.markForCheck();
      },
    });
  }

  private salvarEdicao(raw: ReturnType<typeof this.form.getRawValue>): void {
    const payload: AtualizarOrdemServicoPayload = {
      tipoManutencao: raw.tipoManutencao as AtualizarOrdemServicoPayload['tipoManutencao'],
      prioridadeOrdemServico: raw.prioridadeOrdemServico as AtualizarOrdemServicoPayload['prioridadeOrdemServico'],
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
    if (raw.pecasUtilizadas?.trim()) payload.pecasUtilizadas = raw.pecasUtilizadas;

    this.ordemService
      .atualizar(this.osParaEditar!.idOrdemServico, payload)
      .pipe(
        finalize(() => {
          this.salvando = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (osResposta) => {
          const overlay = this.respostaPatchEdicaoUsavel(osResposta)
            ? this.overlayEdicaoFromServidor(osResposta)
            : this.overlayEdicaoParaEstadoLocal(raw);
          this.salvo.emit(overlay);
        },
        error: (err) => {
          this.erro = mensagemUsuarioErroApiOrdemServico(err, 'Erro ao atualizar a ordem de serviço.');
        },
      });
  }

  /** Resposta mapeável do PATCH (ex.: corpo vazio/204) → usa overlay do formulário. */
  private respostaPatchEdicaoUsavel(os: OrdemServico): boolean {
    const idEsperado = this.osParaEditar!.idOrdemServico;
    return os.idOrdemServico === idEsperado && idEsperado !== '';
  }

  /** Campos editáveis conforme o corpo devolvido pelo PATCH (alinhado ao que o servidor expõe). */
  private overlayEdicaoFromServidor(os: OrdemServico): Partial<OrdemServico> {
    const overlay: Partial<OrdemServico> = {
      tipoManutencao: os.tipoManutencao,
      prioridadeOrdemServico: os.prioridadeOrdemServico,
      descricaoFalha: os.descricaoFalha,
    };
    if (os.descricaoServico !== undefined && String(os.descricaoServico).trim() !== '') {
      overlay.descricaoServico = os.descricaoServico;
    }
    if (os.pecasUtilizadas !== undefined && String(os.pecasUtilizadas).trim() !== '') {
      overlay.pecasUtilizadas = os.pecasUtilizadas;
    }
    if (os.idTecnico !== undefined && String(os.idTecnico).trim() !== '') {
      overlay.idTecnico = os.idTecnico.trim();
    } else {
      overlay.idTecnico = undefined;
    }
    return overlay;
  }

  private overlayEdicaoParaEstadoLocal(raw: ReturnType<typeof this.form.getRawValue>): Partial<OrdemServico> {
    const overlay: Partial<OrdemServico> = {
      tipoManutencao: raw.tipoManutencao as ManutencaoType,
      prioridadeOrdemServico: raw.prioridadeOrdemServico as PrioridadeType,
      descricaoFalha: raw.descricaoFalha!,
    };
    if (raw.pecasUtilizadas?.trim()) overlay.pecasUtilizadas = raw.pecasUtilizadas;
    const osAberta = this.osParaEditar!.statusOrdemServico === OrdemStatus.ABERTO;
    if (osAberta) overlay.idTecnico = raw.idTecnico!.trim();
    else if (raw.idTecnico?.trim()) overlay.idTecnico = raw.idTecnico.trim();
    else overlay.idTecnico = undefined;
    return overlay;
  }

  private salvarIniciar(raw: ReturnType<typeof this.form.getRawValue>): void {
    this.dialogTitulo = 'Confirmar Início';
    this.dialogMensagem = 'Você deseja iniciar o atendimento desta ordem de serviço?';
    this.dialogTipo = 'confirmacao';
    this.dialogBotoes = [
      { label: 'Não', acao: 'cancelar', estilo: 'neutro' },
      { label: 'Sim', acao: 'confirmar', estilo: 'primario' },
    ];
    this.dialogVisivel = true;

    const callback = () => {
      const ymd = raw.dataPrevistaConclusao?.trim() ?? '';
      const isoPrev = dataPrevistaFormYmdParaIsoFimDoDiaLocal(ymd);
      const payload: AtualizarOrdemServicoPayload = {
        statusOrdemServico: OrdemStatus.EM_ANDAMENTO,
      };
      if (isoPrev && !dataPrevistaYmdEhAnteriorAHoje(ymd)) {
        payload.dataPrevistaConclusao = isoPrev;
      }

      this.ordemService.atualizar(this.osParaIniciar!.idOrdemServico, payload).subscribe({
        next: () => {
          this.salvando = false;
          this.salvo.emit(undefined);
        },
        error: (err) => {
          this.erro = mensagemUsuarioErroApiOrdemServico(err, 'Erro ao iniciar a ordem de serviço.');
          this.salvando = false;
          this.cdr.markForCheck();
        },
      });
    };

    const originalOnDialog = this.onDialogAcao.bind(this);
    this.onDialogAcao = (acao: string) => {
      this.dialogVisivel = false;
      if (acao === 'confirmar') {
        callback();
      } else {
        this.salvando = false;
        this.cdr.markForCheck();
      }
      this.onDialogAcao = originalOnDialog;
    };
  }

  private salvarEncerrar(raw: ReturnType<typeof this.form.getRawValue>): void {
    const payload: AtualizarOrdemServicoPayload = {
      statusOrdemServico: OrdemStatus.CONCLUIDO,
      descricaoServico: raw.descricaoServico!.trim(),
      pecasUtilizadas: raw.pecasUtilizadas!.trim(),
    };

    this.ordemService.atualizar(this.osParaEncerrar!.idOrdemServico, payload).subscribe({
      next: () => {
        this.salvando = false;
        this.salvo.emit(undefined);
      },
      error: (err) => {
        this.erro = mensagemUsuarioErroApiOrdemServico(err, 'Erro ao encerrar a ordem de serviço.');
        this.salvando = false;
        this.cdr.markForCheck();
      },
    });
  }
}
