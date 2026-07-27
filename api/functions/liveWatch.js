// liveWatch — janela ao vivo do que está acontecendo: vendas e lançamentos de
// comissão mais recentes, já em formato de evento. Protegido por DIAG_KEY.
// SÓ LÊ — não grava, não altera saldo, não dispara nada.
//
// POR QUE (27/07/2026): antes do primeiro pagamento real o Gabriel pediu
// acompanhamento contínuo — "capte tudo o que ocorrer". Este endpoint é a fonte
// dessa vigia: devolve cada venda paga e cada linha de comissão com nome de
// gente, para conferir a distribuição no instante em que ela cai.

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

    const nVendas = Math.min(Number(body.vendas) || 25, 200);
    const nLedger = Math.min(Number(body.ledger) || 120, 800);

    // Tenta a consulta ordenada; se a coluna de data não existir nesta tabela, o
    // PostgREST devolve um objeto de erro em vez de lista — aí cai para a versão
    // simples. Sem isso a vigia fica cega achando que não há movimento.
    const buscar = async (rica, simples) => {
      const r = await (await sb(rica)).json();
      if (Array.isArray(r)) return r;
      const s = await (await sb(simples)).json();
      return Array.isArray(s) ? s : [];
    };

    // ATENÇÃO — o sistema tem DUAS tabelas de comissão, e ler só uma dá zero falso:
    //   commission_records → vendas de LOJA (motor arvoreOficial.js, o plano de 30%
    //                        do Santana, 14/07/2026). É por onde passa a compra normal.
    //   commission_ledger  → adesão, carteira e demais tipos (motor antigo do webhook).
    // A vigia mostra as duas somadas, senão uma venda de loja aparece como não paga.
    const [users, vendas, ledger, records] = await Promise.all([
      buscar('app_users?select=id,full_name,commission_balance&limit=5000', 'app_users?select=id,full_name&limit=5000'),
      buscar(
        `catalog_sales?select=*&order=created_at.desc&limit=${nVendas}`,
        `catalog_sales?select=*&limit=${nVendas}`
      ),
      buscar(
        `commission_ledger?select=*&order=created_at.desc&limit=${nLedger}`,
        `commission_ledger?select=*&limit=${nLedger}`
      ),
      buscar(
        `commission_records?select=*&order=created_date.desc&limit=${nLedger}`,
        `commission_records?select=*&limit=${nLedger}`
      ),
    ]);

    const nome = new Map(lista(users).map((u) => [u.id, u.full_name]));
    // normaliza as duas tabelas para o mesmo formato de linha
    const porVenda = {};
    for (const l of lista(ledger)) {
      (porVenda[l.sale_id] = porVenda[l.sale_id] || []).push({
        quem: l.beneficiary_name || nome.get(l.beneficiary_id) || l.beneficiary_id,
        papel: l.role_in_sale,
        pct: l.pct,
        valor: round2(l.amount),
        fonte: 'ledger',
      });
    }
    for (const r of lista(records)) {
      (porVenda[r.sale_id] = porVenda[r.sale_id] || []).push({
        quem: r.user_name || nome.get(r.user_id) || r.user_id,
        papel: r.role,
        pct: r.percent,
        valor: round2(r.amount),
        fonte: 'records',
      });
    }

    const eventos = [];

    for (const v of lista(vendas)) {
      const linhas = porVenda[v.id] || [];
      const distribuido = round2(linhas.reduce((a, l) => a + Number(l.valor || 0), 0));
      const valor = round2(v.total_amount);
      eventos.push({
        tipo: 'venda',
        chave: `venda:${v.id}:${v.status}:${linhas.length}`,
        id: v.id,
        valor,
        status: v.status,
        kind: v.kind || null,
        comprador: nome.get(v.buyer_id) || v.buyer_id || '(sem)',
        vendedor: nome.get(v.seller_id) || null,
        quando: v.created_at,
        comissao_lancada: distribuido,
        pct_distribuido: valor > 0 ? round2((distribuido / valor) * 100) : 0,
        linhas: [...linhas].sort((a, b) => b.valor - a.valor),
      });
    }

    // lançamentos sem venda correspondente na janela (não deveria acontecer)
    const idsVenda = new Set(lista(vendas).map((v) => v.id));
    for (const [saleId, linhas] of Object.entries(porVenda)) {
      if (idsVenda.has(saleId)) continue;
      for (const l of linhas) {
        eventos.push({
          tipo: 'lancamento_solto',
          chave: `solto:${l.fonte}:${saleId}:${l.quem}:${l.valor}`,
          sale_id: saleId,
          quem: l.quem,
          papel: l.papel,
          valor: l.valor,
          fonte: l.fonte,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      agora: new Date().toISOString(),
      total_vendas_janela: lista(vendas).length,
      total_ledger_janela: lista(ledger).length,
      total_records_janela: lista(records).length,
      eventos,
    });
  } catch (e) {
    return res.status(500).json({ error: 'erro', details: String(e?.message || e) });
  }
}
