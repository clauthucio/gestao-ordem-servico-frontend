import { UserRole } from '../enums/roles.enum';
import { usuarioPodeAcaoComoAdminOuTecnicoAtribuido } from './os-acoes-permissao.util';

describe('usuarioPodeAcaoComoAdminOuTecnicoAtribuido', () => {
  it('retorna false sem usuário', () => {
    expect(usuarioPodeAcaoComoAdminOuTecnicoAtribuido(null, 'tec1')).toBe(false);
    expect(usuarioPodeAcaoComoAdminOuTecnicoAtribuido(undefined, 'tec1')).toBe(false);
  });

  it('ADMIN pode independentemente do técnico da OS', () => {
    expect(
      usuarioPodeAcaoComoAdminOuTecnicoAtribuido(
        { idUsuario: 'adm', perfilUsuario: UserRole.ADMIN },
        'outro',
      ),
    ).toBe(true);
  });

  it('TÉCNICO só quando id coincide com técnico atribuído', () => {
    const tec = { idUsuario: 'tec1', perfilUsuario: UserRole.TECNICO };
    expect(usuarioPodeAcaoComoAdminOuTecnicoAtribuido(tec, 'tec1')).toBe(true);
    expect(usuarioPodeAcaoComoAdminOuTecnicoAtribuido(tec, 'tec2')).toBe(false);
  });

  it('ignora espaços em branco no id do técnico da OS', () => {
    const tec = { idUsuario: 'tec1', perfilUsuario: UserRole.TECNICO };
    expect(usuarioPodeAcaoComoAdminOuTecnicoAtribuido(tec, '  tec1  ')).toBe(true);
  });

  it('SOLICITANTE não pode por esta regra', () => {
    expect(
      usuarioPodeAcaoComoAdminOuTecnicoAtribuido(
        { idUsuario: 'sol', perfilUsuario: UserRole.SOLICITANTE },
        'sol',
      ),
    ).toBe(false);
  });
});
