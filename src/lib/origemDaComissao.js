// 🧾 ORIGEM DA COMISSÃO — de onde veio cada linha, em português (05/10/2026, DIR-200).
//
// Dono: "relatório destrinchando os 10% dos depósitos, os 5% do leilão e a venda
// da loja virtual de acordo com a licença (Influenciador, Vendedor, Parceiro…)".
//
// Três origens, uma régua cada (docs/AUDITORIA_COMISSOES_2026-10-05.md, item 1):
//   deposito — indicação de depósito, 10%, 7 dias em espera;
//   leilao   — 5% do indicador, 10% do executivo (desde 28/09) e o retido da empresa;
//   loja     — 30% da venda da loja/balcão, por cargo (governança + executivo + cadeia).
// Função pura: a tela e os testes usam a mesma tabela.

export const ORIGENS = Object.freeze({
  deposito: { id: 'deposito', rotulo: 'Indicação de depósito', regra: '10% do depósito · libera 7 dias depois', tom: 'text-sky-300' },
  leilao: { id: 'leilao', rotulo: 'Leilão', regra: '5% indicador · 10% executivo (desde 28/09) · resto retido', tom: 'text-violet-300' },
  loja: { id: 'loja', rotulo: 'Loja virtual e balcão', regra: '30% da venda, por cargo', tom: 'text-emerald-300' },
});

/** papel gravado em commission_records → como a tela chama */
export const PAPEIS = Object.freeze({
  ceo: { rotulo: 'CEO', origem: 'loja', bloco: 'governanca', pct: '3%' },
  livoo_live: { rotulo: 'Livoo Live', origem: 'loja', bloco: 'governanca', pct: '2%' },
  embaixador: { rotulo: 'Embaixador', origem: 'loja', bloco: 'governanca', pct: '1%' },
  conselheiro: { rotulo: 'Conselheiro', origem: 'loja', bloco: 'governanca', pct: '1% dividido' },
  fundador: { rotulo: 'Fundador', origem: 'loja', bloco: 'governanca', pct: '1% dividido' },
  diretoria_executiva: { rotulo: 'Diretoria Executiva', origem: 'loja', bloco: 'governanca', pct: '0,5% dividido' },
  diretoria_operacao: { rotulo: 'Diretoria de Operação', origem: 'loja', bloco: 'governanca', pct: '0,5% dividido' },
  executivo: { rotulo: 'Executivo (estrutura)', origem: 'loja', bloco: 'estrutura', pct: '1%' },
  influenciador: { rotulo: 'Influenciador', origem: 'loja', bloco: 'cadeia', pct: '5%' },
  vendedor: { rotulo: 'Vendedor', origem: 'loja', bloco: 'cadeia', pct: '10%' },
  licenciado: { rotulo: 'Licenciado', origem: 'loja', bloco: 'cadeia', pct: '13%' },
  parceiro: { rotulo: 'Parceiro', origem: 'loja', bloco: 'cadeia', pct: '15%' },
  ponto_retirada: { rotulo: 'Ponto de Retirada', origem: 'loja', bloco: 'cadeia', pct: '16%' },
  loja_fisica: { rotulo: 'Loja Física', origem: 'loja', bloco: 'cadeia', pct: '19%' },
  distribuidor: { rotulo: 'Distribuidor', origem: 'loja', bloco: 'cadeia', pct: '20%' },
  empresa_rollup: { rotulo: 'Empresa (fatia sem dono)', origem: 'loja', bloco: 'empresa', pct: 'sobra dos 30%' },
  indicacao_deposito: { rotulo: 'Indicação de depósito', origem: 'deposito', bloco: 'indicacao', pct: '10%' },
  leilao_indicador: { rotulo: 'Indicador do arremate', origem: 'leilao', bloco: 'indicacao', pct: '5%' },
  leilao_executivo: { rotulo: 'Executivo do arremate', origem: 'leilao', bloco: 'estrutura', pct: '10%' },
  leilao_retido: { rotulo: 'Retido pela empresa (leilão)', origem: 'leilao', bloco: 'empresa', pct: 'resto dos 30%' },
});

/** 'leilao_indicador' → 'leilao'. Papel desconhecido com prefixo leilao_ é leilão; o resto é loja. */
export function origemDoPapel(role) {
  const p = PAPEIS[String(role || '')];
  if (p) return p.origem;
  if (String(role || '').startsWith('leilao_')) return 'leilao';
  if (role === 'indicacao_deposito') return 'deposito';
  return 'loja';
}

/** 'diretoria_operacao' → 'Diretoria de Operação'; desconhecido volta como veio. */
export function rotuloDoPapel(role) {
  return PAPEIS[String(role || '')]?.rotulo || String(role || '—');
}

const cent = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Resumo de uma pessoa por origem: a receber (linhas geradas), pago, estornado e
 * em espera (só depósito). Devolve só as origens em que ela tem algo.
 */
export function resumirPorOrigem(commissions = [], emEspera = []) {
  const out = {};
  const pega = (origem) => (out[origem] ||= { origem, rotulo: ORIGENS[origem]?.rotulo || origem, a_receber: 0, pago: 0, estornado: 0, em_espera: 0 });
  for (const c of Array.isArray(commissions) ? commissions : []) {
    const o = pega(origemDoPapel(c?.role));
    const v = Number(c?.amount) || 0;
    if (c?.status === 'paid') o.pago = cent(o.pago + v);
    else if (c?.status === 'reversed' || c?.status === 'canceled') o.estornado = cent(o.estornado + v);
    else if (c?.status === 'confirmed' || c?.status === 'pending') o.a_receber = cent(o.a_receber + v);
  }
  for (const l of Array.isArray(emEspera) ? emEspera : []) {
    const o = pega('deposito');
    o.em_espera = cent(o.em_espera + (Number(l?.amount) || 0));
  }
  return ['deposito', 'leilao', 'loja'].map((k) => out[k]).filter(Boolean);
}

/** A conta oficial da empresa não é "pessoa a receber": é destino contábil. */
export function ehContaDaEmpresa(u) {
  if (!u) return false;
  return String(u.referral_code || '') === 'leilaonozap' || String(u.full_name || '').trim() === 'Leilão NoZap - Site Oficial';
}
