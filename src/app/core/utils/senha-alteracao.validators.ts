import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const SENHA_ALTERACAO_MIN = 6;
export const SENHA_ALTERACAO_MAX = 100;

/** Nova senha e confirmação devem coincidir quando ambas preenchidas. */
export function senhasNovaConfirmacaoValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const nova = group.get('senhaNova')?.value as string | undefined;
    const conf = group.get('confirmarSenha')?.value as string | undefined;
    if (nova == null || conf == null || nova === '' || conf === '') {
      return null;
    }
    return nova === conf ? null : { mismatch: true };
  };
}

/** Nova senha não pode ser igual à senha atual. */
export function senhaNovaDiferenteDaAtualValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const atual = group.get('senhaAtual')?.value as string | undefined;
    const nova = group.get('senhaNova')?.value as string | undefined;
    if (atual == null || nova == null || atual === '' || nova === '') {
      return null;
    }
    return atual === nova ? { igualAtual: true } : null;
  };
}
