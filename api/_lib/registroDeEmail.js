// 📧 O REGISTRO DE E-MAIL ENVIADO — uma linha por mensagem que sai.
//
// Antes disto (19/09/2026) a plataforma mandava e-mail e não guardava nada.
// Não havia como responder "a pessoa recebeu o código?" nem "quando saiu o
// acesso dela?". Agora toda saída passa por aqui.
//
// 🔴 DUAS REGRAS QUE NÃO SE NEGOCIAM
//
// 1. NUNCA SEGURA O ENVIO. Gravar registro é para conferir depois; falhar aqui
//    não pode impedir a pessoa de receber o código e entrar na plataforma.
//    Por isso: sem `await` obrigatório no chamador, e todo erro morre aqui.
//
// 2. NUNCA GUARDA CREDENCIAL. O assunto do código de login é literalmente
//    "483920 é seu código — Leilão NoZap". Gravar o assunto cru seria gravar a
//    senha de uso único em texto puro, ao lado do e-mail da pessoa. `limparAssunto`
//    tampa isso, e tem teste.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Os tipos que existem. Tipo desconhecido vira 'outro' em vez de sujar a tabela. */
export const TIPOS = Object.freeze([
  'codigo_acesso',   // sendEmailCode — cadastro e "esqueci a senha"
  'senha_definida',  // adminSetPassword
  'boas_vindas',     // sendWelcomeArrematante
  'campanha',        // scripts/campanha
  'outro',
]);

/**
 * Tira do assunto qualquer coisa que pareça segredo.
 *
 * Cobre os dois formatos que existem hoje e o que vier parecido:
 *   • sequência de 4+ dígitos  → o código de 6 dígitos do login
 *   • sequência de 16+ caracteres de token → link/token de redefinição
 *
 * Prefere apagar demais a deixar passar: assunto é para conferência humana,
 * não precisa ser fiel ao caractere.
 */
export function limparAssunto(bruto) {
  return String(bruto ?? '')
    .replace(/\b[A-Za-z0-9_-]{16,}\b/g, '•••')
    .replace(/\d{4,}/g, '••••')
    .slice(0, 200);
}

/** Só o necessário para achar a pessoa depois. Nada de nome nem de corpo. */
function limparDestinatario(bruto) {
  return String(bruto ?? '').trim().toLowerCase().slice(0, 200);
}

/**
 * Grava a linha. Devolve `true` se gravou, `false` em qualquer outro caso —
 * e NUNCA lança.
 *
 * @param {object} dados
 * @param {string} dados.para       destinatário
 * @param {string} [dados.assunto]  assunto (passa pelo limpador)
 * @param {string} dados.tipo       um dos TIPOS
 * @param {boolean} dados.ok        o provedor aceitou?
 * @param {string} [dados.messageId] id devolvido pelo provedor
 * @param {string} [dados.erro]     motivo, quando recusado
 * @param {string} [dados.atorId]   quem disparou, quando houver
 * @param {string} [dados.provedor] padrão 'brevo'
 */
export async function registrarEmail(dados = {}) {
  try {
    if (!SUPABASE_URL || !SR) return false;
    const para = limparDestinatario(dados.para);
    if (!para) return false;

    const linha = {
      para,
      assunto: dados.assunto ? limparAssunto(dados.assunto) : null,
      tipo: TIPOS.includes(dados.tipo) ? dados.tipo : 'outro',
      provedor: String(dados.provedor || 'brevo').slice(0, 40),
      message_id: dados.messageId ? String(dados.messageId).slice(0, 200) : null,
      status: dados.ok ? 'enviado' : 'recusado',
      erro: dados.ok ? null : String(dados.erro || '').slice(0, 400) || null,
      ator_id: dados.atorId ? String(dados.atorId).slice(0, 80) : null,
    };

    const r = await fetch(`${SUPABASE_URL}/rest/v1/emails_enviados`, {
      method: 'POST',
      headers: {
        apikey: SR, Authorization: `Bearer ${SR}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify(linha),
    });
    if (!r.ok) {
      // some calado do ponto de vista do usuário, mas aparece no log da Vercel
      console.warn('[registroDeEmail] não gravou', r.status, (await r.text().catch(() => '')).slice(0, 160));
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[registroDeEmail] erro', String(e?.message || e).slice(0, 160));
    return false;
  }
}

/** O `messageId` da Brevo, quando ela devolve. Corpo estranho → null, sem lançar. */
export function idDaBrevo(corpo) {
  try {
    const id = corpo?.messageId ?? corpo?.messageIds?.[0];
    return id ? String(id) : null;
  } catch { return null; }
}
