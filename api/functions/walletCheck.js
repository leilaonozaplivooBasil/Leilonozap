// walletCheck — confere se a comissão lançada virou SALDO na carteira da pessoa.
// Protegido por DIAG_KEY. Só lê (modo padrão); com confirm 'CORRIGIR' acerta a
// diferença de quem ficou pra trás.
//
// POR QUE (27/07/2026): o Gabriel viu "COMISSÕES R$ 0,00" na carteira e pediu que
// a comissão caia direto para quem recebe. O crédito é feito por rpc/credit_commission
// no fim do fulfillStoreOrder — e o código não verifica o retorno dessa chamada. Se a
// função não existir no banco, ou falhar, o lançamento aparece no extrato e o dinheiro
// nunca entra na carteira, sem nenhum erro visível. Este endpoint mede a diferença.

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

    // 'desde' é essencial: a limpeza de 26/07 zerou os SALDOS mas não apagou a
    // commission_records (tabela que eu ainda não conhecia). Sem recorte de data, a
    // conferência acusa como "faltando" comissão de venda de teste antiga, já anulada
    // de propósito. Com 'desde', mede só o que caiu depois da limpeza.
    const desde = body.desde ? String(body.desde) : null;
    const fRec = desde ? `&created_date=gte.${encodeURIComponent(desde)}` : '';
    const fLed = desde ? `&created_at=gte.${encodeURIComponent(desde)}` : '';

    const users = lista(await (await sb('app_users?select=id,full_name,email,commission_balance&limit=5000')).json());
    const records = lista(await (await sb(`commission_records?select=user_id,user_name,amount,status,created_date&limit=20000${fRec}`)).json());
    const ledger = lista(await (await sb(`commission_ledger?select=beneficiary_id,beneficiary_name,amount&limit=20000${fLed}`)).json());

    // quanto CADA UM deveria ter recebido, somando as duas tabelas
    const devido = {};
    for (const r of records) {
      if (!r.user_id) continue;
      if (r.status && r.status !== 'confirmed') continue;
      devido[r.user_id] = round2((devido[r.user_id] || 0) + Number(r.amount || 0));
    }
    for (const l of ledger) {
      if (!l.beneficiary_id) continue;
      devido[l.beneficiary_id] = round2((devido[l.beneficiary_id] || 0) + Number(l.amount || 0));
    }

    const byId = new Map(users.map((u) => [u.id, u]));
    const linhas = [];
    for (const [id, valor] of Object.entries(devido)) {
      const u = byId.get(id);
      const saldo = round2(Number(u?.commission_balance) || 0);
      const dif = round2(valor - saldo);
      linhas.push({
        id,
        nome: u?.full_name || '(conta não encontrada)',
        email: u?.email || null,
        lancado: round2(valor),
        na_carteira: saldo,
        faltando: dif,
      });
    }
    linhas.sort((a, b) => b.faltando - a.faltando);

    const faltando = linhas.filter((l) => l.faltando > 0.005);
    const sobrando = linhas.filter((l) => l.faltando < -0.005);

    // testa se a função de crédito existe mesmo (crédito de zero: não move dinheiro)
    let rpcOk = null;
    try {
      const alvo = users[0]?.id;
      if (alvo) {
        const r = await sb('rpc/credit_commission', { method: 'POST', body: JSON.stringify({ _user: alvo, _amount: 0 }) });
        rpcOk = r.ok ? true : `HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`;
      }
    } catch (e) {
      rpcOk = String(e?.message || e);
    }

    if (body.mode !== 'executar' || body.confirm !== 'CORRIGIR') {
      return res.status(200).json({
        ok: true,
        modo: 'conferencia',
        desde: desde || '(tudo, desde o começo)',
        instrucao: "para creditar as diferenças: { key, mode: 'executar', confirm: 'CORRIGIR' }",
        rpc_credit_commission: rpcOk,
        pessoas_com_lancamento: linhas.length,
        total_lancado: round2(linhas.reduce((a, l) => a + l.lancado, 0)),
        total_nas_carteiras: round2(linhas.reduce((a, l) => a + l.na_carteira, 0)),
        faltando_creditar: round2(faltando.reduce((a, l) => a + l.faltando, 0)),
        todas_as_pessoas: linhas,
        pessoas_faltando: faltando,
        pessoas_com_saldo_a_mais: sobrando,
      });
    }

    // credita a diferença de quem ficou para trás (nunca tira de ninguém)
    let ok = 0;
    const falhas = [];
    for (const l of faltando) {
      const atual = round2(Number(byId.get(l.id)?.commission_balance) || 0);
      const r = await sb(`app_users?id=eq.${encodeURIComponent(l.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ commission_balance: round2(atual + l.faltando), updated_date: new Date().toISOString() }),
      });
      if (r.ok) ok += 1;
      else falhas.push({ nome: l.nome, status: r.status });
    }

    return res.status(200).json({
      ok: true,
      modo: 'executado',
      creditados: ok,
      falhas,
      total_creditado: round2(faltando.reduce((a, l) => a + l.faltando, 0)),
      detalhe: faltando,
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
