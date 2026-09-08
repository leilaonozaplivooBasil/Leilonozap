// 📋 DESPACHAR UM CHAMADO — a decisão do dono sobre o que o usuário mandou.
//
// POST → { chamado_id, acao, ... }
//   acao 'atualizar'  → { status?, prioridade?, nota_interna? }
//   acao 'virar_demanda' → { pessoa_id, pessoa_nome?, prazo_dia?, prazo_hora? }
//
// POR QUE UMA ROTA, e não o front escrevendo direto: `suporte_chamados` tem RLS
// com política só de LEITURA. Escrita é exclusiva do service_role, que vive
// aqui. É o padrão da casa e evita que o navegador de qualquer pessoa logada
// consiga mexer na fila do dono.
import { demandaDoChamado, chamadoDespachado } from '../../src/lib/painelDemandas.js';
import { STATUS } from '../../src/lib/tiraDuvidas.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(caminho, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    ...opts,
    headers: {
      apikey: SR, Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json', ...(opts.headers || {}),
    },
    signal: AbortSignal.timeout(8000),
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });
  if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const chamadoId = String(body?.chamado_id || '').trim();
    const acao = String(body?.acao || 'atualizar');
    if (!chamadoId) return res.status(400).json({ ok: false, error: 'chamado_id obrigatório' });

    // ── mudar status / prioridade / nota ──────────────────────────────
    if (acao === 'atualizar') {
      const mudanca = { updated_at: new Date().toISOString() };
      if (body?.status !== undefined) {
        if (!STATUS.includes(body.status)) return res.status(400).json({ ok: false, error: 'status inválido' });
        mudanca.status = body.status;
      }
      if (body?.prioridade !== undefined) {
        const p = Math.round(Number(body.prioridade));
        if (!(p >= 1 && p <= 5)) return res.status(400).json({ ok: false, error: 'prioridade tem que ser de 1 a 5' });
        mudanca.prioridade = p;
      }
      if (body?.nota_interna !== undefined) mudanca.nota_interna = String(body.nota_interna).slice(0, 2000) || null;

      const r = await sb(`suporte_chamados?id=eq.${encodeURIComponent(chamadoId)}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(mudanca),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) { console.error('[despacharChamado] patch falhou', r.status, j); return res.status(200).json({ ok: false, error: 'Não consegui salvar' }); }
      return res.status(200).json({ ok: true, chamado: Array.isArray(j) ? j[0] : j });
    }

    // ── virar demanda: a ponte pro xperf_demandas ─────────────────────
    if (acao === 'virar_demanda') {
      const pessoaId = String(body?.pessoa_id || '').trim();
      if (!pessoaId) return res.status(400).json({ ok: false, error: 'escolha quem leva esta demanda' });

      const rc = await sb(`suporte_chamados?id=eq.${encodeURIComponent(chamadoId)}&select=*&limit=1`);
      const chamados = await rc.json().catch(() => []);
      const chamado = Array.isArray(chamados) ? chamados[0] : null;
      if (!chamado) return res.status(404).json({ ok: false, error: 'chamado não encontrado' });
      // 🔒 despachar duas vezes criaria duas tarefas pro mesmo problema — a
      // pessoa recebe o trabalho repetido e ninguém entende por quê
      if (chamado.demanda_id) return res.status(200).json({ ok: true, jaDespachado: true, demanda_id: chamado.demanda_id });

      const linha = demandaDoChamado(chamado, {
        pessoaId,
        pessoaNome: String(body?.pessoa_nome || '').slice(0, 120) || null,
        criadoPorId: String(body?.criado_por_id || '').slice(0, 120) || null,
        criadoPorNome: String(body?.criado_por_nome || '').slice(0, 120) || null,
        prazoDia: body?.prazo_dia || null,
        prazoHora: body?.prazo_hora || '18:00',
      });
      if (!linha) return res.status(400).json({ ok: false, error: 'não deu pra montar a demanda (sem título ou sem responsável)' });

      const rd = await sb('xperf_demandas', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(linha) });
      const jd = await rd.json().catch(() => null);
      if (!rd.ok) { console.error('[despacharChamado] insert demanda falhou', rd.status, jd); return res.status(200).json({ ok: false, error: 'Não consegui criar a demanda' }); }
      const demanda = Array.isArray(jd) ? jd[0] : jd;

      // marca o chamado. Se ISTO falhar, a demanda já existe: devolve o id
      // pra tela mostrar, em vez de fingir que nada aconteceu.
      const rm = await sb(`suporte_chamados?id=eq.${encodeURIComponent(chamadoId)}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...chamadoDespachado(demanda?.id), updated_at: new Date().toISOString() }),
      });
      const jm = await rm.json().catch(() => null);
      if (!rm.ok) console.error('[despacharChamado] demanda criada mas chamado não marcou', rm.status, jm);

      return res.status(200).json({
        ok: true, demanda_id: demanda?.id || null,
        chamado: Array.isArray(jm) ? jm[0] : null,
        avisoMarcacao: rm.ok ? null : 'A demanda foi criada, mas o chamado não ficou marcado — atualize a página.',
      });
    }

    return res.status(400).json({ ok: false, error: 'ação desconhecida' });
  } catch (e) {
    console.error('[despacharChamado] erro', String(e?.message || e));
    return res.status(200).json({ ok: false, error: 'Falhou ao despachar' });
  }
}
