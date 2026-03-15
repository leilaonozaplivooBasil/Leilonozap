import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * distributeAuctionCommissions
 * 
 * Calcula e distribui comissões após arremate de lote de investimento.
 * 
 * Regra de negócio:
 * - partner_commission_percentual = % que vai ao parceiro (ex: 7%)
 * - platform_commission_percentual = % que fica na plataforma (ex: 3%)
 * - Ambos calculados sobre o valor_arremate (valor final do lote)
 * 
 * Chamado pelo admin após registrar arremate em GestaoLotes.
 * É idempotente: verifica se comissão já foi distribuída antes de processar.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { auction_id } = await req.json();

    if (!auction_id) {
      return Response.json({ error: 'auction_id obrigatório' }, { status: 400 });
    }

    // 1. Buscar o lote
    const auctions = await base44.asServiceRole.entities.Auction.filter({ id: auction_id }, null, 1);
    if (!auctions || auctions.length === 0) {
      return Response.json({ error: 'Lote não encontrado' }, { status: 404 });
    }
    const auction = auctions[0];

    if (auction.status !== 'sold') {
      return Response.json({ error: 'Lote não está com status sold' }, { status: 400 });
    }

    if (!auction.partner_id) {
      return Response.json({ error: 'Lote sem parceiro associado' }, { status: 400 });
    }

    // 2. Idempotência: verificar se já foi distribuído
    const existingLogs = await base44.asServiceRole.entities.SystemLog.filter({
      entity_id: auction_id,
      step: 'AUCTION_COMMISSION_DISTRIBUTED'
    }, null, 1);

    if (existingLogs && existingLogs.length > 0) {
      return Response.json({
        status: 'already_processed',
        message: 'Comissões já foram distribuídas para este lote',
        auction_id
      });
    }

    const valorArremate = auction.current_price || auction.starting_price;
    const partnerPct = auction.partner_commission_percentual || 0;
    const platformPct = auction.platform_commission_percentual || (10 - partnerPct); // fallback: 10% total - % parceiro
    
    const valorParceiro = parseFloat((valorArremate * (partnerPct / 100)).toFixed(2));
    const valorPlataforma = parseFloat((valorArremate * (platformPct / 100)).toFixed(2));

    // 3. Buscar parceiro
    const parceiros = await base44.asServiceRole.entities.AppUser.filter({ id: auction.partner_id }, null, 1);
    if (!parceiros || parceiros.length === 0) {
      return Response.json({ error: 'Parceiro não encontrado' }, { status: 404 });
    }
    const parceiro = parceiros[0];

    // 4. Creditar comissão ao parceiro (commission_balance)
    const novoSaldoParceiro = (parceiro.commission_balance || 0) + valorParceiro;
    const novoTotalParceiro = (parceiro.total_commissions_generated || 0) + valorParceiro;

    await base44.asServiceRole.entities.AppUser.update(parceiro.id, {
      commission_balance: novoSaldoParceiro,
      total_commissions_generated: novoTotalParceiro
    });

    // 5. Registrar WalletTransaction para o parceiro
    await base44.asServiceRole.entities.WalletTransaction.create({
      user_id: parceiro.id,
      type: 'adjustment',
      direction: 'credit',
      amount: valorParceiro,
      status: 'confirmed',
      related_auction_id: auction_id,
      description: `Comissão de arremate (${partnerPct}%) — Lote: ${auction.title}`
    });

    // 6. Log de auditoria financeira
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'AUCTION_COMMISSION_DISTRIBUTED',
      status: 'success',
      entity_id: auction_id,
      component_name: 'distributeAuctionCommissions',
      message: `Comissões distribuídas: parceiro ${parceiro.full_name} recebeu R$ ${valorParceiro.toFixed(2)} (${partnerPct}%). Plataforma: R$ ${valorPlataforma.toFixed(2)} (${platformPct}%).`,
      payload: {
        auction_id,
        auction_title: auction.title,
        valor_arremate: valorArremate,
        partner_id: parceiro.id,
        partner_name: parceiro.full_name,
        partner_pct: partnerPct,
        valor_parceiro: valorParceiro,
        platform_pct: platformPct,
        valor_plataforma: valorPlataforma,
        distributed_at: new Date().toISOString()
      }
    });

    return Response.json({
      status: 'success',
      auction_id,
      auction_title: auction.title,
      valor_arremate: valorArremate,
      partner_name: parceiro.full_name,
      valor_parceiro: valorParceiro,
      partner_pct: partnerPct,
      valor_plataforma: valorPlataforma,
      platform_pct: platformPct
    });

  } catch (error) {
    console.error('Erro em distributeAuctionCommissions:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});