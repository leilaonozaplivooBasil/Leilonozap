// executiveCascade — põe cada pessoa na estrutura (carteira) do executivo da raiz
// da linha dela. Protegido por DIAG_KEY. Preview por padrão; grava com 'CASCATA'.
//
// POR QUE (26/07/2026): quem foi movido de lugar na árvore antes da correção
// levava junto a carteira do lugar antigo. Na linha de teste, o Gabriel Brito e o
// TTT foram para a linha do Ribeiro mas continuaram na carteira do LUIZ — o 1% do
// Sócio Executivo iria para o executivo errado.
//
// REGRA: sobe a linha de indicação até achar quem define a estrutura —
// um executive_owner explícito ou alguém que É Sócio Executivo. Quem está com a
// escolha FIXADA (negociação específica) não é tocado.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

const lista = (x) => (Array.isArray(x) ? x : []);
const EXEC = 'executivo_conta';

const cargosDe = (u) => {
  const raw = u?.career_levels;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) return [raw];
  return [];
};

function lerCarteira(u) {
  if (u?.executive_owner_id) {
    return { id: u.executive_owner_id, pinned: u.executive_owner_pinned === true };
  }
  const ctx = u?.licenciado_context;
  if (!ctx) return { id: null, pinned: false };
  try {
    const p = typeof ctx === 'string' ? JSON.parse(ctx) : ctx;
    return { id: p?.executive_owner_id || null, pinned: p?.executive_owner_pinned === true };
  } catch {
    return { id: null, pinned: false };
  }
}

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

    const users = lista(await (await sb(
      'app_users?select=id,full_name,career_levels,primary_career_level,referred_by_id,active,licenciado_context&limit=5000'
    )).json());
    const byId = new Map(users.map((u) => [u.id, u]));
    const ativos = users.filter((u) => u.active !== false);

    const correcoes = [];
    for (const u of ativos) {
      const propria = lerCarteira(u);
      if (propria.pinned) continue;                 // escolha fixada não é tocada
      if (cargosDe(u).includes(EXEC)) continue;     // executivo é dono da própria estrutura

      // Sobe a linha procurando quem manda na estrutura. O MAIS PRÓXIMO ganha:
      //   • um Sócio Executivo na linha acima → a estrutura é dele
      //   • senão, a primeira carteira já definida acima
      // Se a própria pessoa já tem carteira definida e não existe executivo acima
      // dela, ela É a raiz de uma estrutura (foi decisão do admin) — não se mexe.
      // Sobe a linha inteira. Quem manda, em ordem de prioridade:
      //   1º um Sócio Executivo POR CARGO na linha acima — a estrutura é dele,
      //      tudo que está abaixo dele pertence a ele, sem discussão;
      //   2º senão, a primeira carteira já definida acima (herança).
      // Não se dá break na primeira carteira encontrada: ela pode ser só herança
      // desatualizada de quem foi movido de lugar, e o executivo de verdade estar
      // logo acima. Foi exatamente o caso do Gabriel Brito.
      const visto = new Set([u.id]);
      let cur = u.referred_by_id ? byId.get(u.referred_by_id) : null;
      let executivoAcima = null;
      let carteiraAcima = null;
      while (cur && !visto.has(cur.id)) {
        visto.add(cur.id);
        if (cargosDe(cur).includes(EXEC)) { executivoAcima = cur.id; break; }
        if (!carteiraAcima) carteiraAcima = lerCarteira(cur).id || null;
        cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
      }
      const donoDaLinha = executivoAcima || carteiraAcima;

      // Já tem carteira própria e nenhum executivo acima → ela É a raiz de uma
      // estrutura (decisão do admin, como o DISTRIBUIDOR BANGU no Ribeiro). Preserva.
      if (propria.id && !executivoAcima) continue;

      if (donoDaLinha && propria.id !== donoDaLinha) {
        correcoes.push({
          id: u.id,
          nome: u.full_name,
          de: byId.get(propria.id)?.full_name || '(sem)',
          para: byId.get(donoDaLinha)?.full_name || donoDaLinha,
          para_id: donoDaLinha,
        });
      }
    }

    if (body.mode !== 'executar' || body.confirm !== 'CASCATA') {
      return res.status(200).json({
        ok: true,
        modo: 'preview',
        instrucao: "para gravar: { key, mode: 'executar', confirm: 'CASCATA' }",
        a_corrigir: correcoes.length,
        correcoes,
      });
    }

    let ok = 0;
    const falhas = [];
    for (const c of correcoes) {
      const ctx = JSON.stringify({
        executive_owner_id: c.para_id,
        executive_owner_pinned: false,
        executive_owner_since: new Date().toISOString(),
      });
      const r = await sb(`app_users?id=eq.${encodeURIComponent(c.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ licenciado_context: ctx, updated_date: new Date().toISOString() }),
      });
      if (r.ok) ok += 1;
      else falhas.push({ nome: c.nome, status: r.status });
    }

    return res.status(200).json({ ok: true, modo: 'executado', corrigidos: ok, falhas, correcoes });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
