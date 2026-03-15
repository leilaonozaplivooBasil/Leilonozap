import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * allocateInvestorCapital
 * 
 * Move capital do saldo_disponivel → saldo_alocado quando investidor
 * confirma autorização de lance em um lote.
 * 
 * É idempotente: verifica se já foi alocado para este lote antes de processar.
 * Chamado automaticamente após persistBidAuthorization.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { authorization_id } = await req.json();

    if (!authorization_id) {
      return Response.json({ error: 'authorization_id obrigatório' }, { status: 400 });
    }

    // 1. Buscar autorização
    let auth;
    try {
      const auths = await base44.asServiceRole.entities.LanceAutorizado.filter({ id: authorization_id }, null, 1);
      if (!auths || auths.length === 0) {
        return Response.json({ error: 'Autorização não encontrada' }, { status: 404 });
      }
      auth = auths[0];
    } catch (e) {
      return Response.json({ error: 'Autorização não encontrada' }, { status: 404 });
    }

    // Somente processa autorizações confirmadas
    if (auth.status_autorizacao !== 'confirmada') {
      return Response.json({ error: 'Autorização não está confirmada', status_atual: auth.status_autorizacao }, { status: 400 });
    }

    const investidorId = auth.investidor_id;
    const depositoTotal = auth.deposito_confirmado || 0;

    if (depositoTotal <= 0) {
      return Response.json({ error: 'Valor de depósito inválido ou zero' }, { status: 400 });
    }

    // 2. Idempotência: verificar se já foi alocado
    const existingLogs = await base44.asServiceRole.entities.SystemLog.filter({
      entity_id: authorization_id,
      step: 'INVESTOR_CAPITAL_ALLOCATED'
    }, null, 1);

    if (existingLogs && existingLogs.length > 0) {
      return Response.json({
        status: 'already_processed',
        message: 'Capital já foi alocado para esta autorização',
        authorization_id
      });
    }

    // 3. Buscar investidor
    let investidor;
    try {
      const investidores = await base44.asServiceRole.entities.AppUser.filter({ id: investidorId }, null, 1);
      if (!investidores || investidores.length === 0) {
        return Response.json({ error: 'Investidor não encontrado' }, { status: 404 });
      }
      investidor = investidores[0];
    } catch (e) {
      return Response.json({ error: 'Investidor não encontrado' }, { status: 404 });
    }

    const saldoDisponivel = investidor.saldo_disponivel || 0;
    const saldoAlocado = investidor.saldo_alocado || 0;

    // 4. Verificar saldo suficiente
    if (saldoDisponivel < depositoTotal) {
      return Response.json({
        error: 'Saldo insuficiente para alocação',
        saldo_disponivel: saldoDisponivel,
        valor_necessario: depositoTotal
      }, { status: 400 });
    }

    // 5. Mover saldo disponivel → alocado
    await base44.asServiceRole.entities.AppUser.update(investidor.id, {
      saldo_disponivel: parseFloat((saldoDisponivel - depositoTotal).toFixed(2)),
      saldo_alocado: parseFloat((saldoAlocado + depositoTotal).toFixed(2))
    });

    // 6. Registrar transação de alocação
    await base44.asServiceRole.entities.WalletTransaction.create({
      user_id: investidor.id,
      type: 'adjustment',
      direction: 'debit',
      amount: depositoTotal,
      status: 'confirmed',
      related_auction_id: auth.auction_id,
      description: `Capital alocado — Lote: ${auth.auction_title || auth.auction_id}`
    });

    // 7. Log de auditoria
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'INVESTOR_CAPITAL_ALLOCATED',
      status: 'success',
      entity_id: authorization_id,
      component_name: 'allocateInvestorCapital',
      message: `R$ ${depositoTotal.toFixed(2)} alocados para ${investidor.full_name} — Lote: ${auth.auction_title || auth.auction_id}`,
      payload: {
        authorization_id,
        investidor_id: investidor.id,
        investidor_nome: investidor.full_name,
        auction_id: auth.auction_id,
        valor_alocado: depositoTotal,
        saldo_disponivel_antes: saldoDisponivel,
        saldo_alocado_antes: saldoAlocado,
        allocated_at: new Date().toISOString()
      }
    });

    return Response.json({
      status: 'success',
      investidor_nome: investidor.full_name,
      valor_alocado: depositoTotal,
      saldo_disponivel_novo: parseFloat((saldoDisponivel - depositoTotal).toFixed(2)),
      saldo_alocado_novo: parseFloat((saldoAlocado + depositoTotal).toFixed(2))
    });

  } catch (error) {
    console.error('Erro em allocateInvestorCapital:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});