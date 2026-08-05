/**
 * recuperarPixNaoPago — RECUPERAÇÃO DE PEDIDO NÃO PAGO (Loja Virtual)
 * ============================================================================
 * 🔴 RISCO ALTO: dispara mensagem para cliente real.
 *
 * OBJETIVO: transformar pedido abandonado em venda, sem incomodar o cliente.
 *
 * DOIS TOQUES POR PEDIDO — NUNCA MAIS QUE ISSO:
 *   TOQUE 1 (12h de vida) — "seu pedido está reservado, ainda dá tempo"
 *   TOQUE 2 (20h de vida) — último aviso, 4h antes do cancelamento em 24h
 *   Depois do cancelamento: SILÊNCIO TOTAL.
 *
 * ⚠️ POR QUE O TOQUE 1 É ÀS 12h E NÃO ÀS 2h:
 * `createMPPix` não define prazo de vencimento, então o Mercado Pago aplica o
 * padrão dele (24h). Às 2h de vida o código PIX AINDA ESTÁ VÁLIDO — dizer
 * "seu PIX venceu" seria mentira, e cliente que pega a plataforma mentindo não
 * compra mais. O texto é honesto de propósito.
 *
 * TETOS ANTI-CHATICE (todos obrigatórios):
 *   • Máximo 2 mensagens por pedido, para sempre (colunas de controle no banco)
 *   • Máximo 1 mensagem por cliente por dia, somando TODOS os pedidos dele
 *   • Nada entre 21h e 8h (horário de Brasília) — madrugada queima a marca
 *
 * ⚠️ DEPENDÊNCIA: a migração 20260805_recuperacao_pix.sql precisa estar aplicada.
 * Sem as colunas, a rotina NÃO envia nada e DENUNCIA no retorno — em vez de
 * mandar a mesma mensagem a cada 30 minutos.
 *
 * ⚠️ LIMITE CONHECIDO: o telefone vem do cadastro do cliente (app_users).
 * Comprador sem cadastro não tem telefone e NÃO recebe WhatsApp.
 */

const TZ = 'America/Sao_Paulo';

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

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

/** Hora atual em Brasília (0-23) — o servidor roda em UTC. */
function horaBrasilia(): number {
  const h = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: 'numeric', hour12: false }).format(new Date());
  return parseInt(h, 10);
}

async function enviarWhatsApp(phone: string, texto: string): Promise<boolean> {
  const KEY = Deno.env.get('BREVO_API_KEY');
  if (!KEY) return false;
  const cru = String(phone).replace(/\D/g, '');
  if (cru.length < 10) return false;
  const numero = cru.startsWith('55') ? cru : `55${cru}`;
  try {
    const r = await fetch('https://api.brevo.com/v3/whatsapp/sendMessage', {
      method: 'POST',
      headers: { 'api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_number: Deno.env.get('BREVO_WHATSAPP_NUMBER') || '551100000000',
        contact_numbers: [numero],
        text: texto,
      }),
    });
    return r.ok;
  } catch { return false; }
}

async function enviarEmail(para: string, assunto: string, html: string): Promise<boolean> {
  const KEY = Deno.env.get('BREVO_API_KEY');
  if (!KEY || !para) return false;
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Leilão NoZap', email: 'site@leilaonozap.com' },
        to: [{ email: para }],
        subject: assunto,
        htmlContent: html,
      }),
    });
    return r.ok;
  } catch { return false; }
}

/** Textos honestos — sem urgência artificial, sem "última chance", sem cobrança. */
function montarMensagem(toque: 1 | 2, produto: string, valor: number, link: string) {
  if (toque === 1) {
    return {
      assunto: 'Seu pedido está reservado',
      whats:
        `Oi! Passando só pra avisar que seu pedido continua reservado aqui. 🙂\n\n` +
        `📦 ${produto}\n💰 ${brl(valor)}\n\n` +
        `Se quiser concluir, o código de pagamento está aqui:\n${link}\n\n` +
        `Se mudou de ideia, tudo bem — não precisa fazer nada.`,
      html:
        `<p>Oi!</p><p>Passando só pra avisar que seu pedido continua reservado aqui.</p>` +
        `<p><b>${produto}</b><br>${brl(valor)}</p>` +
        `<p><a href="${link}">Concluir o pagamento</a></p>` +
        `<p style="color:#666">Se mudou de ideia, tudo bem — não precisa fazer nada.</p>`,
    };
  }
  return {
    assunto: 'Seu pedido será encerrado em algumas horas',
    whats:
      `Oi! Seu pedido ainda está aguardando pagamento e vamos encerrá-lo em algumas horas, ` +
      `liberando o item para outros clientes.\n\n` +
      `📦 ${produto}\n💰 ${brl(valor)}\n\n` +
      `Se ainda quiser, dá pra concluir por aqui:\n${link}\n\n` +
      `Essa é a última mensagem sobre este pedido.`,
    html:
      `<p>Oi!</p><p>Seu pedido ainda está aguardando pagamento e vamos encerrá-lo em algumas horas, ` +
      `liberando o item para outros clientes.</p>` +
      `<p><b>${produto}</b><br>${brl(valor)}</p>` +
      `<p><a href="${link}">Concluir o pagamento</a></p>` +
      `<p style="color:#666">Essa é a última mensagem sobre este pedido.</p>`,
  };
}

Deno.serve(async () => {
  const sb = criarSb();
  const LINK = 'https://leilaonozap.net/MyCatalogOrders';
  const agora = Date.now();

  const resumo = {
    toque1: 0,
    toque2: 0,
    sem_contato: 0,
    bloqueado_teto_diario: 0,
    falhas: 0,
    janela_silenciosa: false as boolean,
    aviso: null as string | null,
  };

  try {
    // ── TRAVA DE HORÁRIO — 8h às 21h (Brasília). Fora disso, não envia nada.
    const h = horaBrasilia();
    if (h < 8 || h >= 21) {
      resumo.janela_silenciosa = true;
      return Response.json({ status: 'success', motivo: `fora da janela (${h}h em Brasília)`, ...resumo });
    }

    // ── Candidatos: pedidos aguardando pagamento, criados nas últimas 24h.
    // Mais velhos que 24h são problema da faxina (cleanExpiredCatalogSales), não daqui.
    const limite24h = new Date(agora - 24 * 60 * 60 * 1000).toISOString();
    const limite12h = new Date(agora - 12 * 60 * 60 * 1000).toISOString();
    const limite20h = new Date(agora - 20 * 60 * 60 * 1000).toISOString();

    let pendentes: any[] = [];
    try {
      pendentes = await sb(
        `catalog_sales?select=id,buyer_id,buyer_email,buyer_name,product_title,total_amount,created_date,` +
        `recuperacao_toque1_em,recuperacao_toque2_em` +
        `&status=eq.pending_payment&created_date=gte.${limite24h}&created_date=lte.${limite12h}` +
        `&order=created_date.asc&limit=200`
      );
    } catch (e: any) {
      // Colunas de controle ausentes = migração não aplicada. Sem memória, a rotina
      // repetiria a mensagem a cada rodada. Prefere NÃO enviar e denunciar.
      resumo.aviso =
        `Não foi possível ler as colunas de controle: ${e.message}. ` +
        `Aplique supabase/migrations/20260805_recuperacao_pix.sql antes de ativar a rotina.`;
      return Response.json({ status: 'warning', ...resumo });
    }

    // ── TETO DIÁRIO POR CLIENTE: 1 mensagem por cliente por dia, somando pedidos.
    // Lê quem já recebeu algo nas últimas 24h e barra na origem.
    const ultimas24h = new Date(agora - 24 * 60 * 60 * 1000).toISOString();
    const jaFalados = new Set<string>();
    try {
      const recentes = await sb(
        `catalog_sales?select=buyer_id,recuperacao_toque1_em,recuperacao_toque2_em` +
        `&or=(recuperacao_toque1_em.gte.${ultimas24h},recuperacao_toque2_em.gte.${ultimas24h})&limit=1000`
      );
      for (const r of recentes || []) if (r.buyer_id) jaFalados.add(String(r.buyer_id));
    } catch (_) { /* sem histórico ainda */ }

    for (const venda of pendentes) {
      // Qual toque este pedido merece agora?
      const criado = new Date(venda.created_date).getTime();
      const idade = agora - criado;
      let toque: 1 | 2 | null = null;
      if (!venda.recuperacao_toque1_em) toque = 1;
      else if (!venda.recuperacao_toque2_em && idade >= 20 * 60 * 60 * 1000) toque = 2;
      if (!toque) continue;

      const dono = String(venda.buyer_id || '');
      if (dono && jaFalados.has(dono)) { resumo.bloqueado_teto_diario++; continue; }

      // Contato: telefone vem do cadastro; e-mail vem do próprio pedido.
      let phone: string | null = null;
      if (dono) {
        try {
          const us = await sb(`app_users?select=phone&id=eq.${encodeURIComponent(dono)}&limit=1`);
          phone = us?.[0]?.phone || null;
        } catch (_) { /* segue sem telefone */ }
      }
      const email = venda.buyer_email || null;
      if (!phone && !email) { resumo.sem_contato++; continue; }

      const msg = montarMensagem(toque, venda.product_title || 'seu pedido', venda.total_amount, LINK);
      const okWhats = phone ? await enviarWhatsApp(phone, msg.whats) : false;
      const okEmail = email ? await enviarEmail(email, msg.assunto, msg.html) : false;

      if (!okWhats && !okEmail) { resumo.falhas++; continue; }

      // 🔒 MARCA O TOQUE. É isto que impede a repetição na próxima rodada.
      const campo = toque === 1 ? 'recuperacao_toque1_em' : 'recuperacao_toque2_em';
      try {
        await sb(`catalog_sales?id=eq.${encodeURIComponent(venda.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ [campo]: new Date().toISOString() }),
        });
      } catch (e: any) {
        resumo.aviso = `Mensagem enviada mas o registro falhou (risco de repetição): ${e.message}`;
      }

      if (dono) jaFalados.add(dono);
      if (toque === 1) resumo.toque1++; else resumo.toque2++;
    }

    // ── Log de auditoria
    try {
      await sb('system_logs', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          step: 'RECUPERAR_PIX_NAO_PAGO',
          status: resumo.aviso ? 'warning' : 'success',
          component_name: 'recuperarPixNaoPago',
          message:
            `Recuperação de pedido: ${resumo.toque1} primeiro(s) aviso(s), ${resumo.toque2} último(s) aviso(s), ` +
            `${resumo.bloqueado_teto_diario} barrado(s) pelo teto diário, ${resumo.sem_contato} sem contato, ` +
            `${resumo.falhas} falha(s).${resumo.aviso ? ' AVISO: ' + resumo.aviso : ''}`,
          payload: { ...resumo, candidatos: pendentes.length },
        }),
      });
    } catch (_) { /* log nunca derruba a rotina */ }

    return Response.json({ status: resumo.aviso ? 'warning' : 'success', candidatos: pendentes.length, ...resumo });
  } catch (error: any) {
    console.error('[recuperarPixNaoPago]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});