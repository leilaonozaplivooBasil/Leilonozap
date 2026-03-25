import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function sendEmailViaBrevo(to, subject, htmlContent) {
  const apiKey = Deno.env.get('BREVO_API_KEY');
  if (!apiKey) throw new Error('BREVO_API_KEY não configurada');

  console.log(`📧 [Brevo] Enviando para: ${to} | Assunto: ${subject}`);

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      sender: { name: 'Leilão no Zap', email: 'no-reply@leilaonozap.com' },
      to: [{ email: to }],
      subject,
      htmlContent
    })
  });

  const data = await response.json();
  console.log(`📧 [Brevo] Status: ${response.status}`, JSON.stringify(data));
  if (!response.ok) throw new Error(`Brevo error: ${response.status} - ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  try {
    // Lê o body antes de qualquer outra operação
    const body = await req.json();
    const { email, fullName, resetLink, role } = body;
    
    console.log('📨 sendWelcomeArrematante chamado:', { email, fullName, role });

    if (!email || !fullName || !resetLink) {
      return Response.json({ error: 'email, fullName e resetLink são obrigatórios' }, { status: 400 });
    }

    const firstName = fullName.trim().split(' ')[0];

    // Determina o rótulo e a cor com base no role recebido
    const roleConfig = {
      investidor: { label: 'Investidor', color: '#34d399', colorBg: 'rgba(52,211,153,0.1)', gradient: 'linear-gradient(135deg,#059669 0%,#047857 100%)' },
      leiloeiro:  { label: 'Arrematante / Leiloeiro', color: '#a78bfa', colorBg: 'rgba(124,58,237,0.1)', gradient: 'linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%)' },
    };
    const cfg = roleConfig[role] || roleConfig.leiloeiro;

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background-color:#1a1a2e;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background:linear-gradient(135deg,#1f2937 0%,#111827 100%);border-radius:20px;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <tr>
          <td style="background:${cfg.gradient};padding:40px 40px 30px;text-align:center;">
            <div style="font-size:42px;margin-bottom:10px;">🔨</div>
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">Leilão NoZap</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Sistema de Investimento em Lotes</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 20px;color:#fff;font-size:24px;">Bem-vindo, ${firstName}! 🎉</h2>
            <p style="margin:0 0 20px;color:#9ca3af;font-size:16px;line-height:1.6;">
              Sua conta de <strong style="color:${cfg.color};">${cfg.label}</strong> foi criada com sucesso no sistema de lotes do Leilão NoZap.
            </p>
            <p style="margin:0 0 30px;color:#9ca3af;font-size:16px;line-height:1.6;">
              Para acessar o sistema, você precisa definir sua senha clicando no botão abaixo:
            </p>
            <table role="presentation" style="width:100%;border-collapse:collapse;">
              <tr>
                <td align="center" style="padding:10px 0 30px;">
                  <a href="${resetLink}" style="display:inline-block;background:${cfg.gradient};color:#fff;text-decoration:none;padding:18px 50px;font-size:18px;font-weight:700;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);">
                    🔐 Definir Minha Senha
                  </a>
                </td>
              </tr>
            </table>
            <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:20px;margin-bottom:25px;">
              <p style="margin:0;color:#fbbf24;font-size:14px;">⏰ <strong>Atenção:</strong> Este link expira em <strong>7 dias</strong>.</p>
            </div>
            <p style="margin:0 0 10px;color:#6b7280;font-size:13px;">Se o botão não funcionar, copie e cole este link:</p>
            <p style="margin:0 0 25px;color:${cfg.color};font-size:12px;word-break:break-all;background:${cfg.colorBg};padding:12px;border-radius:8px;">${resetLink}</p>
            <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:20px;">
              <p style="margin:0;color:#f87171;font-size:14px;">🛡️ <strong>Não esperava este e-mail?</strong> Entre em contato com o administrador do sistema.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:rgba(0,0,0,0.3);padding:30px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);">
            <p style="margin:0 0 10px;color:#6b7280;font-size:13px;">© ${new Date().getFullYear()} Leilão NoZap. Todos os direitos reservados.</p>
            <p style="margin:0;color:#4b5563;font-size:12px;">Este é um e-mail automático. Por favor, não responda.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await sendEmailViaBrevo(email, '🎉 Bem-vindo ao Leilão NoZap — Defina sua senha', html);
    console.log(`✅ E-mail de boas-vindas enviado para ${email}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Erro sendWelcomeArrematante:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});