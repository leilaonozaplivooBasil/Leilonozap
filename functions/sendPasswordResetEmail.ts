import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Configuração Brevo SMTP
const BREVO_CONFIG = {
    host: 'smtp-relay.brevo.com',
    port: 587,
    user: 'a1928b001@smtp-brevo.com',
    pass: 'xsmtpsib-2dac89dc7b6c36da8498ca124e41003dfc53f32413c193b74ec22f3183ece960-JYNspueaUHRtbvGV'
};

const APP_URL = 'https://leilaonozap.base44apps.com';

// Template HTML do email
function getEmailTemplate(userName: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1a2e;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #1f2937 0%, #111827 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          
          <!-- Header com Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="font-size: 42px; margin-bottom: 10px;">🔨</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Leilão no Zap
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                Recuperação de Senha
              </p>
            </td>
          </tr>
          
          <!-- Conteúdo Principal -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">
                Olá, ${userName}! 👋
              </h2>
              
              <p style="margin: 0 0 25px; color: #9ca3af; font-size: 16px; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta. 
                Clique no botão abaixo para criar uma nova senha:
              </p>
              
              <!-- Botão CTA -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${resetLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; font-size: 18px; font-weight: 700; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4); transition: all 0.3s ease;">
                      🔐 Redefinir Minha Senha
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Aviso de Expiração -->
              <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <p style="margin: 0; color: #fbbf24; font-size: 14px; display: flex; align-items: center;">
                  <span style="margin-right: 10px; font-size: 18px;">⏰</span>
                  <strong>Atenção:</strong>&nbsp;Este link expira em <strong>15 minutos</strong>.
                </p>
              </div>
              
              <!-- Link alternativo -->
              <p style="margin: 0 0 15px; color: #6b7280; font-size: 13px;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="margin: 0 0 25px; color: #10b981; font-size: 12px; word-break: break-all; background: rgba(16, 185, 129, 0.1); padding: 12px; border-radius: 8px;">
                ${resetLink}
              </p>
              
              <!-- Aviso de Segurança -->
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 20px;">
                <p style="margin: 0; color: #f87171; font-size: 14px;">
                  <span style="margin-right: 8px;">🛡️</span>
                  <strong>Não foi você?</strong> Ignore este email. Sua senha permanecerá a mesma.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.3); padding: 30px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px;">
                © ${new Date().getFullYear()} Leilão no Zap. Todos os direitos reservados.
              </p>
              <p style="margin: 0; color: #4b5563; font-size: 12px;">
                Este é um email automático. Por favor, não responda.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Função para gerar token único
function generateResetToken(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomPart}`;
}

// Enviar email via SMTP usando fetch (Deno)
async function sendEmailViaSMTP(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
        // Usando a API da Brevo diretamente (mais simples que SMTP raw)
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_CONFIG.pass,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: 'Leilão no Zap',
                    email: 'noreply@leilaonozap.com.br'
                },
                to: [{ email: to }],
                subject: subject,
                htmlContent: htmlContent
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Erro Brevo API:', errorData);
            return false;
        }

        console.log('✅ Email enviado com sucesso para:', to);
        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        return false;
    }
}

Deno.serve(async (req) => {
    // CORS headers
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json().catch(() => ({}));

        const { email } = payload;

        if (!email) {
            return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Buscar usuário pelo email
        const users = await base44.asServiceRole.entities.AppUser.filter({ email: normalizedEmail });

        if (!users || users.length === 0) {
            // Por segurança, não revelamos se o email existe ou não
            console.log(`⚠️ Tentativa de reset para email não cadastrado: ${normalizedEmail}`);
            return Response.json({
                success: true,
                message: 'Se o email estiver cadastrado, você receberá um link de recuperação.'
            });
        }

        const user = users[0];
        const userName = user.full_name?.split(' ')[0] || 'Usuário';

        // Gerar token e definir expiração (15 minutos)
        const resetToken = generateResetToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Salvar token no usuário
        await base44.asServiceRole.entities.AppUser.update(user.id, {
            password_reset_token: resetToken,
            password_reset_expires: expiresAt
        });

        // Montar link de reset
        const resetLink = `${APP_URL}/ResetPassword?token=${resetToken}`;

        // Gerar template e enviar email
        const emailHtml = getEmailTemplate(userName, resetLink);
        const emailSent = await sendEmailViaSMTP(
            normalizedEmail,
            '🔐 Recuperação de Senha - Leilão no Zap',
            emailHtml
        );

        if (!emailSent) {
            console.error('❌ Falha ao enviar email de recuperação');
            return Response.json({
                error: 'Não foi possível enviar o email. Tente novamente.'
            }, { status: 500 });
        }

        console.log(`✅ Email de recuperação enviado para ${normalizedEmail}`);

        return Response.json({
            success: true,
            message: 'Se o email estiver cadastrado, você receberá um link de recuperação.'
        });

    } catch (error) {
        console.error('Erro no sendPasswordResetEmail:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
