// getMyCommissions — EXTRATO DE COMISSÕES do usuário logado (service_role).
// Transparência total: de onde veio cada centavo — data, produto, quem vendeu (âncora),
// valor da venda, o cargo pelo qual você ganhou, o % e o seu ganho.
//
// Por que rota server-side: com a chave pública dava pra ler o commission_records INTEIRO
// (o ganho de todo mundo). Aqui o servidor devolve SÓ os lançamentos do próprio usuário.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

// como o dinheiro entrou (pra explicar a origem no extrato)
const ORIGEM = {
  nexus: 'Venda presencial (Nexus)',
  nexus_showroom: 'Showroom',
  nexus_whatsapp: 'WhatsApp',
  pix_mp: 'Loja online (PIX)',
  card_stripe: 'Loja online (Cartão)',
  pix: 'PIX',
  dinheiro: 'Dinheiro (balcão)',
  saldo: 'Pago com saldo',
  nexus_pdv: 'PDV',
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    if (!userId) return res.status(400).json({ success: false, error: 'Usuário obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    const limit = Math.min(Math.max(parseInt(body?.limit) || 200, 1), 1000);
    const offset = Math.max(parseInt(body?.offset) || 0, 0);

    // lançamentos do usuário (mais recentes primeiro)
    const rows = await (await sb(
      `commission_records?select=id,sale_id,role,percent,amount,sale_amount,product_title,anchor_user_name,sale_type,status,created_date&user_id=eq.${encodeURIComponent(userId)}&order=created_date.desc&limit=${limit}&offset=${offset}`
    )).json();
    const lista = Array.isArray(rows) ? rows : [];

    // total geral e por cargo (sem paginação — o extrato tem que fechar com a carteira)
    const todos = await (await sb(
      `commission_records?select=role,amount,created_date&user_id=eq.${encodeURIComponent(userId)}&limit=20000`
    )).json();
    const all = Array.isArray(todos) ? todos : [];
    const porCargo = {};
    let total = 0;
    for (const r of all) {
      const v = Number(r.amount) || 0;
      total += v;
      porCargo[r.role] = round2((porCargo[r.role] || 0) + v);
    }

    // a origem de cada venda (produto vem no próprio registro; o canal vem da venda)
    const ids = [...new Set(lista.map((r) => r.sale_id).filter(Boolean))];
    const vendas = {};
    if (ids.length) {
      const vs = await (await sb(`catalog_sales?select=id,payment_method,source,created_at,buyer_name&id=in.(${ids.map((x) => `"${x}"`).join(',')})`)).json();
      (Array.isArray(vs) ? vs : []).forEach((v) => { vendas[v.id] = v; });
    }

    const itens = lista.map((r) => {
      const v = vendas[r.sale_id] || {};
      return {
        id: r.id,
        data: r.created_date || v.created_at,
        produto: r.product_title || '(sem descrição)',
        vendedor: r.anchor_user_name || '—',   // quem vendeu (a âncora da venda)
        comprador: v.buyer_name || null,
        origem: ORIGEM[v.payment_method] || v.payment_method || r.sale_type || '—',
        valor_venda: Number(r.sale_amount) || 0,
        cargo: r.role,                          // o cargo pelo qual VOCÊ ganhou
        percentual: Number(r.percent) || 0,
        ganho: Number(r.amount) || 0,
        status: r.status || 'confirmed',
      };
    });

    const saldo = await (await sb(`app_users?select=commission_balance&id=eq.${encodeURIComponent(userId)}&limit=1`)).json();

    return res.status(200).json({
      success: true,
      total: round2(total),
      total_lancamentos: all.length,
      por_cargo: porCargo,
      saldo_carteira: Number(saldo?.[0]?.commission_balance) || 0,
      itens,
      tem_mais: lista.length === limit,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao carregar extrato', details: String(e?.message || e) });
  }
}
