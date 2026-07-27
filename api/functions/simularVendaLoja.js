// simularVendaLoja — mostra, ANTES de pagar, exatamente quem recebe o quê numa
// compra feita na loja de alguém. Usa a MESMA função que roda no pagamento real
// (calcularComissao de _lib/arvoreOficial.js). Protegido por DIAG_KEY. NÃO grava nada.
//
// POR QUE (27/07/2026): o simulador anterior usava o motor antigo (commission_ledger),
// que não é o que roda numa compra de loja. Dava um retrato bonito e irreal. Aqui a
// conta é feita pelo motor de verdade, então o que aparece é o que vai cair.
//
// A CHAVE DO NEGÓCIO: a cadeia de 20% segue a LOJA onde a compra é feita
// (catalog_sales.seller_id = dono da loja do link), e sobe pela linha de indicação
// dele. Não é a linha de quem compra. Comprar na loja oficial nunca paga uma linha.
//
//   POST /api/functions/simularVendaLoja
//   { key, valor: 100, loja: "ribeiro" }      loja = slug, nome ou id do dono
//
// Devolve: a cadeia da loja, cada fatia com nome, e o que sobra para a empresa.

import { calcularComissao, POOLS, CADEIA, PCT_EXECUTIVO } from '../_lib/arvoreOficial.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });
}

const lista = (x) => (Array.isArray(x) ? x : []);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    if (!process.env.DIAG_KEY || body.key !== process.env.DIAG_KEY) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ error: 'config_ausente' });

    const valor = Number(body.valor || 100);
    const busca = String(body.loja || '').trim();

    const users = lista(await (await sb(
      'app_users?select=id,full_name,email,store_slug,store_name,career_levels,primary_career_level,referred_by_id,active&limit=5000'
    )).json());
    // o motor real só considera contas ativas
    const ativos = users.filter((u) => u.active !== false);
    const byId = new Map(users.map((u) => [u.id, u]));

    let dono = null;
    if (busca) {
      const b = busca.toLowerCase();
      dono =
        byId.get(busca) ||
        ativos.find((u) => (u.store_slug || '').toLowerCase() === b) ||
        ativos.find((u) => (u.email || '').toLowerCase() === b) ||
        ativos.find((u) => (u.full_name || '').toLowerCase().includes(b)) ||
        ativos.find((u) => (u.store_name || '').toLowerCase().includes(b)) ||
        null;
      if (!dono) {
        return res.status(404).json({
          error: 'loja não encontrada',
          busca,
          dica: 'informe o slug da loja, o nome ou o e-mail do dono',
          lojas_disponiveis: ativos.filter((u) => u.store_slug).map((u) => ({ slug: u.store_slug, dono: u.full_name })),
        });
      }
    }

    // a cadeia que o motor vai percorrer: dono da loja + linha de indicação acima
    const cadeia = [];
    const vistos = new Set();
    let cur = dono;
    while (cur && !vistos.has(cur.id) && cadeia.length < 50) {
      cadeia.push({ nome: cur.full_name, cargos: Array.isArray(cur.career_levels) ? cur.career_levels : [] });
      vistos.add(cur.id);
      cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
    }

    const venda = { id: 'simulacao', total_amount: valor, seller_id: dono?.id || null };
    const { assignments, companyPercent, companyAmount, total } = calcularComissao(venda, ativos);

    const linhas = assignments
      .map((a) => ({
        quem: a.user_name,
        papel: a.role,
        tipo: a.tipo === 'governanca' ? 'TOPO (pelo cargo)' : a.tipo === 'estrutura' ? 'Sócio Executivo' : 'CADEIA (da loja)',
        pct: Math.round(a.percent * 1000) / 1000,
        valor: round2(a.amount),
      }))
      .sort((a, b) => b.valor - a.valor);

    // quais fatias da cadeia ficaram sem dono (é o que faz o dinheiro ir para a empresa)
    const semDono = CADEIA.filter((c) => !assignments.some((a) => a.role === c.id)).map((c) => ({
      cargo: c.nome,
      pct: c.pct,
      valor_perdido: round2((valor * c.pct) / 100),
    }));

    return res.status(200).json({
      ok: true,
      aviso: 'SIMULAÇÃO pelo motor real da loja (arvoreOficial) — nada foi gravado',
      venda: {
        valor,
        loja: dono ? (dono.store_name || dono.full_name) : '(nenhuma — venda sem loja/orgânica)',
        dono_da_loja: dono?.full_name || null,
        link_da_loja: dono?.store_slug ? `https://leilaonozap.net/loja/${dono.store_slug}` : '(este dono não tem loja com link)',
      },
      cadeia_percorrida: cadeia,
      distribuicao: linhas,
      resumo: {
        total_para_a_rede: round2(total),
        para_a_empresa: round2(companyAmount),
        soma: round2(total + companyAmount),
        percentual_total: round2(((total + companyAmount) / valor) * 100),
      },
      fatias_da_cadeia_sem_dono: semDono,
      referencia: {
        topo_pct: POOLS.reduce((s, p) => s + p.pct, 0),
        executivo_pct: PCT_EXECUTIVO,
        cadeia_pct: CADEIA.reduce((s, c) => s + c.pct, 0),
      },
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
