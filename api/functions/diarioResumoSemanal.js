// 📔 O RESUMO NARRADO DA SEMANA — terreno da Fase 3 do Diário de Bolso
// (dono, 08/09/2026: "prepare o terreno para a fase 3"). NENHUMA tela e
// NENHUM cron chama esta rota ainda — ela existe pronta, com o custo já
// medido, esperando a decisão de ligar (um botão "gerar resumo da semana",
// ou um cron semanal — decisão futura).
//
// GET  ?ping=1 → saúde SEM gastar quase nada (64 tokens, o mesmo truque do
//      InvokeLLM): { ok, ia, tem_chave, model, via, ping? }
// POST → { user_id, semana_inicio } (semana_inicio = 'YYYY-MM-DD', a
//      segunda-feira) → gera o resumo dos 7 dias daquela semana, grava em
//      diario_bolso_semanas (upsert — gerar de novo a mesma semana
//      atualiza) e devolve { ok, resumo, model, ja_existia }.
//
// CUSTO MEDIDO (Sonnet 5, mesmo modelo do InvokeLLM — "bom e barato" pra
// texto, decisão do dono): uma semana cheia (~150 entradas, o teto de
// RESUMO_SEMANAL_MAX_ENTRADAS) fica em torno de 10-11 mil tokens de entrada
// e até 800 de saída → ~$0,025 a $0,03 por pessoa por semana. Pra 50
// pessoas gerando toda semana, isso é ~$1,30-1,50/semana (~$6/mês).
import { resolverIA, clienteIA, opcoesDeReserva, detalhesDoErro } from '../_lib/ia.js';
import { diarioAgrupado } from '../../src/lib/diarioDeBolso.js';
import { promptDoResumoSemanal, sistemaDoResumoSemanal, SCHEMA_RESUMO_SEMANAL } from '../../src/lib/diarioResumo.js';

export const config = { maxDuration: 30 };

// texto é o forte do Sonnet e custa 40% do Opus (api/_lib/ia.js, mesma
// régua do InvokeLLM) — Opus fica reservado pra validação de foto.
const MODEL_DIRETO = process.env.AI_MODEL_TEXT_ANTHROPIC || 'claude-sonnet-5';
const MODEL_GATEWAY = process.env.AI_MODEL_TEXT || 'anthropic/claude-sonnet-5';
const MODEL_GATEWAY_RESERVA = process.env.AI_MODEL_TEXT_RESERVA || 'anthropic/claude-haiku-4-5';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });
}
const j = async (r) => r.json().catch(() => []);
const arr = (x) => (Array.isArray(x) ? x : []);

const resolverIACompartilhada = () => resolverIA({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY, reserva: MODEL_GATEWAY_RESERVA });

function somarDias(dataISO, dias) {
  const d = new Date(`${dataISO}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Chamada mínima real (64 tokens) — prova, pelo caminho de verdade, que a chave funciona. Custa frações de centavo. */
async function ping(ia) {
  try {
    const m = await clienteIA(ia).messages.create({
      model: ia.model, max_tokens: 64,
      messages: [{ role: 'user', content: 'Responda só "ok".' }],
      ...opcoesDeReserva(ia),
    });
    return { status: 200, ok: true, model: m.model };
  } catch (e) {
    const d = detalhesDoErro(e);
    console.error('[diarioResumoSemanal] ping falhou', { via: ia.via, model: ia.model, ...d });
    return { status: d.status, ok: false, corpo: `${d.tipo}: ${d.mensagem}` };
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    const ia = await resolverIACompartilhada();
    const p = ia && String(req.query?.ping || '') === '1' ? await ping(ia) : undefined;
    return res.status(200).json({ ok: true, ia: p ? p.ok : Boolean(ia), tem_chave: Boolean(ia), model: ia?.model || null, via: ia?.via || null, ...(p ? { ping: p } : {}) });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config do servidor ausente' });
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const userId = String(body?.user_id || '').trim();
    const semanaInicio = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.semana_inicio || '')) ? body.semana_inicio : null;
    if (!userId || !semanaInicio) return res.status(400).json({ ok: false, error: 'user_id e semana_inicio (YYYY-MM-DD) são obrigatórios' });
    const semanaFim = somarDias(semanaInicio, 6);

    const [tarefas, entradas] = await Promise.all([
      j(await sb(`metodo_tarefas?user_id=eq.${userId}&feito=eq.true&data=gte.${semanaInicio}&data=lte.${semanaFim}&select=id,data,hora,titulo,detalhe,comprovacao,habito,mentalidade`)),
      j(await sb(`diario_bolso_entradas?user_id=eq.${userId}&select=tarefa_id,nota_pessoal`)),
    ]);
    const notasPorTarefa = Object.fromEntries(arr(entradas).filter((e) => e.nota_pessoal).map((e) => [e.tarefa_id, e.nota_pessoal]));
    const dias = diarioAgrupado(arr(tarefas), notasPorTarefa);
    const prompt = promptDoResumoSemanal(dias);
    if (!prompt) return res.status(200).json({ ok: false, error: 'Nada feito nessa semana ainda — nada pra resumir.' });

    const ia = await resolverIACompartilhada();
    if (!ia) return res.status(200).json({ ok: false, needs_key: true, error: 'IA não conectada (configure ANTHROPIC_API_KEY ou AI_GATEWAY_API_KEY).' });

    let resposta;
    try {
      resposta = await clienteIA(ia).messages.create({
        model: ia.model, max_tokens: 800,
        system: sistemaDoResumoSemanal(),
        messages: [{ role: 'user', content: prompt }],
        output_config: { format: { type: 'json_schema', schema: SCHEMA_RESUMO_SEMANAL } },
        ...opcoesDeReserva(ia),
      });
    } catch (e) {
      const d = detalhesDoErro(e);
      console.error('[diarioResumoSemanal] IA falhou', { via: ia.via, model: ia.model, ...d });
      return res.status(200).json({ ok: false, error: 'IA indisponível agora — tenta de novo em instantes.', details: d });
    }

    if (resposta.stop_reason === 'refusal') return res.status(200).json({ ok: false, error: 'A IA não pôde gerar o resumo desta semana.' });
    const texto = (resposta.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    let resumo = null;
    try { resumo = JSON.parse(texto)?.resumo || null; } catch { resumo = null; }
    if (!resumo) {
      console.error('[diarioResumoSemanal] sem JSON válido', { stop_reason: resposta.stop_reason, tamanho: texto.length });
      return res.status(200).json({ ok: false, error: resposta.stop_reason === 'max_tokens' ? 'A resposta foi cortada' : 'A IA não devolveu um resumo válido' });
    }

    const gravar = await fetch(`${SUPABASE_URL}/rest/v1/diario_bolso_semanas?on_conflict=user_id,semana_inicio`, {
      method: 'POST',
      headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: userId, semana_inicio: semanaInicio, resumo, model: resposta.model, gerado_em: new Date().toISOString() }),
    });
    if (!gravar.ok) console.error('[diarioResumoSemanal] não gravou o resumo', gravar.status, await gravar.text().catch(() => ''));

    return res.status(200).json({ ok: true, resumo, model: resposta.model, via: ia.via });
  } catch (e) {
    console.error('[diarioResumoSemanal] erro inesperado', String(e?.message || e));
    return res.status(200).json({ ok: false, error: 'Erro ao gerar o resumo' });
  }
}
