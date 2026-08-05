// Teste de envio de e-mail via Brevo — usa o TEMPLATE OFICIAL da marca
// (cabeçalho escuro com a logo 3D, corpo claro, rodapé com contatos reais).
// A chave vive nos segredos do app (a antiga estava fixa aqui e já havia sido revogada).
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') || '';

// Logo 3D oficial (PNG com fundo transparente → vai sobre o cabeçalho escuro)
const LOGO_URL = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/86bd7e4c3_image.png';
const SITE_URL = 'https://leilaonozap.com';
const EMAIL_CONTATO = 'relacionamento@leilaonozap.com';
const WHATSAPP_URL = 'https://wa.me/message/IVTKZKFQY6SBD1';

/**
 * Monta o e-mail no padrão da marca.
 * Tabelas + estilo inline: é o único jeito que Gmail, Outlook e Apple Mail
 * renderizam igual (eles descartam <style>, flex e grid).
 */
function montarEmail({ titulo, subtitulo, corpoHtml, ctaTexto, ctaUrl }: {
  titulo: string;
  subtitulo?: string;
  corpoHtml: string;
  ctaTexto?: string;
  ctaUrl?: string;
}) {
  const cta = ctaTexto && ctaUrl ? `
    <tr>
      <td align="center" style="padding:8px 32px 32px 32px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#1B7A48;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;line-height:20px;padding:16px 36px;border-radius:999px;">${ctaTexto}</a>
      </td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#EDF1EE;">
  <!-- pré-cabeçalho: texto de prévia na lista de e-mails -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${subtitulo || titulo}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EDF1EE;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(13,19,16,0.08);">

          <!-- CABEÇALHO ESCURO COM A LOGO 3D -->
          <tr>
            <td align="center" style="background:#0C1F16;padding:32px 24px 28px 24px;">
              <img src="${LOGO_URL}" alt="Leilão NoZap" width="240" style="display:block;width:240px;max-width:80%;height:auto;border:0;">
            </td>
          </tr>

          <!-- FAIXA VERDE -->
          <tr><td style="height:4px;background:#1B7A48;line-height:4px;font-size:0;">&nbsp;</td></tr>

          <!-- TÍTULO -->
          <tr>
            <td style="padding:36px 32px 0 32px;font-family:Helvetica,Arial,sans-serif;">
              <h1 style="margin:0;font-size:26px;line-height:32px;color:#0D1310;font-weight:bold;">${titulo}</h1>
              ${subtitulo ? `<p style="margin:10px 0 0 0;font-size:15px;line-height:23px;color:#5C6B62;">${subtitulo}</p>` : ''}
            </td>
          </tr>

          <!-- CORPO -->
          <tr>
            <td style="padding:24px 32px 28px 32px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#0D1310;">
              ${corpoHtml}
            </td>
          </tr>

          ${cta}

          <!-- RODAPÉ -->
          <tr>
            <td style="background:#F5F7F6;border-top:1px solid #DDE4DF;padding:26px 32px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:22px;color:#5C6B62;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0D1310;">Leilão NoZap</p>
              <p style="margin:0;">
                <a href="mailto:${EMAIL_CONTATO}" style="color:#1B7A48;text-decoration:none;">${EMAIL_CONTATO}</a><br>
                <a href="${WHATSAPP_URL}" style="color:#1B7A48;text-decoration:none;">Falar no WhatsApp</a> &nbsp;·&nbsp; (21) 98407-2064<br>
                <a href="${SITE_URL}" style="color:#1B7A48;text-decoration:none;">leilaonozap.com</a>
              </p>
              <p style="margin:16px 0 0 0;font-size:12px;line-height:19px;color:#8A9891;">
                Você recebeu este e-mail porque tem uma conta ou um pedido no Leilão NoZap.
                Para falar com uma pessoa de verdade, basta responder esta mensagem.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
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
    const payload = await req.json().catch(() => ({}));
    const { email } = payload;

    if (!email) {
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    console.log('📧 Enviando e-mail de teste (template oficial) para:', email);

    const htmlContent = montarEmail({
      titulo: 'Teste OK — está tudo funcionando',
      subtitulo: 'Este é o modelo oficial dos e-mails automáticos do Leilão NoZap.',
      corpoHtml: `
        <p style="margin:0 0 16px 0;">Se você está lendo esta mensagem, três coisas foram confirmadas de uma vez:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px 0;">
          <tr><td style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#0D1310;">✅ &nbsp;O disparo automático está ativo</td></tr>
          <tr><td style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#0D1310;">✅ &nbsp;O domínio <strong>leilaonozap.com</strong> está assinando os envios</td></tr>
          <tr><td style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#0D1310;">✅ &nbsp;A resposta chega numa caixa lida por uma pessoa</td></tr>
        </table>
        <p style="margin:0;color:#5C6B62;font-size:15px;line-height:24px;">
          É este mesmo modelo que o cliente recebe ao ter um pedido aguardando pagamento,
          um lembrete de leilão ou uma confirmação de compra.
        </p>`,
      ctaTexto: 'Ver os leilões de hoje',
      ctaUrl: `${SITE_URL}/leiloes`
    });

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Leilão NoZap', email: 'no-reply@leilaonozap.com' },
        to: [{ email }],
        // Resposta do destinatário cai na caixa real de atendimento
        replyTo: { email: EMAIL_CONTATO, name: 'Leilão NoZap' },
        subject: 'Teste OK — Leilão NoZap',
        htmlContent
      })
    });

    const responseText = await response.text();
    console.log('📬 Status Brevo:', response.status, responseText);

    if (!response.ok) {
      return Response.json({
        success: false,
        error: 'Brevo retornou erro',
        status: response.status,
        details: responseText
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: 'E-mail de teste enviado com o template oficial!',
      brevoResponse: responseText
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});