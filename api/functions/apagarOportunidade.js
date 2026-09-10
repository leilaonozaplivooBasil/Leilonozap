// apagarOportunidade — remover um card duplicado da Esteira de Captação.
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE ESTA ROTA EXISTE
// ══════════════════════════════════════════════════════════════════════════════
// Relato do admin (09/09/2026): "o Luciano fechou 200 mil e não conseguiu
// colocar no kanban dele. Eu fui lá e coloquei por ele através da minha conta de
// admin. Mas depois o Luciano foi colocar na verificação do progresso dele,
// duplicou o card. (...) E ali nos cards preciso de uma opção de apagar
// duplicados."
//
// 🔴 E NÃO É SÓ POLUIÇÃO VISUAL: os dois cards SOMAM. No print, o painel dizia
// "Fechado (100%) R$ 400.000,00" e "304% da meta" quando o dinheiro real era
// R$ 200.000. Duplicata na esteira dobra o fechado e infla o forecast.
//
// ══════════════════════════════════════════════════════════════════════════════
// 🔴 POR QUE PRECISA SER ROTA DE SERVIDOR, e não um delete do navegador
// ══════════════════════════════════════════════════════════════════════════════
// `captacao_oportunidades` tem RLS ligado e políticas de INSERT, SELECT e
// UPDATE — mas NENHUMA de DELETE. Conferido no banco antes de escrever isto.
// Um `.delete()` do navegador (que é sempre `anon`, o site não usa Supabase
// Auth) apaga ZERO linhas e NÃO devolve erro: o botão diria "apagado" e o card
// continuaria lá. É o PONTO 130 desta casa, de novo.
//
// Criar política de DELETE também não serve: como todo navegador é `anon`, a
// política não tem como dizer "só admin" — ficaria aberta pra qualquer um
// apagar registro de dinheiro. Por isso: service role, aqui, com crachá.
//
// ══════════════════════════════════════════════════════════════════════════════
// SEGURANÇA
// ══════════════════════════════════════════════════════════════════════════════
// • Exige crachá de sessão COM userId — mesmo em modo observação. `exigirSessao`
//   libera chamada sem crachá quando SESSAO_MODO não é 'bloquear', e pra uma
//   rota que APAGA isso não basta. Sem identidade, não apaga.
// • O cargo é lido do BANCO pelo id do crachá, nunca do corpo da requisição.
// • Só admin/super_admin. Foi um admin que pediu, e é registro de dinheiro.
// • Grava em system_logs O QUE foi apagado, inteiro — se alguém apagar o card
//   errado, dá pra reconstruir.

import { exigirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

function novoId() {
  let out = '';
  for (let i = 0; i < 24; i += 1) out += '0123456789abcdef'[Math.floor(Math.random() * 16)];
  return out;
}

// Nunca derruba a operação principal — se o log falhar, só avisa no console.
async function registrar(entrada) {
  try {
    await sb('system_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id: novoId(), raw_base44: { kind: 'esteira_apagou', ...entrada, at: new Date().toISOString() } }),
    });
  } catch (e) {
    console.warn('[apagarOportunidade] auditoria não gravada:', e?.message || e);
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body && typeof body === 'object' ? body : {};

    const id = String(body.id || '').trim();
    if (!id) return res.status(200).json({ success: false, error: 'Sem id da oportunidade.' });

    // 🔑 Identidade do crachá. ⚠️ Note o `|| !ses.userId`: em modo observação o
    // exigirSessao devolve liberado mesmo sem crachá, e uma rota que APAGA não
    // pode aceitar isso. Sem identidade, não apaga.
    const ses = exigirSessao(req, null, 'apagarOportunidade');
    if (!ses.liberado || !ses.userId) {
      return res.status(401).json({
        success: false,
        error: 'Sua sessão expirou. Saia e entre de novo para apagar.',
        motivo: ses.motivo,
      });
    }

    // 🛡️ O cargo vem do BANCO, pelo id do crachá — nunca do corpo.
    const rq = await sb(`app_users?id=eq.${encodeURIComponent(ses.userId)}&select=id,full_name,role`);
    const quem = (await rq.json().catch(() => null))?.[0] || null;
    if (!quem) return res.status(200).json({ success: false, error: 'Não encontrei seu cadastro.' });
    if (!['admin', 'super_admin'].includes(String(quem.role || ''))) {
      console.warn(`[apagarOportunidade] ${quem.full_name} (${quem.role}) tentou apagar ${id}.`);
      return res.status(200).json({ success: false, error: 'Só um administrador pode apagar card da esteira.' });
    }

    // Lê ANTES de apagar: é o que permite reconstruir se apagarem o errado, e
    // é o que a tela usa pra avisar que o card carrega prova de dinheiro.
    const ro = await sb(`captacao_oportunidades?id=eq.${encodeURIComponent(id)}&select=*`);
    const alvo = (await ro.json().catch(() => null))?.[0] || null;
    if (!alvo) return res.status(200).json({ success: false, error: 'Esse card já não existe.' });

    const r = await sb(`captacao_oportunidades?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
    const linhas = await r.json().catch(() => null);
    if (!r.ok) {
      const detalhe = typeof linhas === 'string' ? linhas : JSON.stringify(linhas || {});
      console.error(`[apagarOportunidade] falhou para ${id} — HTTP ${r.status}:`, detalhe.slice(0, 400));
      return res.status(200).json({ success: false, error: 'Não foi possível apagar agora.' });
    }
    // Zero linhas com HTTP 200 é o no-op silencioso que motivou esta rota.
    // Aqui ele não passa calado.
    if (!Array.isArray(linhas) || !linhas.length) {
      console.error(`[apagarOportunidade] DELETE não pegou nenhuma linha para ${id}.`);
      return res.status(200).json({ success: false, error: 'Nada foi apagado — recarregue e tente de novo.' });
    }

    await registrar({
      oportunidade_id: id,
      por: quem.full_name,
      por_id: quem.id,
      motivo: String(body.motivo || '').slice(0, 300) || null,
      apagado: alvo, // a linha inteira, pra dar pra reconstruir
    });

    return res.status(200).json({ success: true, apagado: { id, cliente_nome: alvo.cliente_nome } });
  } catch (e) {
    console.error('[apagarOportunidade] erro:', String(e?.message || e));
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
