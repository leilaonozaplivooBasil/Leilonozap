import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log('🔵 requestWithdrawal - Início');
  
  try {
    const base44 = createClientFromRequest(req);
    console.log('✅ Base44 client criado');
    
    const user = await base44.auth.me();
    console.log('✅ Usuário autenticado:', user?.id);

    if (!user) {
      console.log('❌ Usuário não autenticado');
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    console.log('📦 Body recebido:', body);
    
    const { amount, pix_key, pix_key_type } = body;

    // Validações
    if (!amount || amount <= 0) {
      console.log('❌ Valor inválido:', amount);
      return Response.json({ error: 'Valor inválido' }, { status: 400 });
    }

    if (amount < 30) {
      console.log('❌ Valor abaixo do mínimo:', amount);
      return Response.json({ error: 'Saque mínimo é de R$ 30,00' }, { status: 400 });
    }

    if (!pix_key || !pix_key_type) {
      console.log('❌ Dados PIX faltando');
      return Response.json({ error: 'Dados PIX obrigatórios' }, { status: 400 });
    }

    // Busca usuário atualizado
    console.log('🔍 Buscando dados do usuário...');
    const users = await base44.asServiceRole.entities.AppUser.filter({ id: user.id });
    
    if (!users || users.length === 0) {
      console.log('❌ Usuário não encontrado:', user.id);
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const currentUser = users[0];
    console.log('✅ Usuário encontrado. Saldo:', currentUser.commission_balance);

    // Verifica saldo
    if ((currentUser.commission_balance || 0) < amount) {
      console.log('❌ Saldo insuficiente. Saldo:', currentUser.commission_balance, 'Solicitado:', amount);
      return Response.json({ 
        error: 'Saldo insuficiente', 
        balance: currentUser.commission_balance || 0 
      }, { status: 400 });
    }

    // Cria solicitação
    console.log('📝 Criando solicitação de saque...');
    const withdrawal = await base44.asServiceRole.entities.WithdrawalRequest.create({
      influencer_id: user.id,
      amount: amount,
      status: 'pending',
      pix_key: pix_key,
      pix_key_type: pix_key_type,
      recipient_name: currentUser.full_name,
      recipient_document: currentUser.cpf || ''
    });
    console.log('✅ Solicitação criada:', withdrawal.id);

    // Deduz do saldo
    console.log('💰 Atualizando saldo...');
    await base44.asServiceRole.entities.AppUser.update(user.id, {
      commission_balance: (currentUser.commission_balance || 0) - amount
    });
    console.log('✅ Saldo atualizado');

    // Log
    await base44.asServiceRole.entities.SystemLog.create({
      step: 'WITHDRAWAL_REQUESTED',
      status: 'success',
      message: `Saque de R$ ${amount} solicitado com sucesso`,
      component_name: 'requestWithdrawal',
      entity_id: withdrawal.id,
      payload: { influencer_id: user.id, amount, pix_key_type }
    }).catch(err => console.log('⚠️ Erro ao criar log:', err));

    console.log('✅ Processo completo');
    return Response.json({ 
      success: true, 
      withdrawal,
      message: 'Saque solicitado com sucesso! Aguarde aprovação.'
    });

  } catch (error) {
    console.error('❌ Erro fatal ao solicitar saque:', error);
    
    // Tenta criar log de erro
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        step: 'WITHDRAWAL_ERROR',
        status: 'error',
        message: error.message,
        component_name: 'requestWithdrawal',
        payload: { error: error.stack }
      }).catch(() => {});
    } catch {}
    
    return Response.json({ 
      success: false,
      error: error.message || 'Erro ao processar saque'
    }, { status: 500 });
  }
});