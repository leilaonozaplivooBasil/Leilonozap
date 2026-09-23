// ✉️ "Não quero mais receber" — o link do rodapé dos avisos (assinado, sem login).
// GET ?u=<id>&c=<leilao|conta>&t=<assinatura>[&r=1 pra voltar a receber]
import { conferirDescadastro } from '../_lib/avisosPorEmail.js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const pagina = (titulo, texto, link) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="margin:0;background:#0a1611;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e8ece9"><div style="max-width:480px;margin:48px auto;padding:32px;background:#0d1f17;border-radius:16px">
<h2 style="color:#34d399;margin:0 0 12px">${titulo}</h2><p style="font-size:15px;line-height:1.5">${texto}</p>${link ? `<p style="margin-top:20px"><a href="${link}" style="color:#9aa3a0;font-size:13px">${link.includes('r=1') ? 'Voltar a receber' : 'Voltar ao site'}</a></p>` : ''}
</div></body></html>`;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const q = req.query || {};
  const userId = String(q.u || ''); const categoria = String(q.c || ''); const token = String(q.t || ''); const voltar = String(q.r || '') === '1';
  if (!['leilao', 'conta'].includes(categoria) || !userId || !conferirDescadastro(userId, categoria, token)) {
    return res.status(400).send(pagina('Link inválido', 'Este link não é válido ou já expirou. Se quiser mudar seus avisos, entre na sua conta.', 'https://leilaonozap.net'));
  }
  const coluna = categoria === 'leilao' ? 'avisos_leilao' : 'avisos_conta';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/app_users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH', headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ [coluna]: voltar }),
  });
  if (!r.ok) return res.status(500).send(pagina('Não deu certo', 'Tente de novo em instantes.', null));
  const oque = categoria === 'leilao' ? 'avisos de leilão' : 'avisos da conta';
  const base = `/api/functions/descadastrarAvisos?u=${encodeURIComponent(userId)}&c=${categoria}&t=${encodeURIComponent(token)}`;
  return res.status(200).send(voltar
    ? pagina('Pronto, avisos ligados', `Você voltou a receber ${oque}.`, 'https://leilaonozap.net')
    : pagina('Pronto, não vai mais receber', `Você não recebe mais ${oque} por e-mail. Mudou de ideia? É só clicar abaixo.`, `${base}&r=1`));
}
