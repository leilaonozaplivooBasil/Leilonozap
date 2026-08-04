// 🔧 TEMPORÁRIA — CORREÇÃO PONTO 72 (escrita CIRÚRGICA, lista fixa de leilões)
// Só corrige current_price dos leilões APROVADOS pelo Gabriel após a auditoria.
// Cada leilão é revalidado antes de gravar: precisa estar ATIVO, sem comissão
// distribuída, e o valor esperado precisa continuar batendo com o maior lance real.
// Apagar após o saneamento.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Lista fechada: id -> valor correto (maior lance real, ou preço inicial se nunca houve lance)
const APROVADOS: Record<string, number> = {
  '3133d83e15b365dfcee7d2f0': 1.6,  // Kit Trilho 2m + 6 Spots — 0 lances
  '02028613fdf424b16e312c45': 1.6,  // Mini Localizador Smart Tag — 0 lances
  '25b31099c5af000f7806a5f1': 5.6,  // Suporte TV Tri-articulado — 1 lance real de 5,60
};

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

    const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
    const body = await req.json().catch(() => ({}));
    const aplicar = body?.aplicar === true; // sem isso, roda em modo simulação

    const resultado = [];

    for (const [id, esperado] of Object.entries(APROVADOS)) {
      const aRes = await fetch(
        `${SB}/rest/v1/auctions?id=eq.${id}&select=id,title,status,current_price,starting_price,commissions_distributed,winner_id`,
        { headers: H }
      );
      const rows = await aRes.json();
      const a = rows?.[0];
      if (!a) { resultado.push({ id, acao: 'PULADO', motivo: 'leilão não encontrado' }); continue; }

      // trava 1: só leilão ativo
      if (a.status !== 'active') { resultado.push({ id, titulo: a.title, acao: 'PULADO', motivo: `status ${a.status}` }); continue; }
      // trava 2: nunca tocar em leilão com comissão distribuída ou vencedor
      if (a.commissions_distributed === true || a.winner_id) {
        resultado.push({ id, titulo: a.title, acao: 'PULADO', motivo: 'tem comissão/vencedor' });
        continue;
      }

      // trava 3: revalida o maior lance real AGORA (pode ter entrado lance depois da auditoria)
      const mRes = await fetch(
        `${SB}/rest/v1/auction_messages?auction_id=eq.${id}&message_type=eq.bid&select=bid_amount`,
        { headers: H }
      );
      const msgs = await mRes.json();
      const maior = (msgs || []).reduce((mx, m) => Math.max(mx, Number(m.bid_amount) || 0), 0);
      const alvo = maior > 0 ? maior : Number(a.starting_price) || 0;

      if (Math.round(alvo * 100) !== Math.round(esperado * 100)) {
        resultado.push({
          id, titulo: a.title, acao: 'PULADO',
          motivo: `valor real mudou (auditoria ${esperado} · agora ${alvo}) — reauditar antes`,
        });
        continue;
      }

      if (Math.round(Number(a.current_price) * 100) === Math.round(alvo * 100)) {
        resultado.push({ id, titulo: a.title, acao: 'JA_CORRETO', current_price: a.current_price });
        continue;
      }

      if (!aplicar) {
        resultado.push({ id, titulo: a.title, acao: 'SIMULACAO', de: a.current_price, para: alvo });
        continue;
      }

      const up = await fetch(`${SB}/rest/v1/auctions?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify({ current_price: alvo, last_updated: new Date().toISOString() }),
      });
      if (!up.ok) {
        resultado.push({ id, titulo: a.title, acao: 'ERRO', detalhe: (await up.text()).slice(0, 200) });
        continue;
      }
      const [novo] = await up.json();
      resultado.push({ id, titulo: a.title, acao: 'CORRIGIDO', de: a.current_price, para: novo.current_price });
    }

    return Response.json({ ok: true, modo: aplicar ? 'APLICADO' : 'SIMULACAO', resultado });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});