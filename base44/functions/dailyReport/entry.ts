import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    const now = new Date();
    const ontem = new Date(now);
    ontem.setDate(ontem.getDate() - 1);
    ontem.setHours(0, 0, 0, 0);
    const ontemFim = new Date(ontem);
    ontemFim.setHours(23, 59, 59, 999);

    const dataLabel = ontem.toLocaleDateString('pt-BR');

    // 1. Pagamentos confirmados ontem (ASAAS)
    const pagamentos = await base44.asServiceRole.entities.AsaasPayment.filter({ status: 'confirmed' });
    const pagamentosOntem = pagamentos.filter(p => {
      const d = new Date(p.payment_date || p.created_date);
      return d >= ontem && d <= ontemFim;
    });
    const faturamentoTotal = pagamentosOntem.reduce((sum, p) => sum + (p.value || 0), 0);
    const depositosCarteira = pagamentosOntem.filter(p => p.is_wallet_deposit && !p.is_investor_capital);
    const depositosInvestidor = pagamentosOntem.filter(p => p.is_investor_capital);
    const pagamentosArremate = pagamentosOntem.filter(p => p.auction_id && !p.is_wallet_deposit);

    // 2. Vendas do catálogo ontem
    const vendasCatalogo = await base44.asServiceRole.entities.CatalogSale.filter({ status: 'paid' });
    const vendasOntem = vendasCatalogo.filter(v => {
      const d = new Date(v.payment_confirmed_date || v.created_date);
      return d >= ontem && d <= ontemFim;
    });
    const faturamentoCatalogo = vendasOntem.reduce((sum, v) => sum + (v.total_amount || 0), 0);

    // 3. Leilões ativos e encerrados ontem
    const leiloesAtivos = await base44.asServiceRole.entities.Auction.filter({ status: 'active' });
    const leiloesEncerrados = await base44.asServiceRole.entities.Auction.filter({ status: 'ended' });
    const leiloesEncerradosOntem = leiloesEncerrados.filter(l => {
      const d = new Date(l.updated_date || l.end_time);
      return d >= ontem && d <= ontemFim;
    });

    // 4. Top produtos arrematados ontem (por valor)
    const topLotes = leiloesEncerradosOntem
      .sort((a, b) => (b.current_price || 0) - (a.current_price || 0))
      .slice(0, 5);

    // 5. Erros críticos ontem
    const erros = await base44.asServiceRole.entities.SystemLog.filter({ status: 'error' });
    const errosOntem = erros.filter(e => {
      const d = new Date(e.created_date);
      return d >= ontem && d <= ontemFim;
    });

    // 6. Novos usuários ontem
    const todosUsuarios = await base44.asServiceRole.entities.AppUser.list('-created_date', 200);
    const novosUsuarios = todosUsuarios.filter(u => {
      const d = new Date(u.created_date);
      return d >= ontem && d <= ontemFim;
    });

    // Monta relatório em texto
    const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const topProdutosTexto = topLotes.length > 0
      ? topLotes.map((l, i) => `  ${i + 1}. ${l.title} — ${fmt(l.current_price || 0)} (${l.winner_name || 'sem vencedor'})`).join('\n')
      : '  Nenhum lote encerrado ontem.';

    const errosTexto = errosOntem.length > 0
      ? errosOntem.slice(0, 5).map(e => `  • [${e.component_name || 'sistema'}] ${e.message?.substring(0, 100)}`).join('\n')
      : '  ✅ Nenhum erro crítico registrado.';

    const relatorio = `
📊 RELATÓRIO DIÁRIO — ${dataLabel}
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
  Encerrados ontem: ${leiloesEncerradosOntem.length}

🥇 TOP LOTES ONTEM
${topProdutosTexto}

👥 NOVOS USUÁRIOS
  Cadastros ontem: ${novosUsuarios.length}

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
          subject: `📊 Relatório Diário NoZap — ${dataLabel}`,
          textContent: relatorio
        })
      });
    }

    // Salva log do relatório
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'DAILY_REPORT_GENERATED',
      status: 'success',
      component_name: 'dailyReport',
      message: `Relatório diário gerado para ${dataLabel}. Faturamento: ${fmt(faturamentoTotal + faturamentoCatalogo)}. Erros: ${errosOntem.length}. Novos usuários: ${novosUsuarios.length}.`,
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