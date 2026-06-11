// sendWelcomeEmail — e-mail de boas-vindas por categoria (Resend), com login + senha padrão + link.
// test:true → assunto com [TESTE] e manda pros fundadores também.
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.MAIL_FROM || 'Leilão NoZap <nao-responda@draisabeladias.com.br>';
const SITE = 'https://leilaonozap.net';
const FUNDADORES = ['diogof3x@gmail.com', 'luizsantanna@tttcorporate.com'];

const CARGO = {
  loja_fisica: {
    label: 'Loja Física', pct: 19,
    pitch: 'Sua Loja Física na Leilão NoZap está ativa! Você vende os produtos do nosso catálogo com estoque próprio e ainda pode gerenciar o que tem na sua loja.',
    bullets: ['Comissão de <b>19%</b> na venda direta', 'Estoque próprio + catálogo do distribuidor', 'Edite sua loja: adicione, remova e ajuste produtos', 'Cadastre seus vendedores'],
  },
  ponto_retirada: {
    label: 'Ponto de Retirada', pct: 16,
    pitch: 'Você agora é um Ponto de Retirada da Leilão NoZap! Armazene, distribua e venda na sua região.',
    bullets: ['Comissão de <b>16%</b> na venda direta', 'Estoque pronto pra vender', 'Logística e retirada da sua região'],
  },
  parceiro: {
    label: 'Parceiro', pct: 15,
    pitch: 'Bem-vindo, Parceiro! Comece a montar sua estrutura e vender com a Leilão NoZap.',
    bullets: ['Comissão de <b>15%</b> na venda direta', 'Estoque pronto pra vender', 'Monte sua equipe'],
  },
};

function html({ nome, cargoLabel, pitch, bullets, login, senha }) {
  const lis = bullets.map((b) => `<tr><td style="padding:4px 0;color:#cbd5e1;font-size:14px">✅ ${b}</td></tr>`).join('');
  return `<!DOCTYPE html><html><body style="margin:0;background:#0a0f0d;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0d;padding:24px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0f1614;border:1px solid #1f2d27;border-radius:16px;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#052e1e,#064e3b);padding:28px 32px;text-align:center">
          <div style="font-size:34px">🔨</div>
          <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:1px">LEILÃO <span style="color:#34d399">NOZAP</span></div>
          <div style="margin-top:6px;display:inline-block;background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.4);color:#a7f3d0;font-size:12px;font-weight:700;padding:4px 14px;border-radius:999px">${cargoLabel}</div>
        </td></tr>
        <tr><td style="padding:28px 32px">
          <h1 style="margin:0 0 8px;color:#fff;font-size:22px">Bem-vindo(a), ${nome}! 🎉</h1>
          <p style="margin:0 0 18px;color:#cbd5e1;font-size:15px;line-height:1.6">${pitch}</p>
          <table width="100%" cellpadding="0" cellspacing="0">${lis}</table>
          <div style="margin:22px 0;background:#0a1310;border:1px solid #1f2d27;border-radius:12px;padding:18px">
            <div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Seu acesso</div>
            <div style="color:#cbd5e1;font-size:14px;line-height:1.8">
              <b style="color:#fff">Login:</b> ${login}<br>
              <b style="color:#fff">Senha:</b> <span style="background:#15241d;border:1px solid #2f6f55;border-radius:6px;padding:2px 10px;color:#fff;font-weight:700;letter-spacing:2px">${senha}</span>
            </div>
            <div style="margin-top:8px;color:#94a3b8;font-size:12px">🔒 Troque sua senha no primeiro acesso, em <b>Empresa / Perfil → Trocar senha</b>.</div>
          </div>
          <a href="${SITE}" style="display:block;text-align:center;background:#16a34a;color:#fff;text-decoration:none;font-weight:800;font-size:16px;padding:14px;border-radius:12px">Acessar meu painel →</a>
          <p style="margin:20px 0 0;color:#64748b;font-size:12px;text-align:center">leilaonozap.net · Qualquer dúvida, é só responder este e-mail.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const to = String(body?.to || '').trim().toLowerCase();
    const cargo = String(body?.cargo || '').trim();
    const nome = String(body?.full_name || body?.nome || 'parceiro(a)');
    const senha = String(body?.password || 'leilao@123');
    const login = String(body?.login || to);
    const test = !!body?.test;
    const meta = CARGO[cargo];
    if (!to || !meta) return res.status(400).json({ success: false, error: 'to e cargo válidos obrigatórios' });
    if (!RESEND_KEY) return res.status(500).json({ success: false, error: 'RESEND_API_KEY ausente' });

    // sempre manda cópia pros fundadores (review) — sem duplicar o destinatário
    const recipients = Array.from(new Set([to, ...FUNDADORES]));
    const subject = `${test ? '[TESTE] ' : ''}Bem-vindo à Leilão NoZap — ${meta.label}`;
    const payload = {
      from: FROM, to: recipients, subject,
      html: html({ nome, cargoLabel: meta.label, pitch: meta.pitch, bullets: meta.bullets, login, senha }),
    };
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) return res.status(200).json({ success: false, error: 'Falha no envio', details: JSON.stringify(j).slice(0, 200) });
    return res.status(200).json({ success: true, id: j.id, recipients });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
