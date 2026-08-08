// consignadoElegibilidade — QUEM PODE RECEBER CONSIGNADO (regra oficial 08/08/2026).
//
// Decisão do Gabriel, ao pé da letra:
//   • Ponto de Retirada, Lojista / Loja Física e Distribuidor  → sempre podem
//   • Vendedor, Licenciado e Parceiro                          → SÓ se forem EXECUTIVOS
//     (já formados, com o cargo de executivo / diretoria executiva)
//   • Qualquer outro cargo                                     → não aparece pra consignado
//
// Em TODOS os casos a consignação passa por aprovação — cargo só diz quem pode pedir.

// cargos que recebem consignado sem precisar ser executivo
const CARGOS_DIRETOS = ['ponto_retirada', 'loja_fisica', 'distribuidor', 'plano_lojista'];

// cargos que só recebem consignado SE tiverem o selo de executivo
const CARGOS_SO_EXECUTIVO = ['vendedor', 'licenciado_catalogo', 'licenciado_aplicativo', 'parceiro'];

// o que conta como "executivo" (diretoria executiva formada)
const SELOS_EXECUTIVO = ['executivo', 'diretor', 'diretoria', 'ceo', 'conselheiro', 'fundador', 'socio'];

function cargosDe(user) {
  const lista = Array.isArray(user?.career_levels) ? user.career_levels : [];
  return [...lista, user?.primary_career_level].filter(Boolean).map(String);
}

/** É executivo (ou acima)? */
export function ehExecutivo(user) {
  return cargosDe(user).some((c) => SELOS_EXECUTIVO.includes(c));
}

/**
 * Pode receber consignado?
 * @returns {{ ok: boolean, motivo?: string }}
 */
export function podeReceberConsignado(user) {
  if (!user) return { ok: false, motivo: 'Usuário não encontrado' };
  if (user.active === false) return { ok: false, motivo: 'Conta inativa' };

  const cargos = cargosDe(user);
  if (!cargos.length) return { ok: false, motivo: 'Sem cargo definido' };

  if (cargos.some((c) => CARGOS_DIRETOS.includes(c))) return { ok: true };

  if (cargos.some((c) => CARGOS_SO_EXECUTIVO.includes(c))) {
    if (ehExecutivo(user)) return { ok: true };
    return { ok: false, motivo: 'Consignado neste cargo é liberado apenas para executivos formados.' };
  }

  return { ok: false, motivo: 'Seu cargo não recebe mercadoria consignada.' };
}

/** Quem pode ENVIAR / aprovar consignado. */
export function podeEnviarConsignado(user) {
  if (!user) return false;
  if (['admin', 'super_admin'].includes(user.role)) return true;
  return cargosDe(user).includes('distribuidor');
}

export const PRAZO_CONSIGNADO_DIAS = 60;