import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { payment_id } = await req.json();

        if (!payment_id) {
            return Response.json({ error: 'payment_id é obrigatório' }, { status: 400 });
        }

        console.log('🔍 Buscando AsaasPayment:', payment_id);

        // 1️⃣ BUSCAR O ASAASPAYMENT
        const asaasPayments = await base44.asServiceRole.entities.AsaasPayment.filter(
            { payment_id: payment_id },
            null,
            1
        );

        if (!asaasPayments || asaasPayments.length === 0) {
            return Response.json({ error: 'AsaasPayment não encontrado' }, { status: 404 });
        }

        const asaasPayment = asaasPayments[0];
        console.log('✅ AsaasPayment encontrado:', {
            id: asaasPayment.id,
            buyer_name: asaasPayment.buyer_name,
            buyer_email: asaasPayment.buyer_email,
            buyer_cpf: asaasPayment.buyer_cpf,
            is_wallet_deposit: asaasPayment.is_wallet_deposit,
            wallet_deposit_user_id: asaasPayment.wallet_deposit_user_id,
            amount: asaasPayment.value,
            status: asaasPayment.status
        });

        // 2️⃣ VERIFICAR SE É REALMENTE UM DEPÓSITO DE CARTEIRA
        if (!asaasPayment.is_wallet_deposit) {
            return Response.json({ 
                error: 'Este pagamento não é um depósito de carteira',
                payment: asaasPayment
            }, { status: 400 });
        }

        // 3️⃣ TENTAR ENCONTRAR O USUÁRIO (por email, depois cpf, depois nome)
        let user = null;

        // Tentativa 1: por email
        if (asaasPayment.buyer_email) {
            console.log('🔍 Buscando user por email:', asaasPayment.buyer_email);
            const usersByEmail = await base44.asServiceRole.entities.AppUser.filter(
                { email: asaasPayment.buyer_email }
            );
            if (usersByEmail && usersByEmail.length > 0) {
                user = usersByEmail[0];
                console.log('✅ User encontrado por email:', user.id, user.full_name);
            }
        }

        // Tentativa 2: por CPF (se email não funcionou)
        if (!user && asaasPayment.buyer_cpf) {
            console.log('🔍 Buscando user por CPF:', asaasPayment.buyer_cpf);
            const usersByCpf = await base44.asServiceRole.entities.AppUser.filter(
                { cpf: asaasPayment.buyer_cpf }
            );
            if (usersByCpf && usersByCpf.length > 0) {
                user = usersByCpf[0];
                console.log('✅ User encontrado por CPF:', user.id, user.full_name);
            }
        }

        // Tentativa 3: por nome (se CPF também não funcionou)
        if (!user && asaasPayment.buyer_name) {
            console.log('🔍 Buscando user por nome (partial):', asaasPayment.buyer_name);
            const usersByName = await base44.asServiceRole.entities.AppUser.filter(
                { full_name: asaasPayment.buyer_name }
            );
            if (usersByName && usersByName.length > 0) {
                user = usersByName[0];
                console.log('✅ User encontrado por nome:', user.id, user.full_name);
            }
        }

        if (!user) {
            return Response.json({ 
                error: 'Usuário não encontrado com esses dados',
                searched_by: {
                    email: asaasPayment.buyer_email,
                    cpf: asaasPayment.buyer_cpf,
                    name: asaasPayment.buyer_name
                }
            }, { status: 404 });
        }

        // 4️⃣ ATUALIZAR WALLET_DEPOSIT_USER_ID NO ASAASPAYMENT
        console.log('🔄 Atualizando wallet_deposit_user_id...');
        await base44.asServiceRole.entities.AsaasPayment.update(asaasPayment.id, {
            wallet_deposit_user_id: user.id
        });
        console.log('✅ wallet_deposit_user_id atualizado:', user.id);

        // 5️⃣ CREDITAR A CARTEIRA
        console.log('💳 Creditando carteira...');
        const wallets = await base44.asServiceRole.entities.Wallet.filter(
            { user_id: user.id },
            null,
            1
        );

        let wallet;
        if (wallets && wallets.length > 0) {
            wallet = wallets[0];
            const newBalance = (wallet.balance || 0) + asaasPayment.value;
            await base44.asServiceRole.entities.Wallet.update(wallet.id, {
                balance: newBalance
            });
            console.log('✅ Carteira creditada. Novo saldo:', newBalance);
        } else {
            await base44.asServiceRole.entities.Wallet.create({
                user_id: user.id,
                balance: asaasPayment.value
            });
            console.log('✅ Carteira criada com saldo:', asaasPayment.value);
        }

        // 6️⃣ REGISTRAR TRANSAÇÃO
        await base44.asServiceRole.entities.WalletTransaction.create({
            user_id: user.id,
            type: 'deposit',
            direction: 'credit',
            amount: asaasPayment.value,
            status: 'confirmed',
            description: `Reparo de depósito via ${asaasPayment.billing_type} - ${payment_id}`
        });
        console.log('✅ Transação registrada');

        // 7️⃣ LOG DE SUCESSO
        await base44.asServiceRole.entities.SystemLog.create({
            step: 'WALLET_DEPOSIT_REPAIRED',
            status: 'success',
            message: `Depósito de carteira reparado: ${payment_id} → user ${user.id}`,
            component_name: 'repairWalletDeposit',
            entity_id: user.id,
            payload: {
                payment_id: payment_id,
                user_id: user.id,
                amount: asaasPayment.value,
                user_name: user.full_name,
                user_email: user.email
            }
        });

        return Response.json({
            success: true,
            message: 'Depósito de carteira reparado com sucesso',
            details: {
                payment_id: payment_id,
                user_id: user.id,
                user_name: user.full_name,
                user_email: user.email,
                amount: asaasPayment.value,
                new_balance: (wallets && wallets.length > 0) 
                    ? ((wallets[0].balance || 0) + asaasPayment.value)
                    : asaasPayment.value
            }
        });

    } catch (error) {
        console.error('❌ Erro em repairWalletDeposit:', error.message);
        
        try {
            const base44 = createClientFromRequest(req);
            await base44.asServiceRole.entities.SystemLog.create({
                step: 'WALLET_DEPOSIT_REPAIR_ERROR',
                status: 'error',
                message: `Erro ao reparar depósito: ${error.message}`,
                component_name: 'repairWalletDeposit',
                error_details: { message: error.message, stack: error.stack }
            });
        } catch (e) {
            console.debug('Logging falhou');
        }

        return Response.json({ 
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});