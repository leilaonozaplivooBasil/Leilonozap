// 🔍 TEMPORÁRIA — DIAGNÓSTICO "Não foi possível registrar o lance" (100% LEITURA)
//
// CAUSA-RAIZ JÁ CONFIRMADA por este leitor (04/08/2026):
//   auction_messages.frete_amount NÃO EXISTE no banco (erro 42703), mas o
//   submitAtomicBid manda esse campo no INSERT → todo lance falha com a mensagem
//   "Não foi possível registrar o lance. Tente novamente."
//   A migração 20260801_frete_leilao.sql entrou PELA METADE: a coluna de auctions
//   (frete_reservado_valor) existe, a de auction_messages não.
//
// Este modo mede o SALDO TRAVADO (dinheiro que ficou reservado em tentativas que
// falharam) para dimensionar o estrago antes de qualquer correção.
//
// ⛔ NÃO FAZ NENHUMA ESCRITA. Só GET no PostgREST.
// Apagar depois do saneamento.
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

    const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
    const get = async (path: string) => {
      const r = await fetch(`${SB}/rest/v1/${path}`, { headers: h });
      const t = await r.text();
      let d; try { d = JSON.parse(t); } catch { d = t; }
      return { ok: r.ok, status: r.status, data: d };
    };

    // 1) SALDO TRAVADO — quem está com saldo_reservado > 0 agora
    const travados = await get(
      'app_users?select=id,nickname,full_name,saldo_disponivel,saldo_reservado&saldo_reservado=gt.0&order=saldo_reservado.desc&limit=60'
    );
    const lista: any[] = Array.isArray(travados.data) ? travados.data : [];
    const totalTravado = lista.reduce((s, u) => s + (Number(u.saldo_reservado) || 0), 0);

    // 2) Reserva LEGÍTIMA por leilão ativo: soma do preço + frete de quem é líder hoje
    const comLider = await get(
      'auctions?select=id,current_price,winner_id,winner_name,frete_reservado_valor&status=eq.active&winner_id=not.is.null&limit=200'
    );
    const lideres: any[] = Array.isArray(comLider.data) ? comLider.data : [];
    const esperadoPorUsuario: Record<string, number> = {};
    for (const a of lideres) {
      const v = (Number(a.current_price) || 0) + (Number(a.frete_reservado_valor) || 0);
      esperadoPorUsuario[a.winner_id] = (esperadoPorUsuario[a.winner_id] || 0) + v;
    }

    // 3) Comparação: reservado real × reserva justificada por liderança de leilão
    const comparacao = lista.map((u) => {
      const reservado = Math.round((Number(u.saldo_reservado) || 0) * 100) / 100;
      const esperado = Math.round((esperadoPorUsuario[u.id] || 0) * 100) / 100;
      return {
        nome: u.nickname || u.full_name,
        id: u.id,
        disponivel: u.saldo_disponivel,
        reservado,
        justificado_por_lideranca: esperado,
        travado_sem_lance: Math.round((reservado - esperado) * 100) / 100,
      };
    });
    const totalOrfao = comparacao.reduce((s, u) => s + Math.max(0, u.travado_sem_lance), 0);

    // 4) Marco temporal: último lance que o banco aceitou
    const ultimo = await get(
      'auction_messages?select=created_date,sender_name,bid_amount&message_type=eq.bid&order=created_date.desc&limit=1'
    );

    return Response.json({
      ok: true,
      escrita_realizada: false,
      causa_raiz: 'auction_messages.frete_amount NAO EXISTE (42703) — INSERT do lance falha sempre',
      ultimo_lance_aceito_pelo_banco: ultimo.data,
      saldo_travado: {
        usuarios_com_reserva: lista.length,
        total_reservado: Math.round(totalTravado * 100) / 100,
        total_sem_lance_correspondente: Math.round(totalOrfao * 100) / 100,
      },
      detalhe: comparacao,
      leiloes_ativos_com_lider: lideres.length,
    });
  } catch (error) {
    return Response.json({ ok: false, error: String((error as any)?.message || error) }, { status: 500 });
  }
});