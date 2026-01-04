import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { withdrawal_id, transaction_id, notes } = await req.json();

    if (!withdrawal_id) {
      return Response.json({ error: 'ID obrigatório' }, { status: 400 });
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

    // Busca usuário para deduzir saldo
    const users = await base44.asServiceRole.entities.AppUser.filter({ id: withdrawal.influencer_id });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const influencer = users[0];

    // Deduz do saldo na aprovação (ambos os saldos)
    await base44.asServiceRole.entities.AppUser.update(withdrawal.influencer_id, {
      commission_balance: (influencer.commission_balance || 0) - withdrawal.amount,
      valora_pay_balance: (influencer.valora_pay_balance || 0) - withdrawal.amount
    });

    // Atualiza status
    await base44.asServiceRole.entities.WithdrawalRequest.update(withdrawal_id, {
      status: 'completed',
      processed_by: user.id,
      processed_date: new Date().toISOString(),
      transaction_id: transaction_id || '',
      notes: notes || ''
    });

    // Log
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'WITHDRAWAL_APPROVED',
      status: 'success',
      message: `Saque de R$ ${withdrawal.amount} aprovado`,
      component_name: 'approveWithdrawal',
      entity_id: withdrawal_id,
      payload: { admin_id: user.id, transaction_id }
    }).catch(() => {});

    return Response.json({ success: true });

  } catch (error) {
    console.error('❌ Erro ao aprovar saque:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});