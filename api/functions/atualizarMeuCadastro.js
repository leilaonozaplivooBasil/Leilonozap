// atualizarMeuCadastro — a PESSOA salvando o PRÓPRIO cadastro.
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE ESTA ROTA EXISTE
// ══════════════════════════════════════════════════════════════════════════════
// Cliente comum NÃO CONSEGUE salvar o próprio perfil. Isso não é suposição — está
// escrito no topo de adminUpdateUser.js desde que aquela rota nasceu:
//
//     "O app usa só a anon key (auth custom em app_users), então UPDATE direto
//      via PostgREST dá no-op silencioso (RLS de escrita é só pra 'authenticated')"
//
// E o plataformaAdapter só usa rota de servidor quando quem está logado é
// admin/super_admin ou tem cargo de estoque (_operatorActor). Para todo mundo
// mais, a escrita ia direto do navegador — e não gravava.
//
// O que a cliente via, no print de 25/08/2026, ao salvar o endereço no Perfil:
//
//     "Erro ao atualizar perfil: Cannot coerce the result to a single JSON object"
//
// Essa frase é do PostgREST quando o `.single()` recebe ZERO linhas. Ou seja: o
// UPDATE não pegou nenhuma linha, exatamente como o comentário previa.
//
// Efeito prático: endereço, telefone, apelido e CEP eram impossíveis de salvar
// para quem não é da equipe. E foi isso que prendeu os clientes novos no leilão
// — sem CEP no cadastro, a sala nunca conseguia cotar o frete.
//
// ══════════════════════════════════════════════════════════════════════════════
// SEGURANÇA
// ══════════════════════════════════════════════════════════════════════════════
// • A identidade sai do CRACHÁ DE SESSÃO. `user_id` no corpo é, no máximo,
//   conferência — nunca fonte. Sem isso, mandar o id de outra pessoa editaria o
//   cadastro dela.
// • LISTA FECHADA de campos. Só entra o que a própria pessoa edita na tela de
//   Perfil, mais o CEP. Tudo que decide dinheiro, acesso ou hierarquia fica de
//   fora, POR NOME: role, career_levels, commission_balance, active,
//   referred_by_id, referral_code, email, full_name, senha, carteira executiva.
//   Campo desconhecido é descartado calado — nunca chega ao banco.
// • Usa a chave de serviço, então não depende de permissão de navegador. É o
//   único jeito de isto funcionar para cliente comum.

import { exigirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// 🔒 O QUE A PRÓPRIA PESSOA PODE MUDAR. Nada aqui decide dinheiro, acesso ou
// posição na rede. Antes de acrescentar campo nesta lista, pergunte: "se o
// dono desta conta puser o valor que quiser aqui, alguém perde dinheiro ou
// ganha permissão?" Se a resposta for sim, o campo NÃO entra.
const MEUS_CAMPOS = [
  'nickname',
  'phone',
  'avatar_url', 'avatar_color', 'profile_photo_url',
  'display_first_name', 'display_last_name',
  'address_street', 'address_number', 'address_complement',
  'address_neighborhood', 'address_city', 'address_state', 'address_zip_code',
];

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body && typeof body === 'object' ? body : {};

    // 🔑 Identidade do crachá. Ponto. Igual ao cotarFrete (BLOQUEADOR 14).
    const ses = exigirSessao(req, null, 'atualizarMeuCadastro');
    if (!ses.liberado || ses.motivo !== 'ok' || !ses.userId) {
      return res.status(401).json({
        success: false, error: 'nao_autenticado', motivo: ses.motivo,
        detalhe: 'Esta rota grava no cadastro, então exige crachá de sessão válido mesmo com SESSAO_MODO em observação.',
      });
    }
    const eu = String(ses.userId);

    // Conferência, não fonte: se o corpo pedir outra pessoa, recusa.
    const pedido = String(body.user_id || body.userId || '').trim();
    if (pedido && pedido !== eu) {
      console.error(`[MEU-CADASTRO] corpo pediu ${pedido} com crachá de ${eu}.`);
      return res.status(403).json({ success: false, error: 'cracha_de_outra_pessoa' });
    }

    // Peneira: o que não está na lista fechada não passa.
    const entrada = body.updates && typeof body.updates === 'object' ? body.updates : body;
    const mudancas = {};
    const recusados = [];
    for (const [campo, valor] of Object.entries(entrada)) {
      if (campo === 'user_id' || campo === 'userId' || campo === 'updates' || campo === 'id') continue;
      if (MEUS_CAMPOS.includes(campo)) mudancas[campo] = valor;
      else recusados.push(campo);
    }
    if (recusados.length) {
      console.warn(`[MEU-CADASTRO] ${eu} tentou mudar campo fora da lista: ${recusados.join(', ')} — descartado.`);
    }
    if (!Object.keys(mudancas).length) {
      return res.status(200).json({ success: false, error: 'nada_para_salvar', campos_recusados: recusados });
    }

    // CEP sempre só dígitos — é assim que o resto do sistema lê.
    if (typeof mudancas.address_zip_code === 'string') {
      mudancas.address_zip_code = mudancas.address_zip_code.replace(/\D/g, '');
    }

    const r = await sb(`app_users?id=eq.${encodeURIComponent(eu)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(mudancas),
    });
    const linhas = await r.json().catch(() => null);
    if (!r.ok) {
      const detalhe = typeof linhas === 'string' ? linhas : JSON.stringify(linhas || {});
      console.error(`[MEU-CADASTRO] falhou para ${eu} — HTTP ${r.status}:`, detalhe.slice(0, 400));
      return res.status(200).json({ success: false, error: 'Não foi possível salvar seu cadastro agora.', detalhe: detalhe.slice(0, 300) });
    }
    // Zero linhas com HTTP 200 é o "no-op silencioso" que derrubou a tela antes.
    // Aqui ele não passa calado.
    if (!Array.isArray(linhas) || !linhas.length) {
      console.error(`[MEU-CADASTRO] PATCH não pegou nenhuma linha para ${eu}.`);
      return res.status(200).json({ success: false, error: 'Cadastro não encontrado para salvar.' });
    }

    return res.status(200).json({ success: true, user: linhas[0], campos_salvos: Object.keys(mudancas), campos_recusados: recusados });
  } catch (e) {
    console.error('[MEU-CADASTRO] erro:', String(e?.message || e));
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
