import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { compare, hash } from 'npm:bcryptjs@2.4.3';

/**
 * userAuth – Autenticação segura de usuários com bcrypt
 * 
 * - Busca o usuário pelo email no backend (nunca expõe credenciais)
 * - Suporta senhas hasheadas (bcrypt) E texto puro (auto-migração)
 * - Trata duplicatas: mantém o mais recente, remove os antigos
 * - Retorna dados do usuário SEM a senha
 */
Deno.serve(async (req) => {
    if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const base44 = createClientFromRequest(req);
        const { email, password } = await req.json();

        if (!email || !password) {
            return Response.json({
                success: false,
                error: 'Email e senha são obrigatórios'
            }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Buscar usuário pelo email no backend (nunca expõe todos)
        const users = await base44.asServiceRole.entities.AppUser.filter(
            { email: normalizedEmail }
        );

        if (!users || users.length === 0) {
            console.log('❌ Login: email não encontrado:', normalizedEmail);
            return Response.json({
                success: false,
                error: 'E-mail ou senha incorretos'
            }, { status: 401 });
        }

        // Tratamento de duplicatas (mantém o mais recente)
        let user;
        if (users.length > 1) {
            console.warn(`⚠️ ${users.length} duplicatas para: ${normalizedEmail}`);
            users.sort((a: any, b: any) =>
                new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
            );
            user = users[0];

            // Remove duplicatas em background
            for (let i = 1; i < users.length; i++) {
                try {
                    await base44.asServiceRole.entities.AppUser.delete(users[i].id);
                    console.log(`🗑️ Duplicata removida: ${users[i].id}`);
                } catch (e) {
                    console.warn('Erro ao remover duplicata:', e);
                }
            }
        } else {
            user = users[0];
        }

        // Validar senha
        const storedPassword = user.password;
        const isBcryptHash = storedPassword && storedPassword.startsWith('$2');
        let passwordValid = false;

        if (isBcryptHash) {
            passwordValid = await compare(password, storedPassword);
            console.log('🔒 Validação bcrypt para:', user.full_name);
        } else {
            // Texto puro (legado) — comparar diretamente
            passwordValid = (storedPassword === password);

            if (passwordValid) {
                // Auto-migração para bcrypt
                try {
                    const hashedPassword = await hash(password, 10);
                    await base44.asServiceRole.entities.AppUser.update(user.id, {
                        password: hashedPassword
                    });
                    console.log('🔄 AUTO-MIGRAÇÃO: Senha de', user.full_name, 'migrada para bcrypt');
                } catch (migrationErr) {
                    console.warn('⚠️ Erro na auto-migração:', migrationErr);
                }
            }
        }

        if (!passwordValid) {
            console.log('❌ Senha incorreta para:', user.full_name);
            return Response.json({
                success: false,
                error: 'E-mail ou senha incorretos'
            }, { status: 401 });
        }

        // ✅ Login bem-sucedido - retornar dados SEM a senha
        const { password: _pwd, ...safeUserData } = user;

        console.log('✅ Login bem-sucedido:', user.full_name, '| Role:', user.role);

        return Response.json({
            success: true,
            user: safeUserData
        });

    } catch (error) {
        console.error('❌ Erro em userAuth:', error);
        return Response.json({
            success: false,
            error: 'Erro interno ao autenticar'
        }, { status: 500 });
    }
});
