// Teste de envio de e-mail via Brevo — usa o TEMPLATE OFICIAL da marca.
// A chave vive nos segredos do app (a antiga estava fixa aqui e já havia sido revogada).
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') || '';

// Logo 3D oficial (PNG com fundo transparente → assenta sobre o cabeçalho escuro)
const LOGO_URL = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/86bd7e4c3_image.png';
// Página principal (a vitrine de abertura) — é para cá que o botão leva
const SITE_URL = 'https://leilaonozap.net';
const EMAIL_CONTATO = 'relacionamento@leilaonozap.com';
const WHATSAPP_URL = 'https://wa.me/message/IVTKZKFQY6SBD1';
const TELEFONE = '(21) 98407-2064';

// Paleta institucional (mesmos tons do site)
const C = {
  verde: '#1B7A48',
  verdeClaro: '#2E9D63',
  escuro: '#0C1F16',
  tinta: '#0D1310',
  tintaFraca: '#5C6B62',
  borda: '#DDE4DF',
  fundo: '#EDF1EE',
  fundoSuave: '#F5F7F6',
  branco: '#FFFFFF'
};

const FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/**
 * Monta o e-mail no padrão da marca.
 *
 * Tabelas + estilo inline: é o único jeito que Gmail, Outlook e Apple Mail
 * renderizam igual (eles descartam <style>, flex e grid).
 */
function montarEmail({ etiqueta, titulo, subtitulo, corpoHtml, ctaTexto, ctaUrl, previa }: {
  etiqueta?: string;
  titulo: string;
  subtitulo?: string;
  corpoHtml: string;
  ctaTexto?: string;
  ctaUrl?: string;
  previa?: string;
}) {
  const selo = etiqueta ? `
              <p style="margin:0 0 14px 0;font-family:${FONTE};font-size:11px;line-height:14px;letter-spacing:1.6px;text-transform:uppercase;color:${C.verde};font-weight:bold;">${etiqueta}</p>` : '';

  const cta = ctaTexto && ctaUrl ? `
          <tr>
            <td align="center" style="padding:4px 32px 12px 32px;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${ctaUrl}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="${C.verde}" stroke="f"><w:anchorlock/><center style="color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;">${ctaTexto}</center></v:roundrect><![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${ctaUrl}" style="display:inline-block;background:${C.verde};color:#ffffff;text-decoration:none;font-family:${FONTE};font-size:16px;font-weight:bold;line-height:20px;padding:17px 40px;border-radius:999px;border:1px solid ${C.verdeClaro};">${ctaTexto} &nbsp;›</a>
              <!--<![endif]-->
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 34px 32px;font-family:${FONTE};font-size:12px;line-height:18px;color:#8A9891;">
              Ou acesse direto: <a href="${ctaUrl}" style="color:${C.tintaFraca};text-decoration:underline;">leilaonozap.net</a>
            </td>
          </tr>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${titulo}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:${C.fundo};-webkit-font-smoothing:antialiased;">
  <!-- pré-cabeçalho: controla o trecho de prévia na lista de e-mails -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${previa || subtitulo || titulo}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.fundo};">
    <tr>
      <td align="center" style="padding:36px 14px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">

          <!-- MARCA ACIMA DO CARTÃO (assinatura discreta, padrão das grandes) -->
          <tr>
            <td align="center" style="padding:0 8px 14px 8px;font-family:${FONTE};font-size:11px;line-height:16px;letter-spacing:1.4px;text-transform:uppercase;color:#93A29A;">
              Leilão NoZap
            </td>
          </tr>

          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.branco};border-radius:18px;overflow:hidden;border:1px solid ${C.borda};">

                <!-- CABEÇALHO ESCURO COM A LOGO 3D -->
                <tr>
                  <td align="center" bgcolor="${C.escuro}" style="background:${C.escuro};padding:38px 24px 34px 24px;">
                    <!-- Se o app do cliente bloquear imagens, o alt aparece em branco e legível -->
                    <a href="${SITE_URL}" style="text-decoration:none;">
                      <img src="${LOGO_URL}" alt="LEILÃO NOZAP" width="228" style="display:block;width:228px;max-width:78%;height:auto;border:0;color:#ffffff;font-family:${FONTE};font-size:22px;font-weight:bold;letter-spacing:1px;">
                    </a>
                  </td>
                </tr>

                <!-- FIO VERDE -->
                <tr><td bgcolor="${C.verde}" style="height:4px;background:${C.verde};line-height:4px;font-size:0;">&nbsp;</td></tr>

                <!-- TÍTULO -->
                <tr>
                  <td style="padding:40px 32px 0 32px;font-family:${FONTE};">
                    ${selo}
                    <h1 style="margin:0;font-size:28px;line-height:35px;color:${C.tinta};font-weight:bold;letter-spacing:-0.4px;">${titulo}</h1>
                    ${subtitulo ? `<p style="margin:12px 0 0 0;font-size:16px;line-height:25px;color:${C.tintaFraca};">${subtitulo}</p>` : ''}
                  </td>
                </tr>

                <!-- CORPO -->
                <tr>
                  <td style="padding:26px 32px 30px 32px;font-family:${FONTE};font-size:16px;line-height:26px;color:${C.tinta};">
                    ${corpoHtml}
                  </td>
                </tr>

                ${cta}

                <!-- RODAPÉ -->
                <tr>
                  <td bgcolor="${C.fundoSuave}" style="background:${C.fundoSuave};border-top:1px solid ${C.borda};padding:30px 32px;font-family:${FONTE};font-size:14px;line-height:23px;color:${C.tintaFraca};">
                    <p style="margin:0 0 12px 0;font-size:15px;font-weight:bold;color:${C.tinta};">Precisa de ajuda?</p>
                    <p style="margin:0 0 4px 0;">
                      <a href="${WHATSAPP_URL}" style="color:${C.verde};text-decoration:none;font-weight:bold;">Falar no WhatsApp</a>
                      &nbsp;·&nbsp; ${TELEFONE}
                    </p>
                    <p style="margin:0;">
                      <a href="mailto:${EMAIL_CONTATO}" style="color:${C.verde};text-decoration:none;">${EMAIL_CONTATO}</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- LETRA MIÚDA FORA DO CARTÃO -->
          <tr>
            <td style="padding:22px 20px 0 20px;font-family:${FONTE};font-size:12px;line-height:20px;color:#93A29A;text-align:center;">
              Você recebeu este e-mail porque tem uma conta ou um pedido no Leilão NoZap.<br>
              Para falar com uma pessoa de verdade, basta responder esta mensagem.
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px 0 20px;font-family:${FONTE};font-size:12px;line-height:20px;color:#A9B5AE;text-align:center;">
              <a href="${SITE_URL}" style="color:#93A29A;text-decoration:none;">leilaonozap.net</a>
              &nbsp;·&nbsp; Rio de Janeiro, RJ &nbsp;·&nbsp; © ${new Date().getFullYear()} Leilão NoZap
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Item de confirmação com selo verde redondo (em vez de emoji solto) */
function itemCheck(texto: string) {
  return `
        <tr>
          <td valign="top" width="30" style="padding:9px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="22" height="22" align="center" valign="middle" bgcolor="${C.verde}" style="width:22px;height:22px;background:${C.verde};border-radius:11px;color:#ffffff;font-family:${FONTE};font-size:12px;font-weight:bold;line-height:22px;">&#10003;</td>
            </tr></table>
          </td>
          <td style="padding:9px 0 9px 12px;font-family:${FONTE};font-size:16px;line-height:24px;color:${C.tinta};">${texto}</td>
        </tr>`;
}

/**
 * Assinatura da marca no fim do corpo: fio fino + logo oficial (martelo e nome).
 * Fundo claro atrás dela, porque o letreiro da logo é branco e desapareceria no branco puro.
 */
function assinaturaMarca() {
  return `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:30px 0 0 0;">
          <tr><td style="border-top:1px solid ${C.borda};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
          <tr>
            <td align="center" style="padding:22px 0 4px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td align="center" bgcolor="${C.escuro}" style="background:${C.escuro};border-radius:12px;padding:14px 26px;">
                  <a href="${SITE_URL}" style="text-decoration:none;">
                    <img src="${LOGO_URL}" alt="LEILÃO NOZAP" width="168" style="display:block;width:168px;height:auto;border:0;color:#ffffff;font-family:${FONTE};font-size:16px;font-weight:bold;letter-spacing:1px;">
                  </a>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 0 0 0;font-family:${FONTE};font-size:13px;line-height:20px;color:#93A29A;">
              Equipe Leilão NoZap
            </td>
          </tr>
        </table>`;
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
      etiqueta: 'Verificação de sistema',
      titulo: 'Está tudo funcionando.',
      subtitulo: 'Este é o modelo oficial dos e-mails automáticos do Leilão NoZap.',
      previa: 'Disparo automático ativo, domínio verificado e resposta chegando numa caixa real.',
      corpoHtml: `
        <p style="margin:0 0 8px 0;">Se você está lendo esta mensagem, três coisas foram confirmadas de uma vez:</p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:14px 0 26px 0;">
          ${itemCheck('O disparo automático está <strong>ativo</strong>')}
          ${/* o <span> no meio quebra a detecção automática do Gmail — sem isso ele pinta de azul e sublinha */ ''}
          ${itemCheck(`O domínio <strong>leilaonozap<span>.</span>com</strong> está assinando os envios`)}
          ${itemCheck('A resposta chega numa caixa lida por uma pessoa')}
        </table>

        <!-- destaque lateral verde -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 6px 0;">
          <tr>
            <td width="3" bgcolor="${C.verde}" style="width:3px;background:${C.verde};font-size:0;line-height:0;">&nbsp;</td>
            <td style="padding:2px 0 2px 16px;font-family:${FONTE};font-size:15px;line-height:25px;color:${C.tintaFraca};">
              É este mesmo modelo que o cliente recebe ao ter um <strong style="color:${C.tinta};">pedido aguardando pagamento</strong>,
              um <strong style="color:${C.tinta};">lembrete de leilão</strong> ou uma <strong style="color:${C.tinta};">confirmação de compra</strong>.
            </td>
          </tr>
        </table>

        ${assinaturaMarca()}`,
      ctaTexto: 'Visite o nosso site',
      ctaUrl: SITE_URL
    });

    // Versão em texto puro — melhora a entrega e atende quem lê sem HTML
    const textContent = [
      'LEILÃO NOZAP — Verificação de sistema',
      '',
      'Está tudo funcionando.',
      'Este é o modelo oficial dos e-mails automáticos do Leilão NoZap.',
      '',
      '- O disparo automático está ativo',
      '- O domínio leilaonozap.com está assinando os envios',
      '- A resposta chega numa caixa lida por uma pessoa',
      '',
      `Visite o nosso site: ${SITE_URL}`,
      '',
      `WhatsApp: ${WHATSAPP_URL}  ·  ${TELEFONE}`,
      `E-mail: ${EMAIL_CONTATO}`
    ].join('\n');

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
        subject: 'Está tudo funcionando — Leilão NoZap',
        htmlContent,
        textContent
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