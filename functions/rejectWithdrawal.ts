import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { withdrawal_id, reason } = await req.json();

    if (!withdrawal_id || !reason) {
      return Response.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
    }

    // Busca solicitação
    const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.filter({ id: withdrawal_id });
    if (!withdrawals || withdrawals.length === 0) {
      return Response.json({ error: 'Saque não encontrado' }, { status: 404 });
    }

    const withdrawal = withdrawals[0];

    if (withdrawal.status !== 'pending') {
      return Response.json({ error: 'Saque já processado' }, { status: 400 });
    }

    // Estorna saldo
    const influencers = await base44.asServiceRole.entities.AppUser.filter({ id: withdrawal.influencer_id });
    if (influencers && influencers.length > 0) {
      const influencer = influencers[0];
      await base44.asServiceRole.entities.AppUser.update(withdrawal.influencer_id, {
        commission_balance: influencer.commission_balance + withdrawal.amount
      });
    }

    // Atualiza status
    await base44.asServiceRole.entities.WithdrawalRequest.update(withdrawal_id, {
      status: 'rejected',
      processed_by: user.id,
      processed_date: new Date().toISOString(),
      notes: `Rejeitado: ${reason}`
    });

    // Log
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'WITHDRAWAL_REJECTED',
      status: 'warning',
      message: `Saque de R$ ${withdrawal.amount} rejeitado - saldo estornado`,
      component_name: 'rejectWithdrawal',
      entity_id: withdrawal_id,
      payload: { admin_id: user.id, reason }
    }).catch(() => {});

    return Response.json({ success: true });

  } catch (error) {
    console.error('❌ Erro ao rejeitar saque:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});