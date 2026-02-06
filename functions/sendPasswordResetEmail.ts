import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const APP_URL = 'https://leilaonozap.base44apps.com';

// Last deploy check: 2026-02-06 - API REST BREVO

// Template HTML do email com código
function getCodeEmailTemplate(userName: string, code: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação</title>
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
                Código de Verificação
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
                Você solicitou a recuperação de senha da sua conta. 
                Use o código abaixo para verificar sua identidade:
              </p>
              
              <!-- Código de Verificação -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0 30px;">
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); display: inline-block; padding: 20px 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);">
                      <span style="color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Aviso de Expiração -->
              <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <p style="margin: 0; color: #fbbf24; font-size: 14px;">
                  ⏰ <strong>Atenção:</strong> Este código expira em <strong>10 minutos</strong>.
                </p>
              </div>
              
              <!-- Instruções -->
              <p style="margin: 0 0 25px; color: #6b7280; font-size: 14px;">
                Digite este código no campo de verificação para continuar o processo de recuperação de senha.
              </p>
              
              <!-- Aviso de Segurança -->
              <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 20px;">
                <p style="margin: 0; color: #f87171; font-size: 14px;">
                  🛡️ <strong>Não foi você?</strong> Ignore este email. Sua senha permanecerá a mesma.
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

// Template HTML do email com link de reset
function getLinkEmailTemplate(userName: string, resetLink: string): string {
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
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; font-size: 18px; font-weight: 700; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);">
                      🔐 Redefinir Minha Senha
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Aviso de Expiração -->
              <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <p style="margin: 0; color: #fbbf24; font-size: 14px;">
                  ⏰ <strong>Atenção:</strong> Este link expira em <strong>15 minutos</strong>.
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
                  🛡️ <strong>Não foi você?</strong> Ignore este email. Sua senha permanecerá a mesma.
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

// Enviar email via SMTP Brevo
async function sendEmailViaSMTP(to: string, subject: string, htmlContent: string): Promise<boolean> {
  let client: SMTPClient | null = null;
  
  try {
    console.log('📧 [SMTP] Configurando cliente SMTP...');
    console.log('📧 [SMTP] Destinatário:', to);
    console.log('📝 [SMTP] Assunto:', subject);

    client = new SMTPClient({
      connection: {
        hostname: SMTP_CONFIG.host,
        port: SMTP_CONFIG.port,
        tls: true,
        auth: {
          username: SMTP_CONFIG.username,
          password: SMTP_CONFIG.password,
        },
      },
    });

    console.log('🔌 [SMTP] Conectando ao servidor SMTP...');
    
    const sendResult = await client.send({
      from: "Leilão no Zap <no-reply@leilaonozap.com>",
      to: to,
      subject: subject,
      content: "auto",
      html: htmlContent,
    });

    console.log('📬 [SMTP] Resultado do envio:', sendResult);
    console.log('✅ [SMTP] Email enviado com sucesso para:', to);
    
    return true;
  } catch (error) {
    console.error('❌ [SMTP] Erro ao enviar email:', error);
    if (error instanceof Error) {
      console.error('   [SMTP] Mensagem:', error.message);
      console.error('   [SMTP] Stack:', error.stack);
    }
    throw error; // Propaga o erro para o handler principal
  } finally {
    if (client) {
      try {
        await client.close();
        console.log('🔌 [SMTP] Conexão fechada');
      } catch (closeError) {
        console.warn('⚠️ [SMTP] Erro ao fechar conexão:', closeError);
      }
    }
  }
}

Deno.serve(async (req: Request) => {
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
    console.log('📧 [sendPasswordResetEmail] Iniciando função...');

    // Clonar request para garantir que o body não seja consumido
    const reqClone = req.clone();
    const base44 = createClientFromRequest(req);
    const payload = await reqClone.json();

    console.log('📦 Payload recebido:', JSON.stringify(payload));

    const { email, code, userName } = payload;

    if (!email) {
      console.error('❌ Email não fornecido. Payload:', payload);
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('✉️ Email normalizado:', normalizedEmail);

    // Se recebeu um código, envia email com código de verificação
    if (code) {
      console.log('🔑 Enviando código de verificação...');
      const name = userName || 'Usuário';
      const emailHtml = getCodeEmailTemplate(name, code);

      console.log('📨 Enviando via SMTP...');
      
      try {
        await sendEmailViaSMTP(
          normalizedEmail,
          '🔐 Código de Verificação - Leilão no Zap',
          emailHtml
        );

        console.log(`✅ Código de verificação enviado para ${normalizedEmail}`);
        return Response.json({ success: true, message: 'Código enviado com sucesso.' });
      } catch (smtpError) {
        console.error('❌ Erro ao enviar via SMTP:', smtpError);
        return Response.json({
          error: 'Não foi possível enviar o email. Tente novamente.',
          details: smtpError instanceof Error ? smtpError.message : 'Erro desconhecido'
        }, { status: 500 });
      }
    }

    // Fluxo alternativo: enviar link de reset (usado pelas páginas ForgotPassword/ResetPassword)
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
    const name = user.full_name?.split(' ')[0] || 'Usuário';

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
    const emailHtml = getLinkEmailTemplate(name, resetLink);
    
    try {
      await sendEmailViaSMTP(
        normalizedEmail,
        '🔐 Recuperação de Senha - Leilão no Zap',
        emailHtml
      );
    } catch (smtpError) {
      console.error('❌ Falha ao enviar email de recuperação:', smtpError);
      return Response.json({
        error: 'Não foi possível enviar o email. Tente novamente.',
        details: smtpError instanceof Error ? smtpError.message : 'Erro desconhecido'
      }, { status: 500 });
    }

    console.log(`✅ Email de recuperação enviado para ${normalizedEmail}`);

    return Response.json({
      success: true,
      message: 'Se o email estiver cadastrado, você receberá um link de recuperação.'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ ERRO CRÍTICO em sendPasswordResetEmail:', errorMessage);
    if (error instanceof Error) {
      console.error('   Stack trace:', error.stack);
    }
    return Response.json({
      error: 'Erro ao processar solicitação: ' + errorMessage,
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
});