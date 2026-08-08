// pdvBalcao — REGRA EXCLUSIVA DA VENDA FÍSICA (balcão / PDV).
//
// A REGRA, em uma frase: NO BALCÃO NÃO EXISTE DESCONTO NO PREÇO. Quem compra paga
// o valor cheio e recebe o percentual da PRÓPRIA licença como COMISSÃO no escritório
// virtual dele; o que sobra até o teto do balcão fica com o balcão que atendeu.
//
// Por que é diferente do online:
// no online a comissão anda pela árvore inteira de quem comprou. No balcão, NÃO:
// o produto é do balcão (ele comprou o lote, tem o estoque, entregou na hora), então
// o rebate é SEMPRE dele — independente de o comprador ser de outra estrutura.
// Quem é de outra linha e quer que a comissão suba pela linha dele compra na Loja Virtual.
//
// Exemplos que esta função reproduz (escada oficial da career_levels):
//   influenciador (5%) no balcão do distribuidor (20%) → 5% comissão pro influenciador + 15% pro balcão
//   influenciador de OUTRA estrutura no mesmo balcão   → idêntico: 5% + 15% (linha não importa)
//   distribuidor (20%) comprando em outro balcão       → 20% pro comprador, 0% pro balcão
//
// ⚠️ NADA aqui é usado pela loja online. O online continua no storeFulfill/arvoreOficial.
import { bestSellingLevel } from './networkChain.js';
import { oid } from './oid.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const CAMPOS_USER = 'id,full_name,email,career_levels,primary_career_level,recruited_by_id,referred_by_id';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

/** Escada oficial + rebates: SEMPRE lidos do banco, nunca chumbados no código. */
export async function carregarTabelasBalcao() {
  const [levelsArr, ovRows] = await Promise.all([
    (await sb('career_levels?select=id,nome,venda_direta_pct')).json(),
    (await sb('commission_overrides?select=earner_level,on_level,pct&condicao=eq.direto')).json(),
  ]);
  const levels = {};
  (Array.isArray(levelsArr) ? levelsArr : []).forEach((l) => { levels[l.id] = l; });
  const ov = {};
  (Array.isArray(ovRows) ? ovRows : []).forEach((r) => { (ov[r.earner_level] = ov[r.earner_level] || {})[r.on_level] = Number(r.pct) || 0; });
  return { levels, ov };
}

export async function buscarUsuario(id) {
  if (!id) return null;
  const arr = await (await sb(`app_users?select=${CAMPOS_USER}&id=eq.${encodeURIComponent(id)}&limit=1`)).json();
  return Array.isArray(arr) ? arr[0] || null : null;
}

/** Percentual de COMISSÃO da própria licença da pessoa (não é desconto no preço). */
export function comissaoDaLicenca(user, levels) {
  const { level, pct } = bestSellingLevel(user, levels);
  return { level, nome: levels[level]?.nome || level, pct: Number(pct) || 0 };
}

/**
 * Paga a comissão da venda de balcão sobre o valor CHEIO cobrado.
 * Comprador identificado → % da licença dele no escritório virtual dele.
 * Balcão → o que sobra até o teto do próprio cargo. Linha/estrutura NÃO importa.
 */
export async function pagarComissaoBalcao({ saleId, produtoTitulo, base, comprador, balcao, levels, ov }) {
  const valor = Number(base) || 0;
  if (!valor || !comprador || !balcao) return { total: 0, linhas: [] };

  // 🔒 idempotência: se esta venda já tem comissão, não paga de novo (retry/webhook em corrida)
  const jaTem = await (await sb(`commission_records?select=id&sale_id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
  if (Array.isArray(jaTem) && jaTem.length) return { total: 0, linhas: [], jaPago: true };

  const tetoPct = Number(bestSellingLevel(balcao, levels).pct) || 0;
  const compradorPct = Number(bestSellingLevel(comprador, levels).pct) || 0;

  // 🏪 O comprador leva a comissão da licença dele (limitada ao teto do balcão — não dá
  // pra tirar do balcão mais do que ele mesmo tem de margem) e o balcão fica com o resto.
  const pctComprador = Math.min(compradorPct, tetoPct);
  const pctBalcao = Math.max(0, round2(tetoPct - pctComprador));

  const pedacos = [];
  if (pctComprador > 0.001 && String(comprador.id) !== String(balcao.id)) {
    pedacos.push({ user: comprador, pct: pctComprador, papel: 'balcao_comprador' });
  }
  if (pctBalcao > 0.001) pedacos.push({ user: balcao, pct: pctBalcao, papel: 'balcao_casa' });
  // comprando de si mesmo: uma linha só, com o teto inteiro
  if (String(comprador.id) === String(balcao.id)) {
    pedacos.length = 0;
    if (tetoPct > 0.001) pedacos.push({ user: balcao, pct: tetoPct, papel: 'balcao_casa' });
  }
  if (!pedacos.length) return { total: 0, linhas: [], teto_pct: tetoPct };

  const now = new Date().toISOString();
  const registros = [];
  let total = 0;
  for (const p of pedacos) {
    const amount = round2(valor * p.pct / 100);
    if (amount <= 0.001) continue;
    const id = oid();
    registros.push({
      id, base44_id: id, sale_id: saleId, user_id: p.user.id, user_name: p.user.full_name,
      role: p.papel, percent: Math.round(p.pct * 1000) / 1000, amount, sale_amount: valor,
      sale_type: 'catalog', status: 'confirmed', product_title: produtoTitulo || null,
      anchor_user_id: balcao.id, anchor_user_name: balcao.full_name, created_date: now,
    });
    total = round2(total + amount);
  }

  if (registros.length) {
    await sb('commission_records', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(registros) });
    for (const r of registros) {
      await sb('rpc/credit_commission', { method: 'POST', body: JSON.stringify({ _user: r.user_id, _amount: r.amount }) });
    }
  }

  return {
    total,
    comprador_pct: pctComprador,
    balcao_pct: pctBalcao,
    teto_pct: tetoPct,
    linhas: registros.map((r) => ({ nome: r.user_name, pct: r.percent, valor: r.amount })),
  };
}