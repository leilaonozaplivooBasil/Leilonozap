import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * dailyReport
 * 
 * Relatório diário automático: faturamento, vendas, erros e top produtos.
 * Enviado via email (Brevo) para o admin.
 * Chamado pela automação agendada "Sentinel — Relatório Diário".
 * Não requer autenticação de usuário (webhook/scheduled).
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Determina modo: daily (padrão) ou weekly (últimos 7 dias)
    let mode = 'daily';
    try {
      const body = await req.clone().json();
      if (body && body.mode === 'weekly') mode = 'weekly';
    } catch (_) { /* sem body = daily */ }

    const now = new Date();
    const periodoInicio = new Date(now);
    const periodoFim = new Date(now);

    if (mode === 'weekly') {
      periodoInicio.setDate(periodoInicio.getDate() - 7);
      periodoInicio.setHours(0, 0, 0, 0);
      periodoFim.setDate(periodoFim.getDate() - 1);
      periodoFim.setHours(23, 59, 59, 999);
    } else {
      periodoInicio.setDate(periodoInicio.getDate() - 1);
      periodoInicio.setHours(0, 0, 0, 0);
      periodoFim.setDate(periodoFim.getDate() - 1);
      periodoFim.setHours(23, 59, 59, 999);
    }

    // Aliases para manter compatibilidade com o restante do código
    const ontem = periodoInicio;
    const ontemFim = periodoFim;

    const dataLabel = mode === 'weekly'
      ? `${periodoInicio.toLocaleDateString('pt-BR')} a ${periodoFim.toLocaleDateString('pt-BR')}`
      : periodoFim.toLocaleDateString('pt-BR');
    const tipoRelatorio = mode === 'weekly' ? 'SEMANAL' : 'DIÁRIO';

    // Helper: garante que resultado é sempre array
    const ensureArray = (result) => Array.isArray(result) ? result : [];

    // Helper: filtra por data "ontem"
    const isOntem = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= ontem && d <= ontemFim;
    };

    // 1. Pagamentos confirmados (busca limitada, ordena por mais recente)
    const pagamentos = ensureArray(await base44.asServiceRole.entities.AsaasPayment.filter({ status: 'confirmed' }, '-created_date', 500));
    const pagamentosOntem = pagamentos.filter(p => isOntem(p.payment_date || p.created_date));
    const faturamentoTotal = pagamentosOntem.reduce((sum, p) => sum + (p.value || 0), 0);
    const depositosCarteira = pagamentosOntem.filter(p => p.is_wallet_deposit && !p.is_investor_capital);
    const depositosInvestidor = pagamentosOntem.filter(p => p.is_investor_capital);
    const pagamentosArremate = pagamentosOntem.filter(p => p.auction_id && !p.is_wallet_deposit);

    // 2. Vendas do catálogo ontem
    const vendasCatalogo = ensureArray(await base44.asServiceRole.entities.CatalogSale.filter({ status: 'paid' }, '-created_date', 500));
    const vendasOntem = vendasCatalogo.filter(v => isOntem(v.payment_confirmed_date || v.created_date));
    const faturamentoCatalogo = vendasOntem.reduce((sum, v) => sum + (v.total_amount || 0), 0);

    // 3. Leilões ativos e encerrados ontem
    const leiloesAtivos = ensureArray(await base44.asServiceRole.entities.Auction.filter({ status: 'active' }));
    const leiloesEncerrados = ensureArray(await base44.asServiceRole.entities.Auction.filter({ status: 'ended' }, '-updated_date', 200));
    const leiloesEncerradosOntem = leiloesEncerrados.filter(l => isOntem(l.updated_date || l.end_time));

    // 4. Top produtos arrematados ontem (por valor)
    const topLotes = leiloesEncerradosOntem
      .sort((a, b) => (b.current_price || 0) - (a.current_price || 0))
      .slice(0, 5);

    // 5. Erros críticos ontem (busca limitada e ordenada)
    let errosOntem = [];
    try {
      const errosRaw = await base44.asServiceRole.entities.SystemLog.filter({ status: 'error' }, '-created_date', 200);
      const erros = Array.isArray(errosRaw) ? errosRaw : [];
      errosOntem = erros.filter(e => isOntem(e.created_date));
    } catch (erroErr) {
      console.warn('Falha ao buscar erros do SystemLog:', erroErr.message);
      errosOntem = [];
    }

    // 6. Novos usuários ontem
    const todosUsuarios = ensureArray(await base44.asServiceRole.entities.AppUser.list('-created_date', 200));
    const novosUsuarios = todosUsuarios.filter(u => isOntem(u.created_date));

    // Monta relatório em texto
    const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const topProdutosTexto = topLotes.length > 0
      ? topLotes.map((l, i) => `  ${i + 1}. ${l.title} — ${fmt(l.current_price || 0)} (${l.winner_name || 'sem vencedor'})`).join('\n')
      : '  Nenhum lote encerrado no período.';

    const errosTexto = errosOntem.length > 0
      ? errosOntem.slice(0, 5).map(e => `  • [${e.component_name || 'sistema'}] ${(e.message || '').substring(0, 100)}`).join('\n')
      : '  ✅ Nenhum erro crítico registrado.';

    const relatorio = `
📊 RELATÓRIO ${tipoRelatorio} — ${dataLabel}
═══════════════════════════════════════

💰 FATURAMENTO
  Arremates (PIX/Cartão): ${fmt(pagamentosArremate.reduce((s, p) => s + (p.value || 0), 0))} (${pagamentosArremate.length} pagamentos)
  Depósitos de carteira:  ${fmt(depositosCarteira.reduce((s, p) => s + (p.value || 0), 0))} (${depositosCarteira.length} depósitos)
  Capital investidor:     ${fmt(depositosInvestidor.reduce((s, p) => s + (p.value || 0), 0))} (${depositosInvestidor.length} depósitos)
  Catálogo:               ${fmt(faturamentoCatalogo)} (${vendasOntem.length} vendas)
  ───────────────────────
  TOTAL GERAL:            ${fmt(faturamentoTotal + faturamentoCatalogo)}

🏷️ LEILÕES
  Ativos agora:     ${leiloesAtivos.length}
  Encerrados no período: ${leiloesEncerradosOntem.length}

🥇 TOP LOTES DO PERÍODO
${topProdutosTexto}

👥 NOVOS USUÁRIOS
  Cadastros no período: ${novosUsuarios.length}

⚠️ ERROS CRÍTICOS (${errosOntem.length} total)
${errosTexto}

─────────────────────────────────────
Gerado automaticamente em ${now.toLocaleString('pt-BR')}
    `.trim();

    // Envia via Brevo email
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (BREVO_API_KEY) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Sentinel NoZap', email: 'noreply@leilaonozap.net' },
          to: [{ email: 'luizsantanna@tttcorporate.com', name: 'Luiz' }],
          subject: `📊 Relatório ${tipoRelatorio} NoZap — ${dataLabel}`,
          textContent: relatorio
        })
      });
    }

    // Salva log do relatório
    await base44.asServiceRole.entities.SystemLog.create({
      step: mode === 'weekly' ? 'WEEKLY_REPORT_GENERATED' : 'DAILY_REPORT_GENERATED',
      status: 'success',
      component_name: 'dailyReport',
      message: `Relatório ${tipoRelatorio.toLowerCase()} gerado para ${dataLabel}. Faturamento: ${fmt(faturamentoTotal + faturamentoCatalogo)}. Erros: ${errosOntem.length}. Novos usuários: ${novosUsuarios.length}.`,
      payload: {
        data: dataLabel,
        faturamento_total: faturamentoTotal + faturamentoCatalogo,
        pagamentos_count: pagamentosOntem.length,
        vendas_catalogo: vendasOntem.length,
        leiloes_encerrados: leiloesEncerradosOntem.length,
        erros_criticos: errosOntem.length,
        novos_usuarios: novosUsuarios.length
      }
    });

    return Response.json({
      status: 'success',
      data: dataLabel,
      faturamento_total: faturamentoTotal + faturamentoCatalogo,
      pagamentos: pagamentosOntem.length,
      erros: errosOntem.length,
      novos_usuarios: novosUsuarios.length
    });

  } catch (error) {
    console.error('Erro no dailyReport:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});