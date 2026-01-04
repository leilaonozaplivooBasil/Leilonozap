import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { amount, pix_key, pix_key_type } = await req.json();

    // Validações
    if (!amount || amount <= 0) {
      return Response.json({ error: 'Valor inválido' }, { status: 400 });
    }

    if (!pix_key || !pix_key_type) {
      return Response.json({ error: 'Dados PIX obrigatórios' }, { status: 400 });
    }

    // Busca usuário atualizado
    const users = await base44.asServiceRole.entities.AppUser.filter({ id: user.id });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const currentUser = users[0];

    // Verifica saldo
    if (currentUser.commission_balance < amount) {
      return Response.json({ error: 'Saldo insuficiente' }, { status: 400 });
    }

    // Cria solicitação
    const withdrawal = await base44.asServiceRole.entities.WithdrawalRequest.create({
      influencer_id: user.id,
      amount: amount,
      status: 'pending',
      pix_key: pix_key,
      pix_key_type: pix_key_type,
      recipient_name: currentUser.full_name,
      recipient_document: currentUser.cpf
    });

    // Deduz do saldo
    await base44.asServiceRole.entities.AppUser.update(user.id, {
      commission_balance: currentUser.commission_balance - amount
    });

    // Log
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'WITHDRAWAL_REQUESTED',
      status: 'info',
      message: `Saque de R$ ${amount} solicitado`,
      component_name: 'requestWithdrawal',
      entity_id: withdrawal.id,
      payload: { influencer_id: user.id, amount, pix_key_type }
    }).catch(() => {});

    return Response.json({ success: true, withdrawal });

  } catch (error) {
    console.error('❌ Erro ao solicitar saque:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});