import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { hash } from 'npm:bcryptjs@2.4.3';

/**
 * hashStorePassword – Hasheia a senha do lojista antes de salvar no banco
 * 
 * Recebe a senha em texto puro e retorna o hash bcrypt.
 * Usado pelo StoreRegistration ao criar ou editar uma loja.
 */
Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const { password } = await req.json();

        if (!password || password.trim().length < 3) {
            return Response.json({
                success: false,
                error: 'Senha deve ter pelo menos 3 caracteres'
            }, { status: 400 });
        }

        // Gerar hash bcrypt com salt de 10 rounds
        const hashedPassword = await hash(password, 10);

        console.log('🔒 Senha hasheada com sucesso (bcrypt)');

        return Response.json({
            success: true,
            hashed_password: hashedPassword
        });

    } catch (error) {
        console.error('❌ Erro ao hashear senha:', error);
        return Response.json({
            success: false,
            error: 'Erro interno ao processar senha'
        }, { status: 500 });
    }
});
