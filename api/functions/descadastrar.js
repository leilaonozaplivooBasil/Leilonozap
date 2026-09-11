// descadastrar — o link "não quero mais receber" do rodapé da campanha.
//
// É GET de propósito: clique em link de e-mail é sempre GET, e vários provedores
// (Gmail, Outlook) abrem o link sozinhos para checar se é seguro. Por isso o
// endereço vem ASSINADO: sem a assinatura certa, ninguém consegue descadastrar
// outra pessoa só chutando e-mails na barra do navegador.
//
// A assinatura é a mesma que o `scripts/campanha/disparar.mjs` gera. Se as duas
// pontas não usarem o mesmo segredo, o link não funciona — e é melhor não
// funcionar do que descadastrar quem não pediu.
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Segredo próprio da campanha. Se não existir, cai na service role — que já é
// secreta e já está configurada, então o link nunca fica sem assinatura.
const SEGREDO = process.env.CAMPANHA_SECRET || SR;

/** A mesma conta que o disparador faz. Mudou aqui, muda lá. */
export function assinar(valor, segredo = SEGREDO) {
  return crypto.createHmac('sha256', String(segredo)).update(String(valor).trim().toLowerCase())
    .digest('hex').slice(0, 24);
}

function confere(recebido, esperado) {
  const a = Buffer.from(String(recebido || ''));
  const b = Buffer.from(String(esperado || ''));
  // comprimento diferente já é erro, e timingSafeEqual exige tamanhos iguais
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function pagina(titulo, recado, tom = '#34d399') {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="margin:0;background:#0a1410;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
<div style="max-width:440px;margin:12vh auto;padding:32px;background:#0d1f17;border-radius:16px;text-align:center">
  <p style="margin:0 0 18px;font-size:13px;font-weight:800;letter-spacing:.06em;color:#34d399">LEILÃO NOZAP</p>
  <h1 style="margin:0 0 12px;font-size:22px;color:${tom}">${titulo}</h1>
  <p style="margin:0;font-size:15px;line-height:1.5;color:#bfe8d6">${recado}</p>
</div></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const q = req.query || {};
    const email = String(q.email || '').trim().toLowerCase();
    const telefone = String(q.telefone || '').trim();
    const alvo = email || telefone;

    if (!alvo || !SUPABASE_URL || !SR) {
      return res.status(400).send(pagina('Link inválido',
        'Esse endereço não está completo. Responda o e-mail que a gente tira você da lista na mão.', '#f59e0b'));
    }
    if (!confere(q.t, assinar(alvo))) {
      return res.status(403).send(pagina('Link inválido',
        'Essa assinatura não confere. Responda o e-mail que a gente tira você da lista na mão.', '#f59e0b'));
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/marketing_descadastro`, {
      method: 'POST',
      headers: {
        apikey: SR,
        Authorization: `Bearer ${SR}`,
        'Content-Type': 'application/json',
        // clicar duas vezes no link não pode virar erro na cara da pessoa
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({
        email: email || null,
        telefone: telefone || null,
        origem: email ? 'link_email' : 'sms',
      }),
    });

    if (!r.ok && r.status !== 409) {
      // Falhou gravar: não minta dizendo que deu certo, senão a pessoa acha que
      // saiu e recebe de novo no próximo disparo.
      return res.status(200).send(pagina('Não consegui registrar agora',
        'Deu um problema do nosso lado. Responda este e-mail com a palavra SAIR que a gente tira você da lista.',
        '#f59e0b'));
    }

    return res.status(200).send(pagina('Pronto, você saiu da lista',
      'Não vamos mais mandar campanha para você. E-mails de código de acesso e de compra continuam chegando normalmente.'));
  } catch {
    return res.status(200).send(pagina('Não consegui registrar agora',
      'Deu um problema do nosso lado. Responda este e-mail com a palavra SAIR que a gente tira você da lista.',
      '#f59e0b'));
  }
}
