// 🔧 TEMPORÁRIA — BLOCO 3: leilões ATIVOS com current_price ACIMA do esperado.
// Esperado = maior lance real; ou starting_price quando nunca houve lance.
// Lista fechada no código (4 ids auditados em 03/08/2026): nada vem do cliente.
// 7 travas por leilão; se qualquer uma falhar, PULA e reporta. Simulação por padrão.
// Escreve SOMENTE o campo current_price. Apagar após o saneamento.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

type Caso = { alvo: number; era: number; tipo: 'SEM_LANCE' | 'INFLADO'; titulo: string };

const APROVADOS: Record<string, Caso> = {
  'de8179d873183851cccce214': { alvo: 0.8, era: 5.8, tipo: 'SEM_LANCE', titulo: 'Kit 5 Spot Luminária 7w' },
  'c4b71c386d2e606e1444ad09': { alvo: 30, era: 32, tipo: 'SEM_LANCE', titulo: 'Mini Máquina Forma Elétrica' },
  '6edf44c60cc7c10311e46e3e': { alvo: 1.6, era: 3.6, tipo: 'SEM_LANCE', titulo: 'Sensor De Presença Torvstore' },
  '3a143cc65d7530fb39c7e16c': { alvo: 3.8, era: 5.8, tipo: 'INFLADO', titulo: 'Irrigador Dental Bucal' },
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

    for (const [id, caso] of Object.entries(APROVADOS)) {
      const aRes = await fetch(
        `${SB}/rest/v1/auctions?id=eq.${id}&select=id,title,status,current_price,starting_price,commissions_distributed,winner_id,winner_name`,
        { headers: H }
      );
      const a = (await aRes.json())?.[0];
      if (!a) { resultado.push({ id, acao: 'PULADO', motivo: 'leilão não encontrado' }); continue; }

      const base = { id, titulo: (a.title || caso.titulo || '').slice(0, 40), tipo: caso.tipo };

      // trava 1 — precisa estar ATIVO
      if (a.status !== 'active') {
        resultado.push({ ...base, acao: 'PULADO', motivo: `trava 1: status ${a.status}` });
        continue;
      }

      // trava 2 — sem comissão distribuída
      if (a.commissions_distributed === true) {
        resultado.push({ ...base, acao: 'PULADO', motivo: 'trava 2: comissão distribuída' });
        continue;
      }

      // trava 3 — COERÊNCIA DO LÍDER (revisada 03/08/2026, após ler submitAtomicBid):
      // winner_id em leilão ATIVO é o LÍDER ATUAL, não o vencedor final — todo leilão
      // que recebeu lance tem esse campo preenchido. Exigir "sem vencedor" era errado.
      // A trava correta é de coerência, e é aplicada junto da trava 5 (lances reais):
      //   • existe lance real  → winner_id TEM de ser o autor do maior lance
      //   • zero lance real    → winner_id é resíduo pré-PONTO 72 (permitido corrigir)
      // O vencedor definitivo é sempre reapurado por finalizeAuctionCore no encerramento.

      // trava 4 — sem pagamento vinculado (asaas / carteira digital)
      let temPagamento = false;
      const avisos = [];
      try {
        const r = await fetch(`${SB}/rest/v1/asaas_payments?auction_id=eq.${id}&select=id`, { headers: H });
        if (r.ok) { if (((await r.json()) || []).length > 0) temPagamento = true; }
        else avisos.push('asaas_payments indisponível');
      } catch { avisos.push('asaas_payments indisponível'); }
      try {
        const r = await fetch(
          `${SB}/rest/v1/digital_wallet_transactions?related_auction_id=eq.${id}&select=id`,
          { headers: H }
        );
        if (r.ok) { if (((await r.json()) || []).length > 0) temPagamento = true; }
        else avisos.push('digital_wallet_transactions indisponível');
      } catch { avisos.push('digital_wallet_transactions indisponível'); }
      if (temPagamento) {
        resultado.push({ ...base, acao: 'PULADO', motivo: 'trava 4: tem pagamento vinculado' });
        continue;
      }

      // trava 5 — lances reais revalidados AGORA
      const mRes = await fetch(
        `${SB}/rest/v1/auction_messages?auction_id=eq.${id}&message_type=eq.bid&select=bid_amount,sender_id,sender_name`,
        { headers: H }
      );
      const msgs = (await mRes.json()) || [];
      const topo = msgs.length
        ? msgs.reduce((m: any, x: any) => ((Number(x.bid_amount) || 0) > (Number(m?.bid_amount) || 0) ? x : m), null)
        : null;
      const maiorLance = topo ? Number(topo.bid_amount) || 0 : null;

      // trava 3 (aplicada aqui) — o líder gravado tem de ser o autor do maior lance real.
      // Divergência = registro histórico inconsistente: NÃO se corrige preço por cima disso.
      if (msgs.length > 0 && a.winner_id && topo?.sender_id && a.winner_id !== topo.sender_id) {
        resultado.push({
          ...base,
          acao: 'PULADO',
          motivo: `trava 3: líder gravado (${a.winner_name || a.winner_id}) não é o autor do maior lance (${topo.sender_name || topo.sender_id})`,
        });
        continue;
      }

      if (caso.tipo === 'SEM_LANCE') {
        if (msgs.length > 0) {
          resultado.push({ ...base, acao: 'PULADO', motivo: `trava 5: agora tem ${msgs.length} lance(s)` });
          continue;
        }
        // trava 6 — alvo tem de ser exatamente o starting_price atual
        if (c(a.starting_price) !== c(caso.alvo)) {
          resultado.push({ ...base, acao: 'PULADO', motivo: `trava 6: lance inicial mudou (alvo ${caso.alvo} · agora ${a.starting_price})` });
          continue;
        }
      } else {
        if (maiorLance === null) {
          resultado.push({ ...base, acao: 'PULADO', motivo: 'trava 5: nenhum lance encontrado (esperava lances)' });
          continue;
        }
        // trava 6 — alvo tem de ser exatamente o MAIOR lance real
        if (c(maiorLance) !== c(caso.alvo)) {
          resultado.push({ ...base, acao: 'PULADO', motivo: `trava 6: maior lance mudou (alvo ${caso.alvo} · agora ${maiorLance})` });
          continue;
        }
      }

      // trava 7 — current_price ainda tem de ser o valor "era" da auditoria
      if (c(a.current_price) !== c(caso.era)) {
        resultado.push({
          ...base,
          acao: c(a.current_price) === c(caso.alvo) ? 'JA_CORRETO' : 'PULADO',
          motivo: c(a.current_price) === c(caso.alvo) ? undefined : `trava 7: preço atual mudou (auditoria ${caso.era} · agora ${a.current_price})`,
          current_price: a.current_price,
        });
        continue;
      }

      if (!aplicar) {
        resultado.push({
          ...base,
          acao: 'SIMULACAO',
          valor_antes: a.current_price,
          valor_depois: caso.alvo,
          maior_lance_real: maiorLance,
          starting_price: a.starting_price,
          travas: 'TODAS OK (1-7)',
          avisos: avisos.length ? avisos : undefined,
        });
        continue;
      }

      const up = await fetch(`${SB}/rest/v1/auctions?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify({ current_price: caso.alvo, last_updated: new Date().toISOString() }),
      });
      if (!up.ok) {
        resultado.push({ ...base, acao: 'ERRO', detalhe: (await up.text()).slice(0, 200) });
        continue;
      }
      const [novo] = await up.json();
      resultado.push({ ...base, acao: 'CORRIGIDO', valor_antes: a.current_price, valor_depois: novo.current_price, aplicado: true });
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