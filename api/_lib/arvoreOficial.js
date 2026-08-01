// 🌳 ÁRVORE OFICIAL DO ECOSSISTEMA — Leilão NoZap · Livoo Live
// Regra de comissão vigente (definida pelo Santana, 14/07/2026). Substitui o plano antigo de 26%
// que vinha do Base44. Distribui 30% de cada venda:
//
//   GOVERNANÇA (9%) — pagos a QUEM TEM O CARGO, sempre (pool), independente de quem vendeu:
//     CEO 3% · Livoo Live 2% · Embaixador 1% · Conselheiros 1% · Fundadores 1%
//     Diretoria Executiva 0,5% · Diretoria de Operação 0,5%
//
//   ESTRUTURA (1%) — Executivos: NÃO é pool. Só ganha sobre a PRÓPRIA estrutura (a rede dele).
//
//   OPERAÇÃO + COMERCIAL (20%) — pagos a quem ocupa o cargo NA CADEIA daquela venda:
//     Distribuidor 1% · Loja Física 3% · Ponto de Retirada 1% · Parceiro 2%
//     Licenciado 3% · Vendedor 5% · Influenciador 5%
//
//   Fatia sem dono → fica com a empresa (é o que fecha os 60% dela).
//   Empresa 60% + Rede 30% + Tributos 10% = 100%.
//
// ⚠️ NÃO altere percentuais sem ordem do Santana: o plano é contrato com a rede.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// pool: divide a fatia entre TODOS que têm o cargo (governança)
export const POOLS = [
  { id: 'ceo', pct: 3.0, nome: 'CEO' },
  { id: 'livoo_live', pct: 2.0, nome: 'Livoo Live' },
  { id: 'embaixador', pct: 1.0, nome: 'Embaixador' },
  { id: 'conselheiro', pct: 1.0, nome: 'Conselheiro' },
  { id: 'fundador', pct: 1.0, nome: 'Fundador' },
  { id: 'diretoria_executiva', pct: 0.5, nome: 'Diretoria Executiva' },
  { id: 'diretoria_operacao', pct: 0.5, nome: 'Diretoria de Operação' },
];

// 🔭 CADEIA TELESCÓPICA (20%) — regra oficial validada em 22/07/2026.
// Cada nível tem um % de VENDA DIRETA. Quem vende recebe o % CHEIO do próprio cargo;
// subindo a cadeia, cada upline recebe só o REBATE (a diferença até o nível de baixo).
//
// ⚠️ BUG CORRIGIDO EM 01/08/2026: o motor usava a tabela `CADEIA` (abaixo) — que é a
// coluna de REBATES — como se fossem fatias fixas por cargo. Resultado: venda direta de
// nível alto pagava só o rebate e o resto vazava pra empresa (Distribuidor levava 1%
// em vez de 20%). A tabela `CADEIA` fica preservada só como referência de rebate.
export const NIVEIS = [
  { id: 'influenciador',  pct: 5.0,  nome: 'Influenciador' },
  { id: 'vendedor',       pct: 10.0, nome: 'Vendedor' },
  { id: 'licenciado',     pct: 13.0, nome: 'Licenciado' },
  { id: 'parceiro',       pct: 15.0, nome: 'Parceiro' },
  { id: 'ponto_retirada', pct: 16.0, nome: 'Ponto de Retirada' },
  { id: 'loja_fisica',    pct: 19.0, nome: 'Loja Física' },
  { id: 'distribuidor',   pct: 20.0, nome: 'Distribuidor' },
];
export const CADEIA_TETO = 20.0; // teto rígido do bloco cadeia

// referência de REBATE por cargo (NÃO usar como fatia de pagamento — ver NIVEIS acima)
export const CADEIA = [
  { id: 'influenciador', pct: 5.0, nome: 'Influenciador' },
  { id: 'vendedor', pct: 5.0, nome: 'Vendedor' },
  { id: 'licenciado', pct: 3.0, nome: 'Licenciado' },
  { id: 'parceiro', pct: 2.0, nome: 'Parceiro' },
  { id: 'ponto_retirada', pct: 1.0, nome: 'Ponto de Retirada' },
  { id: 'loja_fisica', pct: 3.0, nome: 'Loja Física' },
  { id: 'distribuidor', pct: 1.0, nome: 'Distribuidor' },
];

export const PCT_EXECUTIVO = 1.0; // Gestão: própria estrutura (ou pool na venda orgânica)
export const TOTAL_PCT = [...POOLS, ...CADEIA].reduce((s, r) => s + r.pct, 0) + PCT_EXECUTIVO; // 30%
const EMPRESA = 'Leilão NoZap - Site Oficial';

// aliases: cargos antigos que significam o mesmo cargo da árvore nova
const ALIAS = {
  licenciado: ['licenciado', 'licenciado_catalogo'],
  influenciador: ['influenciador', 'influencer', 'licenciado_aplicativo'],
  vendedor: ['vendedor'],
  parceiro: ['parceiro'],
  ponto_retirada: ['ponto_retirada'],
  loja_fisica: ['loja_fisica'],
  distribuidor: ['distribuidor'],
  executivo: ['executivo', 'executivo_conta'],
  ceo: ['ceo'],
  livoo_live: ['livoo_live'],
  embaixador: ['embaixador'],
  conselheiro: ['conselheiro'],
  fundador: ['fundador'],
  diretoria_executiva: ['diretoria_executiva', 'diretoria'],
  diretoria_operacao: ['diretoria_operacao', 'diretor'],
};
// Carteira executiva: qual Sócio Executivo é dono da estrutura desta pessoa. Fica na
// coluna dedicada quando ela existir, ou dentro de licenciado_context (JSON livre)
// enquanto a migration não roda. É o que o painel da rede grava ao trocar a estrutura.
const lerCarteiraExecutiva = (u) => {
  if (!u) return null;
  if (u.executive_owner_id) return u.executive_owner_id;
  const ctx = u.licenciado_context;
  if (!ctx) return null;
  try {
    const p = typeof ctx === 'string' ? JSON.parse(ctx) : ctx;
    return p?.executive_owner_id || null;
  } catch {
    return null;
  }
};

const temCargo = (u, cargo) => {
  const meus = Array.isArray(u?.career_levels) ? u.career_levels : [];
  return (ALIAS[cargo] || [cargo]).some((c) => meus.includes(c));
};

/**
 * Calcula a distribuição de UMA venda. Função pura — dá pra simular e auditar.
 * @param {{id:string,total_amount:number,seller_id:string}} sale
 * @param {Array} users lista de contas (id, full_name, career_levels, referred_by_id)
 */
export function calcularComissao(sale, users) {
  const valor = Number(sale.total_amount) || 0;
  const byId = new Map(users.map((u) => [u.id, u]));
  const assignments = [];
  let companyPercent = 0;

  if (!valor) return { assignments: [], companyPercent: TOTAL_PCT, companyAmount: 0, total: 0 };

  // cadeia da venda: âncora (quem vendeu) + uplines. Protege contra ciclo e ponteiro quebrado.
  const chain = [];
  const vistos = new Set();
  let cur = sale.seller_id ? byId.get(sale.seller_id) : null;
  while (cur && !vistos.has(cur.id) && chain.length < 50) {
    chain.push(cur);
    vistos.add(cur.id);
    cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
  }

  const elegiveisPool = users.filter((u) => u.full_name !== EMPRESA);
  // 💰 Pool sem perda de centavo: divide a fatia em CENTAVOS INTEIROS pelo método do maior
  // resto. Antes, round2 por pessoa engolia frações (1% ÷ 7 fundadores numa venda de R$ 2,00
  // = R$ 0,00286 → R$ 0,00 pra todo mundo, e o dinheiro sumia). Agora a soma dos centavos
  // pagos é SEMPRE igual à fatia devida — ninguém é lesado, nem a rede nem a empresa.
  const pagarPool = (id, pct, tipo) => {
    const donos = elegiveisPool.filter((u) => temCargo(u, id));
    if (!donos.length) { companyPercent += pct; return; }

    const centavosTotais = Math.round(valor * pct); // valor * pct/100 * 100 = valor * pct
    const fatia = pct / donos.length;
    if (centavosTotais <= 0) { companyPercent += pct; return; }

    const base = Math.floor(centavosTotais / donos.length);
    let sobra = centavosTotais - base * donos.length;
    // Ordem estável (por id) + rotação pela venda: a sobra não cai sempre nas mesmas pessoas.
    // Ao longo das vendas o rodízio equilibra quem recebe o centavo extra.
    const ordenados = [...donos].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const seed = String(sale.id || '').split('').reduce((s, ch) => (s + ch.charCodeAt(0)) % 9973, 0);
    const offset = ordenados.length ? seed % ordenados.length : 0;
    const rotacionados = [...ordenados.slice(offset), ...ordenados.slice(0, offset)];
    for (const u of rotacionados) {
      const centavos = base + (sobra > 0 ? 1 : 0);
      if (sobra > 0) sobra--;
      if (centavos <= 0) continue; // pool menor que o nº de pessoas: quem não pega fica de fora desta venda
      assignments.push({ role: id, user_id: u.id, user_name: u.full_name, percent: fatia, amount: centavos / 100, tipo });
    }
  };

  // 1) TOPO (10%) — "o topo recebe SEMPRE" (Santana, 14/07): governança + gestão são pagos
  //    mesmo na venda orgânica (sem cadeia), porque ganham pelo CARGO, não por indicação.
  for (const p of POOLS) pagarPool(p.id, p.pct, 'governanca');

  // Executivo (1%): ganha "exclusivamente sobre a PRÓPRIA estrutura". NUNCA é pool —
  // ordem do Gabriel em 27/07/2026, depois de o rateio ter dividido o 1% entre Ribeiro
  // e Luiz numa venda da estrutura do Ribeiro. Ordem de busca:
  //   1º executivo na cadeia da venda (o mais próximo do cliente manda);
  //   2º a carteira executiva de quem está na cadeia (executive_owner, definido no
  //      painel da rede) — cobre a venda cuja cadeia não tem executivo, mas pertence
  //      à estrutura de um;
  //   3º ninguém → a fatia fica com a EMPRESA. Não se divide entre executivos.
  let exec = chain.find((u) => temCargo(u, 'executivo'));
  if (!exec) {
    for (const u of chain) {
      const donoId = lerCarteiraExecutiva(u);
      const dono = donoId ? byId.get(donoId) : null;
      if (dono && temCargo(dono, 'executivo')) { exec = dono; break; }
    }
  }
  if (exec) {
    // fatia individual: centavos inteiros (o resíduo do arredondamento sobra pra empresa, sem sumir)
    assignments.push({ role: 'executivo', user_id: exec.id, user_name: exec.full_name, percent: PCT_EXECUTIVO, amount: Math.round(valor * PCT_EXECUTIVO) / 100, tipo: 'estrutura' });
  } else {
    companyPercent += PCT_EXECUTIVO;
  }

  // 2) OPERAÇÃO + COMERCIAL (20%) — CADEIA TELESCÓPICA.
  //    Âncora (quem vendeu) leva o % de venda direta do cargo mais alto que tem.
  //    Subindo, cada upline leva o REBATE: o % dele MENOS o maior % já pago abaixo.
  //    Teto rígido de 20%; o que sobrar sem dono fica com a empresa.
  const nivelDe = (u) => {
    let melhor = null;
    for (const n of NIVEIS) if (temCargo(u, n.id) && (!melhor || n.pct > melhor.pct)) melhor = n;
    return melhor;
  };

  let pisoPago = 0;   // maior % já pago pra baixo (base do rebate do próximo)
  let pctCadeia = 0;  // quanto do teto de 20% já foi distribuído
  for (const u of chain) {
    if (pctCadeia >= CADEIA_TETO - 0.0001) break;
    const nivel = nivelDe(u);
    if (!nivel) continue;                 // sem cargo de rede (ex.: 'usuario') → não recebe
    const rebate = nivel.pct - pisoPago;  // upline de nível igual ou menor não ganha nada
    if (rebate <= 0) continue;
    const fatia = Math.min(rebate, CADEIA_TETO - pctCadeia);
    assignments.push({
      role: nivel.id, user_id: u.id, user_name: u.full_name, percent: fatia,
      amount: Math.round(valor * fatia) / 100,
      tipo: pisoPago === 0 ? 'venda_direta' : 'rebate',
    });
    pisoPago = nivel.pct;
    pctCadeia += fatia;
  }
  // fatia da cadeia sem dono (venda orgânica, cadeia curta) → empresa
  if (pctCadeia < CADEIA_TETO) companyPercent += CADEIA_TETO - pctCadeia;

  // 💰 Fechamento em centavos: o que sobrou dos 30% (fatias sem dono + resíduo de arredondamento)
  //    vai INTEGRALMENTE para a empresa. Soma paga + empresa == 30% da venda, sempre.
  const centavosRede = Math.round(assignments.reduce((s, a) => s + a.amount, 0) * 100);
  const centavos30 = Math.round(valor * TOTAL_PCT);
  const centavosEmpresa = Math.max(0, centavos30 - centavosRede);
  const total = centavosRede / 100;
  return {
    assignments,
    companyPercent: valor > 0 ? (centavosEmpresa / valor) : companyPercent,
    companyAmount: centavosEmpresa / 100,
    total,
  };
}