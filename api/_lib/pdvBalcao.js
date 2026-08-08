// pdvBalcao — REGRA EXCLUSIVA DA VENDA FÍSICA (balcão / PDV).
//
// A REGRA, em uma frase: quem compra no balcão leva o desconto da PRÓPRIA licença
// e todo o restante até o teto do balcão sobe pela LINHA DO BALCÃO.
//
// Por que isso existe separado do online:
// no online a comissão anda pela árvore de quem comprou, onde quer que ele esteja.
// No físico isso dava briga: um influenciador do Recreio comprando em Bangu faria o
// dinheiro sair da mão de quem bancou o lote, tem o estoque e entregou o produto.
// Então, no balcão, o comprador ganha na hora (desconto no preço) e o restante fica
// na casa que atendeu — quebrado na cadeia se houver gente da estrutura do balcão
// no meio do caminho.
//
// Exemplos que esta função tem que reproduzir (escada oficial da career_levels):
//   influenciador (5%) direto no balcão do distribuidor (20%) → 5% desconto + 15% distribuidor
//   influenciador → licenciado de Bangu → distribuidor                → 5% + 8% + 7% = 20%
//   distribuidor (20%) comprando em outro balcão      → 20% desconto, 0% sobe
//
// ⚠️ NADA aqui é usado pela loja online. O online continua no storeFulfill/arvoreOficial.
import { bestSellingLevel, overridePct } from './networkChain.js';
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

/** Percentual de desconto que a pessoa leva no balcão (o da licença dela). */
export function descontoDaLicenca(user, levels) {
  const { level, pct } = bestSellingLevel(user, levels);
  return { level, nome: levels[level]?.nome || level, pct: Number(pct) || 0 };
}

/**
 * Sobe do comprador até o balcão. Devolve os ancestrais na ordem (pai, avô, …) terminando
 * no próprio balcão — ou null quando o comprador é de OUTRA estrutura.
 */
export async function linhaAteBalcao(comprador, balcaoId) {
  const linha = [];
  let node = comprador;
  for (let i = 0; i < 12; i++) {
    const paiId = node?.recruited_by_id || node?.referred_by_id;
    if (!paiId) return null;
    const pai = await buscarUsuario(paiId);
    if (!pai) return null;
    linha.push(pai);
    if (String(pai.id) === String(balcaoId)) return linha;
    node = pai;
  }
  return null;
}

/**
 * Paga a comissão da venda de balcão.
 * `base` é o valor CHEIO (sem o desconto do comprador) — é sobre ele que o bloco
 * do teto é calculado, então desconto + comissões sempre fecham no teto do balcão.
 */
export async function pagarComissaoBalcao({ saleId, produtoTitulo, base, comprador, balcao, levels, ov }) {
  const valor = Number(base) || 0;
  if (!valor || !comprador || !balcao) return { total: 0, linhas: [] };

  // 🔒 idempotência: se esta venda já tem comissão, não paga de novo (retry/webhook em corrida)
  const jaTem = await (await sb(`commission_records?select=id&sale_id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
  if (Array.isArray(jaTem) && jaTem.length) return { total: 0, linhas: [], jaPago: true };

  const tetoPct = Number(bestSellingLevel(balcao, levels).pct) || 0;
  const descontoPct = Number(bestSellingLevel(comprador, levels).pct) || 0;
  const restantePct = Math.max(0, round2(tetoPct - descontoPct));
  if (restantePct <= 0) return { total: 0, linhas: [], restante_pct: 0 };

  const linha = await linhaAteBalcao(comprador, balcao.id);
  const mesmaEstrutura = Array.isArray(linha);

  // monta os pedaços: intermediários da estrutura do balcão + o saldo pro balcão
  const pedacos = [];
  let usado = 0;
  if (mesmaEstrutura) {
    let filho = comprador;
    for (const ancestral of linha) {
      if (String(ancestral.id) === String(balcao.id)) break; // o balcão recebe o saldo, no fim
      const pct = Math.min(Number(overridePct(ov, ancestral, filho)) || 0, restantePct - usado);
      if (pct > 0.001) { pedacos.push({ user: ancestral, pct, papel: 'balcao_override' }); usado = round2(usado + pct); }
      filho = ancestral;
    }
  }
  const pctBalcao = round2(restantePct - usado);
  if (pctBalcao > 0.001) pedacos.push({ user: balcao, pct: pctBalcao, papel: 'balcao_casa' });

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
    desconto_pct: descontoPct,
    restante_pct: restantePct,
    teto_pct: tetoPct,
    mesma_estrutura: mesmaEstrutura,
    linhas: registros.map((r) => ({ nome: r.user_name, pct: r.percent, valor: r.amount })),
  };
}