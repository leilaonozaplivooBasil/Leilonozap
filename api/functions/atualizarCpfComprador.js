// atualizarCpfComprador — admin salva/atualiza o CPF de um comprador sem sair
// do gerenciador de pedidos. Usado quando o comprador não preencheu o CPF no
// cadastro e a etiqueta da transportadora foi bloqueada por isso.
// Autenticação: actorId precisa ser admin/super_admin.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ PONTO 112 — mesma conta do checkout e da etiqueta. Copiada de proposito
// (nao importada): api/functions/ nao deve importar de api/_lib pra logica
// pequena — ver o cabecalho de api/functions/submitAtomicBid.js.
function cpfValido(valor) {
  const cpf = String(valor || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (base) => {
    let soma = 0;
    for (let i = 0; i < base; i += 1) soma += parseInt(cpf[i], 10) * (base + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(cpf[9], 10) && calc(10) === parseInt(cpf[10], 10);
}

function sb(path, opts = {}) {
  const root = String(SUPABASE_URL || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  return fetch(`${root}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    if (!SUPABASE_URL || !SR) return res.status(200).json({ ok: false, error: 'Config do servidor ausente.' });

    const actorId = String(body.actorId || '').trim();
    if (!actorId) return res.status(200).json({ ok: false, error: 'Sessão não identificada.' });

    const atorResp = await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`);
    const ator = ((await atorResp.json().catch(() => null)) || [])[0];
    if (!ator) return res.status(200).json({ ok: false, error: 'Usuário não encontrado.' });
    if (ator.role !== 'admin' && ator.role !== 'super_admin') return res.status(200).json({ ok: false, error: 'Apenas administradores.' });

    const buyerId = String(body.buyer_id || '').trim();
    if (!buyerId) return res.status(200).json({ ok: false, error: 'buyer_id é obrigatório.' });

    // 🔴 PONTO 112 (21/08/2026) — ESTA ERA A ÚLTIMA PORTA ABERTA.
    // Aqui só conferia `length !== 11`, o mesmo furo do checkout (PONTO 111).
    // Efeito prático: a etiqueta falhava dizendo "CPF inválido, corrija em
    // Gerenciar", o operador vinha corrigir, digitava OUTRO CPF inválido, o
    // sistema aceitava — e ele caía exatamente no mesmo erro. Loop infinito,
    // com o operador achando que o sistema estava quebrado.
    // Agora a conferência é o dígito verificador de verdade, a MESMA conta do
    // checkout (src/pages/Cart.jsx) e da etiqueta (api/_lib/melhorEnvioShipment.js).
    const cpf = String(body.cpf || '').replace(/\D/g, '');
    if (cpf.length !== 11) return res.status(200).json({ ok: false, error: 'CPF inválido — informe 11 dígitos numéricos.' });
    if (!cpfValido(cpf)) {
      return res.status(200).json({ ok: false, error: 'Esse CPF não passa na conferência dos dígitos. Confira o número com o cliente.' });
    }

    const upd = await sb(`app_users?id=eq.${encodeURIComponent(buyerId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ cpf }),
    });
    if (!upd.ok) return res.status(200).json({ ok: false, error: 'Não foi possível salvar o CPF no banco.' });

    return res.status(200).json({ ok: true, cpf });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}
