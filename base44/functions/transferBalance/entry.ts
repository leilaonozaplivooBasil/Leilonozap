// 🔄 Transferência de saldo (comissão) entre contas — mesmo padrão de
// requestWithdrawal.ts: usa base44.asServiceRole.entities.AppUser, que é a
// via já validada em produção para tocar commission_balance.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { receiver_id, amount, note } = body;

    if (!receiver_id) {
      return Response.json({ error: 'Destinatário obrigatório' }, { status: 400 });
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      return Response.json({ error: 'Valor inválido' }, { status: 400 });
    }

    // Busca remetente atualizado pelo email (mesmo padrão do requestWithdrawal)
    const senders = await base44.asServiceRole.entities.AppUser.filter({ email: user.email });
    if (!senders || senders.length === 0) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    const sender = senders[0];

    if (sender.id === receiver_id) {
      return Response.json({ error: 'Não é possível transferir para você mesmo' }, { status: 400 });
    }

    const senderBalance = sender.commission_balance || 0;
    if (senderBalance < amount) {
      return Response.json({ error: 'Saldo insuficiente', balance: senderBalance }, { status: 400 });
    }

    const receivers = await base44.asServiceRole.entities.AppUser.filter({ id: receiver_id });
    if (!receivers || receivers.length === 0) {
      return Response.json({ error: 'Destinatário não encontrado' }, { status: 404 });
    }
    const receiver = receivers[0];

    // 1) Debita do remetente primeiro (bloqueia o valor)
    await base44.asServiceRole.entities.AppUser.update(sender.id, {
      commission_balance: senderBalance - amount
    });

    // 2) Credita no destinatário — se falhar, devolve ao remetente
    try {
      await base44.asServiceRole.entities.AppUser.update(receiver.id, {
        commission_balance: (receiver.commission_balance || 0) + amount
      });
    } catch (creditError) {
      // Rollback do débito
      await base44.asServiceRole.entities.AppUser.update(sender.id, {
        commission_balance: senderBalance
      }).catch(() => {});

      await base44.asServiceRole.entities.BalanceTransfer.create({
        sender_id: sender.id,
        sender_name: sender.full_name,
        receiver_id: receiver.id,
        receiver_name: receiver.full_name,
        amount,
        note: note || '',
        status: 'failed'
      }).catch(() => {});

      return Response.json({ error: 'Falha ao creditar destinatário, valor devolvido' }, { status: 500 });
    }

    const transfer = await base44.asServiceRole.entities.BalanceTransfer.create({
      sender_id: sender.id,
      sender_name: sender.full_name,
      receiver_id: receiver.id,
      receiver_name: receiver.full_name,
      amount,
      note: note || '',
      status: 'completed'
    });

    await base44.asServiceRole.entities.SystemLog.create({
      step: 'BALANCE_TRANSFER',
      status: 'success',
      message: `${sender.full_name} transferiu R$ ${amount} para ${receiver.full_name}`,
      component_name: 'transferBalance',
      entity_id: transfer.id,
      payload: { sender_id: sender.id, receiver_id: receiver.id, amount }
    }).catch(() => {});

    return Response.json({
      success: true,
      new_balance: senderBalance - amount,
      transfer
    });

  } catch (error) {
    console.error('Erro transferBalance:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});