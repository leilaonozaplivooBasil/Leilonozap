// 🔧 TEMPORÁRIA — BLOCO 2: preço atual ABAIXO do lance inicial (anomalia inversa)
// Iguala current_price ao starting_price nos 6 leilões auditados e aprovados.
// Lista fechada no código: nada de id/valor vindo do cliente.
// 6 travas por leilão; se qualquer uma falhar, PULA e reporta. Simulação por padrão.
// Apagar após o saneamento.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// id -> starting_price esperado (valor auditado em 03/08/2026)
const APROVADOS: Record<string, number> = {
  'f5a1ce361d3cc1618045851f': 0.8,   // Organizador De Mesa Triplo
  '252417be59dc77508ab25807': 0.8,   // Kit Caneta Fineliner 24 Cores
  'de5d9f6d6ef7d8a017216ea6': 20,    // Mini Ferro De Passar Portátil
  '69bad3baa315cf670b7c3dcf': 25,    // Ferro de Passar Vertical a Vapor
  'ba593a630604ec76521ffb7f': 216,   // Cadeira Presidente Escritório
  '784657d60a0c5de77cdfbf14': 497,   // Bike Harley M4 - SEM CNH
};

const c = (v: unknown) => Math.round((Number(v) || 0) * 100);

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
    const aplicar = body?.confirmar === true; // sem isso, só simula

    const resultado = [];

    for (const [id, esperado] of Object.entries(APROVADOS)) {
      const aRes = await fetch(
        `${SB}/rest/v1/auctions?id=eq.${id}&select=id,title,status,current_price,starting_price,commissions_distributed,winner_id`,
        { headers: H }
      );
      const a = (await aRes.json())?.[0];
      if (!a) { resultado.push({ id, acao: 'PULADO', motivo: 'leilão não encontrado' }); continue; }

      const base = { id, titulo: (a.title || '').slice(0, 40) };

      // trava 1 — precisa estar ativo
      if (a.status !== 'active') { resultado.push({ ...base, acao: 'PULADO', motivo: `trava 1: status ${a.status}` }); continue; }

      // trava 2 — zero lances (revalidado AGORA)
      const mRes = await fetch(
        `${SB}/rest/v1/auction_messages?auction_id=eq.${id}&message_type=eq.bid&select=bid_amount`,
        { headers: H }
      );
      const msgs = await mRes.json();
      if ((msgs || []).length > 0) { resultado.push({ ...base, acao: 'PULADO', motivo: `trava 2: já tem ${msgs.length} lance(s)` }); continue; }

      // trava 3 — sem vencedor
      if (a.winner_id) { resultado.push({ ...base, acao: 'PULADO', motivo: 'trava 3: tem vencedor' }); continue; }

      // trava 4 — sem comissão distribuída
      if (a.commissions_distributed === true) { resultado.push({ ...base, acao: 'PULADO', motivo: 'trava 4: comissão distribuída' }); continue; }

      // trava 5 — starting_price do banco confere com o valor auditado
      if (c(a.starting_price) !== c(esperado)) {
        resultado.push({ ...base, acao: 'PULADO', motivo: `trava 5: lance inicial mudou (auditoria ${esperado} · agora ${a.starting_price})` });
        continue;
      }

      // trava 6 — current_price ainda precisa estar ABAIXO do inicial
      if (c(a.current_price) >= c(a.starting_price)) {
        resultado.push({ ...base, acao: 'JA_CORRETO', current_price: a.current_price, starting_price: a.starting_price });
        continue;
      }

      if (!aplicar) {
        resultado.push({ ...base, acao: 'SIMULACAO', de: a.current_price, para: esperado, travas: 'TODAS OK (1-6)' });
        continue;
      }

      const up = await fetch(`${SB}/rest/v1/auctions?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify({ current_price: esperado, last_updated: new Date().toISOString() }),
      });
      if (!up.ok) { resultado.push({ ...base, acao: 'ERRO', detalhe: (await up.text()).slice(0, 200) }); continue; }
      const [novo] = await up.json();
      resultado.push({ ...base, acao: 'CORRIGIDO', de: a.current_price, para: novo.current_price });
    }

    return Response.json({
      ok: true,
      modo: aplicar ? 'APLICADO' : 'SIMULACAO',
      escrita_realizada: aplicar,
      resultado,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});