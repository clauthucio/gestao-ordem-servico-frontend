import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
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

@Component({
  selector: 'app-os-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './os-form.html',
})
export class OsFormComponent implements OnInit {
  @Output() salvo = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

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
    tipoManutencao: ['CORRETIVA', Validators.required],
    prioridadeOrdemServico: ['MEDIA', Validators.required],
    descricaoFalha: ['', [Validators.required, Validators.maxLength(2000)]],
    idTecnico: [''],
    descricaoServico: ['', Validators.maxLength(2000)],
    pecasUtilizadas: ['', Validators.maxLength(2000)],
    horasTrabalhadas: [null as number | null, Validators.min(0)],
    conclusaoEm: [''],
  });

  ngOnInit(): void {
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
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Não foi possível carregar os dados do formulário.';
        this.carregandoDados = false;
        this.cdr.markForCheck();
      },
    });
  }

  get f() {
    return this.form.controls;
  }

  isInvalid(campo: string): boolean {
    const ctrl = this.form.get(campo);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  onSalvar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const usuario = this.authService.getCurrentUser();
    if (!usuario) {
      this.erro = 'Sessão expirada. Faça login novamente.';
      return;
    }

    const raw = this.form.getRawValue();
    this.salvando = true;
    this.erro = null;

    const payload: any = {
      idEquipamento: raw.idEquipamento!,
      idSolicitante: usuario.idUsuario,
      tipoManutencao: raw.tipoManutencao as any,
      prioridadeOrdemServico: raw.prioridadeOrdemServico as any,
      statusOrdemServico: OrdemStatus.ABERTO,
      descricaoFalha: raw.descricaoFalha!,
    };

    if (raw.idTecnico) payload.idTecnico = raw.idTecnico;
    if (raw.descricaoServico) payload.descricaoServico = raw.descricaoServico;
    if (raw.pecasUtilizadas) payload.pecasUtilizadas = raw.pecasUtilizadas;
    if (raw.horasTrabalhadas != null) payload.horasTrabalhadas = raw.horasTrabalhadas;
    if (raw.conclusaoEm) payload.conclusaoEm = raw.conclusaoEm;

    this.ordemService.criar(payload).subscribe({
      next: () => {
        this.salvando = false;
        this.salvo.emit();
      },
      error: (err) => {
        console.error('[OsForm] Erro ao criar OS:', err);
        this.erro = err?.error?.message ?? 'Erro ao salvar a ordem de serviço.';
        this.salvando = false;
        this.cdr.markForCheck();
      },
    });
  }
}
