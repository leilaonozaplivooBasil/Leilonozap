// pdvBalcao — REGRA EXCLUSIVA DA VENDA FÍSICA (balcão / PDV).
//
// A REGRA, em uma frase: NO BALCÃO NÃO EXISTE DESCONTO NO PREÇO. Quem compra paga
// o valor cheio e recebe o percentual da PRÓPRIA licença como COMISSÃO no escritório
// virtual dele; o que sobra até o teto do balcão fica com o balcão que atendeu.
//
// 👑 TOPO 10% — REGRA SOBERANA (Santana/Gabriel, 08/08/2026):
// existe UM ÚNICO TOPO para toda a cadeia, no Brasil e no mundo. Ele recebe de TODOS
// os distribuidores, em TODA venda — leilão, loja virtual e balcão físico —, não
// importa qual distribuidor vendeu, quem está levando, a linha do comprador nem o
// meio de pagamento (dinheiro, cartão, PIX ou SALDO — saldo é dinheiro).
// Por isso o topo daqui NÃO é calculado neste arquivo: ele vem de calcularTopo()
// do api/_lib/arvoreOficial.js, o MESMO motor da loja online. Um topo só, uma régua só.
//
// ⚠️ BUG CORRIGIDO EM 08/08/2026: antes, quando a licença do comprador era
// identificada, a venda pagava SÓ o teto do balcão (20%) e o topo simplesmente não
// era pago. Sem identificar, caía no motor online e pagava 30%. A mesma venda física
// custava 20% ou 30% dependendo de um clique do operador — e o topo, que é
// inegociável, ficava de fora. Agora os dois caminhos pagam topo 10% + cadeia 20%.
//
// Por que a CADEIA é diferente do online:
// no online a comissão anda pela árvore inteira de quem comprou. No balcão, NÃO:
// o produto é do balcão (ele comprou o lote, tem o estoque, entregou na hora), então
// o rebate é SEMPRE dele — independente de o comprador ser de outra estrutura.
// Quem é de outra linha e quer que a cadeia suba pela linha dele compra na Loja Virtual.
//
// Exemplos que esta função reproduz na CADEIA (escada oficial da career_levels):
//   influenciador (5%) no balcão do distribuidor (20%) → 5% comissão pro influenciador + 15% pro balcão
//   influenciador de OUTRA estrutura no mesmo balcão   → idêntico: 5% + 15% (linha não importa)
//   distribuidor (20%) no balcão de outro distribuidor → REGRA DO DEGRAU: ele é atendido
//     como loja física (19%) e o balcão fica com 1% — a casa nunca sai zerada da venda
// Em TODOS eles, os 10% do topo sobem por cima, sempre.
import { bestSellingLevel, REDE } from './networkChain.js';
import { calcularTopo } from './arvoreOficial.js';
import { oid } from './oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const CAMPOS_USER = 'id,full_name,email,career_levels,primary_career_level,recruited_by_id,referred_by_id';
const EMPRESA = 'Leilão NoZap - Site Oficial';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/** Escada oficial da cadeia: SEMPRE lida do banco, nunca chumbada no código. */
export async function carregarTabelasBalcao() {
  // ⚠️ commission_overrides NÃO é lido aqui (limpeza 08/08/2026): a tabela de rebate
  // da rede não se aplica ao balcão — a cadeia física é comprador x casa, dentro do
  // teto do cargo do balcão. Antes o `ov` era carregado e passado adiante sem NUNCA
  // ser usado, o que fazia parecer que override de rede valia no balcão. Não vale.
  const levelsArr = await (await sb('career_levels?select=id,nome,venda_direta_pct')).json();
  const levels = {};
  (Array.isArray(levelsArr) ? levelsArr : []).forEach((l) => { levels[l.id] = l; });
  return { levels };
}

export async function buscarUsuario(id) {
  if (!id) return null;
  const arr = await (await sb(`app_users?select=${CAMPOS_USER}&id=eq.${encodeURIComponent(id)}&limit=1`)).json();
  return Array.isArray(arr) ? arr[0] || null : null;
}

/**
 * REGRA DO DEGRAU (Gabriel, 08/08/2026) — "ninguém fica ferido".
 * Quando quem compra tem cargo IGUAL OU MAIOR que o balcão, ele levava o teto inteiro
 * e o balcão — que comprou o lote, atendeu e entregou — ficava com ZERO de comissão.
 * Agora, nesse encontro, o comprador é atendido como o degrau IMEDIATAMENTE ABAIXO do
 * cargo do balcão na escada da rede, e a diferença fica com a casa.
 *   distribuidor no balcão distribuidor    → comprador como loja física (19%) · balcão 1%
 *   distribuidor no balcão loja física     → comprador como ponto de retirada (16%) · balcão 3%
 * Quem compra sendo MENOR que o balcão não muda nada: leva o próprio percentual.
 * A escada vem do banco (career_levels), nunca chumbada aqui.
 */
export function pctDegrauAbaixo(levelBalcao, levels) {
  const i = REDE.indexOf(levelBalcao);
  if (i <= 0) return 0; // balcão no primeiro degrau (ou fora da rede): não há degrau abaixo
  return Number(levels[REDE[i - 1]]?.venda_direta_pct || 0);
}

/** Percentual de COMISSÃO da própria licença da pessoa (não é desconto no preço). */
export function comissaoDaLicenca(user, levels) {
  const { level, pct } = bestSellingLevel(user, levels);
  return { level, nome: levels[level]?.nome || level, pct: Number(pct) || 0 };
}

/**
 * Paga a comissão da venda de balcão sobre o valor CHEIO cobrado.
 * TOPO  → sempre 10%, pelo motor único (arvoreOficial.calcularTopo).
 * CADEIA → comprador leva o % da licença dele; balcão fica com o resto do teto.
 */
export async function pagarComissaoBalcao({ saleId, produtoTitulo, base, comprador, balcao, levels }) {
  const valor = Number(base) || 0;
  if (!valor || !comprador || !balcao) return { total: 0, linhas: [] };

  // 🔒 idempotência: se esta venda já tem comissão, não paga de novo (retry/webhook em corrida)
  const jaTem = await (await sb(`commission_records?select=id&sale_id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
  if (Array.isArray(jaTem) && jaTem.length) return { total: 0, linhas: [], jaPago: true };

  const now = new Date().toISOString();
  const registros = [];
  const novoRegistro = (userId, userName, papel, pct, amount) => {
    const id = oid();
    return {
      id, base44_id: id, sale_id: saleId, user_id: userId, user_name: userName,
      role: papel, percent: Math.round((Number(pct) || 0) * 1000) / 1000, amount, sale_amount: valor,
      sale_type: 'catalog', status: 'confirmed', product_title: produtoTitulo || null,
      anchor_user_id: balcao.id, anchor_user_name: balcao.full_name, created_date: now,
    };
  };

  // ── 1) TOPO (10%) — motor único, o mesmo da loja online ────────────────────────
  // A "âncora" da venda é o BALCÃO: é a estrutura dele que define qual Sócio
  // Executivo recebe o 1% (Ribeiro em Bangu, Luiz Santana no Recreio). Os 9% de
  // governança são pool por cargo e caem sempre, venha de onde vier a venda.
  // ⚠️ o SELECT é o MESMO campo a campo do storeFulfill (loja online), de propósito:
  // pedir uma coluna que ainda não existe faz o PostgREST devolver erro, o topo viria
  // vazio e o balcão pagaria 0% de topo em silêncio. A carteira executiva é lida de
  // licenciado_context pelo próprio motor, então não precisa de coluna dedicada aqui.
  // 🔴 PONTO 105 (21/08/2026): aqui havia um `&active=neq.false`. Mesmo problema
  // do storeFulfill.js — esta lista vira o `byId` que a árvore usa pra subir pelo
  // referred_by_id, então uma conta arquivada no meio da linha CORTAVA a cadeia e
  // todo mundo acima perdia. Agora vai todo mundo (com a coluna `active`) e quem
  // decide quem recebe é o motor, em api/_lib/arvoreOficial.js.
  const usersTodos = await (await sb('app_users?select=id,full_name,career_levels,referred_by_id,licenciado_context,active&limit=5000')).json();
  let topo = { assignments: [], companyPercent: 0 };
  if (Array.isArray(usersTodos) && usersTodos.length) {
    topo = calcularTopo({ id: saleId, total_amount: valor, seller_id: balcao.id }, usersTodos);
  }
  for (const a of topo.assignments) {
    if (a.amount > 0.001) registros.push(novoRegistro(a.user_id, a.user_name, a.role, a.percent, a.amount));
  }

  // ── 2) CADEIA (até o teto do cargo do balcão) ──────────────────────────────────
  const balcaoLevel = bestSellingLevel(balcao, levels);
  const tetoPct = Number(balcaoLevel.pct) || 0;
  const compradorPct = Number(bestSellingLevel(comprador, levels).pct) || 0;

  // 🏪 Comprador MENOR que o balcão: leva o percentual da própria licença e o balcão
  // fica com o resto do teto. Comprador IGUAL OU MAIOR: entra a REGRA DO DEGRAU — ele é
  // atendido como o degrau imediatamente abaixo do balcão, para a casa nunca ficar zerada.
  const pctComprador = compradorPct >= tetoPct
    ? Math.min(compradorPct, pctDegrauAbaixo(balcaoLevel.level, levels))
    : compradorPct;
  const pctBalcao = Math.max(0, round2(tetoPct - pctComprador));

  const pedacos = [];
  if (pctComprador > 0.001 && String(comprador.id) !== String(balcao.id)) {
    pedacos.push({ user: comprador, pct: pctComprador, papel: 'balcao_comprador' });
  }
  if (pctBalcao > 0.001) pedacos.push({ user: balcao, pct: pctBalcao, papel: 'balcao_casa' });
  // comprando de si mesmo: uma linha só, com o teto inteiro (o topo entra por cima)
  if (String(comprador.id) === String(balcao.id)) {
    pedacos.length = 0;
    if (tetoPct > 0.001) pedacos.push({ user: balcao, pct: tetoPct, papel: 'balcao_casa' });
  }

  for (const p of pedacos) {
    const amount = round2(valor * p.pct / 100);
    if (amount <= 0.001) continue;
    registros.push(novoRegistro(p.user.id, p.user.full_name, p.papel, p.pct, amount));
  }

  if (!registros.length) return { total: 0, linhas: [], teto_pct: tetoPct };

  // ── 3) GRAVA E CREDITA — com conferência ───────────────────────────────────────
  const ins = await sb('commission_records', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(registros) });
  if (!ins.ok) {
    const t = await ins.text();
    throw new Error(`Falha ao gravar comissão do balcão: ${t.slice(0, 200)}`);
  }

  // 💸 CRÉDITO CONFERIDO (correção 08/08/2026): antes o crédito era disparado sem
  // olhar o retorno. Se um falhasse, o registro existia mas o saldo NÃO caía — e a
  // guarda de idempotência acima impedia qualquer reprocessamento. Dinheiro que
  // aparecia no extrato e nunca no saldo, em silêncio. Agora, o que não cair fica
  // marcado como 'pending' e pode ser reprocessado depois SEM pagar em dobro.
  let total = 0;
  const naoCreditados = [];
  for (const r of registros) {
    let ok = false;
    try {
      const res = await sb('rpc/credit_commission', { method: 'POST', body: JSON.stringify({ _user: r.user_id, _amount: r.amount }) });
      ok = res.ok;
    } catch (_) { ok = false; }
    if (ok) {
      total = round2(total + r.amount);
    } else {
      naoCreditados.push(r);
      await sb(`commission_records?id=eq.${encodeURIComponent(r.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'pending' }),
      });
      console.error(`[PDV] Comissão NÃO creditada (marcada como pendente): venda ${saleId}, pessoa ${r.user_id}, R$ ${r.amount}`);
    }
  }

  return {
    total,
    topo_pct: round2(topo.assignments.reduce((s, a) => s + (Number(a.percent) || 0), 0)),
    comprador_pct: pctComprador,
    balcao_pct: pctBalcao,
    teto_pct: tetoPct,
    pendentes: naoCreditados.length,
    linhas: registros.map((r) => ({ nome: r.user_name, papel: r.role, pct: r.percent, valor: r.amount })),
  };
}