import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { compare, hash } from 'npm:bcryptjs@2.4.3';

/**
 * lojistaAuth – Autenticação segura de lojistas com bcrypt
 * 
 * - Busca a loja pelo login no backend (nunca expõe credenciais)
 * - Suporta senhas hasheadas (bcrypt) E texto puro (auto-migração)
 * - Auto-migração: se a senha estiver em texto puro, valida e hasheia automaticamente
 * - Retorna dados da loja SEM a senha
 */
Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const base44 = createClientFromRequest(req);
        const { login, password } = await req.json();

        if (!login || !password) {
            return Response.json({
                success: false,
                error: 'Login e senha são obrigatórios'
            }, { status: 400 });
        }

        // Buscar a loja SOMENTE pelo login (nunca baixa todas as lojas)
        const stores = await base44.asServiceRole.entities.Store.filter(
            { store_login: login },
            null,
            1
        );

        if (!stores || stores.length === 0) {
            console.log('❌ Tentativa de login: loja não encontrada para login:', login);
            return Response.json({
                success: false,
                error: 'Login ou senha incorretos'
            }, { status: 401 });
        }

        const store = stores[0];
        const storedPassword = store.store_password;

        // Detectar se a senha armazenada é bcrypt hash (começa com $2a$ ou $2b$)
        const isBcryptHash = storedPassword && storedPassword.startsWith('$2');

        let passwordValid = false;

        if (isBcryptHash) {
            // ✅ Senha já está hasheada — comparar com bcrypt
            passwordValid = await compare(password, storedPassword);
            console.log('🔒 Validação bcrypt para loja:', store.store_name);
        } else {
            // ⚠️ Senha em texto puro (legado) — comparar diretamente
            passwordValid = (storedPassword === password);

            if (passwordValid) {
                // 🔄 AUTO-MIGRAÇÃO: hashear a senha e atualizar no banco
                try {
                    const hashedPassword = await hash(password, 10);
                    await base44.asServiceRole.entities.Store.update(store.id, {
                        store_password: hashedPassword
                    });
                    console.log('🔄 AUTO-MIGRAÇÃO: Senha de', store.store_name, 'migrada para bcrypt');
                } catch (migrationErr) {
                    console.warn('⚠️ Erro na auto-migração (não-bloqueante):', migrationErr);
                }
            }
        }

        if (!passwordValid) {
            console.log('❌ Tentativa de login: senha incorreta para loja:', store.store_name);
            return Response.json({
                success: false,
                error: 'Login ou senha incorretos'
            }, { status: 401 });
        }

        // Validar status da loja
        if (store.status !== 'active') {
            console.log('⚠️ Login bloqueado: loja não ativa:', store.store_name, 'status:', store.status);
            return Response.json({
                success: false,
                error: 'Sua loja ainda não foi aprovada pelo administrador'
            }, { status: 403 });
        }

        // ✅ Login bem-sucedido - retornar dados SEM a senha
        const { store_password, ...safeStoreData } = store;

        console.log('✅ Login de lojista bem-sucedido:', store.store_name);

        return Response.json({
            success: true,
            store: safeStoreData
        });

    } catch (error) {
        console.error('❌ Erro em lojistaAuth:', error);
        return Response.json({
            success: false,
            error: 'Erro interno ao autenticar'
        }, { status: 500 });
    }
});
