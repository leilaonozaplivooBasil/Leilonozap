/**
 * sendAuctionReminder24h
 *
 * Chamado pela automação agendada "Leilão — Lembretes 24h".
 * Busca leilões que encerram em ~24h e avisa por WhatsApp (Brevo) quem favoritou.
 *
 * 🟡 PONTO 89 (05/08/2026) — CORREÇÃO DE BANCO:
 * A função lia leilões, favoritos e usuários do BANCO ANTIGO (store interno do Base44),
 * cujo dado está congelado desde abril/2026. Era por isso que o log dela dizia sempre
 * "Notificados: 0" — ela procurava leilão que encerra em 24h numa base parada.
 * Agora lê TUDO da Supabase (fonte de verdade) e grava o log em `system_logs`.
 *
 * ⚠️ DEPENDÊNCIA: a tabela `favorite_auctions` da Supabase veio da migração como CASCA
 * (sem as colunas user_id / auction_id). Enquanto a migração
 * `supabase/migrations/20260805_favorite_auctions_colunas_reais.sql` não for aplicada,
 * não existe favorito gravado e o lembrete continua notificando 0 — mas agora ele
 * DENUNCIA isso no retorno (campo `aviso`) em vez de fingir sucesso silencioso.
 */

function criarSb() {
  let SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SR) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes');
  SUPABASE_URL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

  return async function sb(path: string, opts: any = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        apikey: SR,
        Authorization: `Bearer ${SR}`,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = text; }
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    return body;
  };
}

Deno.serve(async (req) => {
  try {
    const sb = criarSb();

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    // Leilões ativos que encerram entre agora+23h e agora+24h — filtrado no próprio banco
    const auctionsEnding = await sb(
      `auctions?select=id,title,end_time,current_price,starting_price&status=eq.active` +
      `&end_time=gte.${in23h.toISOString()}&end_time=lte.${in24h.toISOString()}&order=end_time.asc&limit=200`
    );

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      return Response.json({ error: 'BREVO_API_KEY not set' }, { status: 500 });
    }

    let notified = 0;
    let failed = 0;
    let favoritosEncontrados = 0;
    let aviso: string | null = null;

    for (const auction of auctionsEnding) {
      let favorites: any[] = [];
      try {
        favorites = await sb(
          `favorite_auctions?select=user_id&auction_id=eq.${encodeURIComponent(auction.id)}&limit=500`
        );
      } catch (e: any) {
        // Tabela casca (colunas ausentes) — denuncia em vez de engolir
        aviso = `Não foi possível ler favorite_auctions: ${e.message}. ` +
                `Aplique a migração 20260805_favorite_auctions_colunas_reais.sql.`;
        break;
      }

      if (!favorites || favorites.length === 0) continue;
      favoritosEncontrados += favorites.length;

      const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

      const timeLeft = new Date(auction.end_time).getTime() - now.getTime();
      const hours = Math.round(timeLeft / (60 * 60 * 1000));
      const currentPrice = formatCurrency(auction.current_price || auction.starting_price);
      const auctionTitle = auction.title || 'Leilão';

      for (const fav of favorites) {
        try {
          if (!fav.user_id) continue;
          const users = await sb(`app_users?select=id,phone&id=eq.${encodeURIComponent(fav.user_id)}&limit=1`);
          const user = users?.[0];
          if (!user?.phone) continue;

          const rawPhone = String(user.phone).replace(/\D/g, '');
          const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;

          const response = await fetch('https://api.brevo.com/v3/whatsapp/sendMessage', {
            method: 'POST',
            headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender_number: Deno.env.get('BREVO_WHATSAPP_NUMBER') || '551100000000',
              contact_numbers: [phone],
              text: `⏰ *LEILÃO ENCERRANDO EM ${hours}H*\n\n📦 *${auctionTitle}*\n💰 *${currentPrice}*\n\n🔗 Acesse agora: https://leilaonozap.net/AuctionRoom?id=${auction.id}`,
            }),
          });

          if (response.ok) notified++;
          else failed++;
        } catch (err: any) {
          console.warn(`[sendAuctionReminder24h] Erro notificando ${fav.user_id}:`, err.message);
          failed++;
        }
      }
    }

    // Log na Supabase (system_logs)
    try {
      await sb('system_logs', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          step: 'SEND_AUCTION_REMINDER_24H',
          status: aviso ? 'warning' : 'success',
          component_name: 'sendAuctionReminder24h',
          message: `Lembretes 24h. Leilões próximos: ${auctionsEnding.length}, favoritos: ${favoritosEncontrados}, notificados: ${notified}, falhas: ${failed}.${aviso ? ' AVISO: ' + aviso : ''}`,
          payload: { auctions_ending: auctionsEnding.length, favoritos: favoritosEncontrados, notified, failed, aviso, banco: 'supabase' },
        }),
      });
    } catch (e: any) {
      console.error('Falha ao gravar log na Supabase:', e.message);
    }

    return Response.json({
      status: aviso ? 'warning' : 'success',
      auctions_ending: auctionsEnding.length,
      favoritos: favoritosEncontrados,
      notified,
      failed,
      aviso,
    });
  } catch (error: any) {
    console.error('[sendAuctionReminder24h] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});