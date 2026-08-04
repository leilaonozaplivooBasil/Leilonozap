// 🔍 SOMENTE LEITURA — diagnóstico: leilões com status 'active' que JÁ têm winner_id.
// Descoberto no Bloco 3 (03/08/2026): 3 dos 4 leilões auditados travaram por isso.
// Não escreve NADA. Serve para decidir a correção certa (encerrar x limpar vencedor).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const SB = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!SB || !KEY) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

    // TODOS os leilões ativos com vencedor gravado — não só os 4 do Bloco 3
    const r = await fetch(
      `${SB}/rest/v1/auctions?status=eq.active&winner_id=not.is.null` +
      `&select=id,title,status,lot_status,order_status,end_time,current_price,starting_price,` +
      `winner_id,winner_name,commissions_distributed,is_test_auction,created_date,last_updated` +
      `&order=end_time.asc`,
      { headers: H }
    );
    if (!r.ok) return Response.json({ ok: false, error: (await r.text()).slice(0, 300) }, { status: 500 });
    const lista = await r.json();

    const agora = Date.now();
    const casos = [];
    for (const a of lista) {
      // lances reais deste leilão
      const m = await fetch(
        `${SB}/rest/v1/auction_messages?auction_id=eq.${a.id}&message_type=eq.bid&select=bid_amount,sender_name,timestamp&order=timestamp.desc&limit=3`,
        { headers: H }
      );
      const bids = m.ok ? await m.json() : [];
      const cRes = await fetch(
        `${SB}/rest/v1/auction_messages?auction_id=eq.${a.id}&message_type=eq.bid&select=auction_id`,
        { headers: H }
      );
      const total = cRes.ok ? ((await cRes.json()) || []).length : null;

      const fim = a.end_time ? new Date(a.end_time).getTime() : null;
      casos.push({
        id: a.id,
        titulo: (a.title || '').slice(0, 44),
        status: a.status,
        lot_status: a.lot_status,
        order_status: a.order_status,
        end_time: a.end_time,
        prazo: fim === null ? 'sem end_time' : (fim < agora ? 'JA VENCEU' : 'ainda no ar'),
        current_price: a.current_price,
        starting_price: a.starting_price,
        winner_id: a.winner_id,
        winner_name: a.winner_name,
        qtd_lances_reais: total,
        ultimos_lances: (bids || []).map((b: any) => `${b.bid_amount} | ${b.sender_name || '?'} | ${b.timestamp}`),
        commissions_distributed: a.commissions_distributed === true,
        is_test_auction: a.is_test_auction === true,
        criado_em: a.created_date,
        atualizado_em: a.last_updated,
        diagnostico:
          (total === 0 && a.winner_id)
            ? 'INCOERENTE: tem vencedor mas ZERO lances reais'
            : (fim !== null && fim < agora)
              ? 'DEVIA ESTAR ENCERRADO: prazo vencido com vencedor definido'
              : 'ATIVO no prazo mas com vencedor gravado (verificar Compre Já / arremate imediato)',
      });
    }

    return Response.json({
      ok: true,
      escrita_realizada: false,
      total_ativos_com_vencedor: casos.length,
      casos,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});