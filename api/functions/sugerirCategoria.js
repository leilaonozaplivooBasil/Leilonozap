// 🏷️ SUGERIR CATEGORIA — a IA lê a descrição e propõe a categoria (08/09/2026).
//
// POST → { descricao }            ← { ok, category_id, name, confianca, ia }
// GET  → saúde: { ok, ia, model, via }
//
// POR QUE EXISTE
// Em 08/09 fechamos o cadastro: produto não salva mais sem categoria. Exigir sem
// ajudar só empurraria o trabalho pro operador — que foi como o passivo de 948
// produtos sem categoria se formou. Esta rota é a outra metade da regra.
//
// TRÊS DECISÕES QUE NÃO SÃO DETALHE:
//  1. AS CATEGORIAS VÊM DO BANCO, não de lista escrita no prompt. Lista à mão
//     envelhece calada no dia em que alguém cria uma categoria — e o modelo
//     passa a devolver um nome que não existe.
//  2. NOME FORA DA LISTA VIRA NADA. `escolhaValida` recusa categoria inventada.
//     Preferimos devolver vazio a devolver um id errado: categoria errada é
//     dano escondido, categoria vazia a própria tela já mostra.
//  3. FALHA DA IA NÃO TRAVA O CADASTRO. Sem chave, sem crédito ou fora do ar,
//     devolve ok:true com ia:false e a pessoa escolhe à mão, como hoje.
import * as z from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { resolverIA as resolverIACompartilhada, clienteIA, opcoesDeReserva, detalhesDoErro } from '../_lib/ia.js';
import {
  sistemaDoClassificador, escolhaValida, LIMITE_DESCRICAO, CONFIANCA_MINIMA,
} from '../../src/lib/sugestaoDeCategoria.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Texto curto e decisão simples: não precisa do modelo grande.
const MODEL_DIRETO = process.env.AI_MODEL_TEXTO_ANTHROPIC || 'claude-sonnet-5';
const MODEL_GATEWAY = process.env.AI_MODEL_TEXTO || 'anthropic/claude-sonnet-5';
const MODEL_GATEWAY_RESERVA = process.env.AI_MODEL_TEXTO_RESERVA || 'anthropic/claude-opus-5';

const resolverIA = () => resolverIACompartilhada({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY, reserva: MODEL_GATEWAY_RESERVA });

const Escolha = z.object({
  categoria: z.string().describe('o NOME EXATO de uma categoria da lista, ou vazio quando a descrição não diz o que o produto é'),
  confianca: z.number().describe('0 a 100'),
});

// As categorias mudam pouco; buscar a cada tecla seria desperdício.
let _cache = { valor: null, ate: 0 };

/** Categorias principais e ativas — as mesmas que a Gestão de Estoque oferece. */
async function categoriasDoBanco() {
  if (_cache.ate > Date.now() && _cache.valor) return _cache.valor;
  if (!SUPABASE_URL || !SR) return [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/categories?select=id,name&parent_category_id=is.null&is_active=is.true&order=name`,
      { headers: { apikey: SR, Authorization: `Bearer ${SR}` }, signal: AbortSignal.timeout(6000) },
    );
    const j = await r.json().catch(() => null);
    const lista = Array.isArray(j) ? j.filter((c) => c?.id && c?.name) : [];
    if (lista.length) _cache = { valor: lista, ate: Date.now() + 5 * 60 * 1000 };
    return lista;
  } catch (e) {
    console.error('[sugerirCategoria] não li as categorias', String(e?.message || e));
    return [];
  }
}

/** Resposta de "não deu" — sempre 200: a tela segue funcionando sem a sugestão. */
const semSugestao = (res, motivo) =>
  res.status(200).json({ ok: true, ia: false, category_id: null, name: null, confianca: 0, motivo });

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    const ia = await resolverIA();
    const cats = await categoriasDoBanco();
    return res.status(200).json({ ok: true, ia: !!ia, model: ia?.model || null, via: ia?.via || null, categorias: cats.length });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const descricao = String(body?.descricao || '').trim().slice(0, LIMITE_DESCRICAO);
    // Duas palavras não classificam nada. Não gasta chamada.
    if (descricao.length < 8) return semSugestao(res, 'descricao_curta');

    const categorias = await categoriasDoBanco();
    if (!categorias.length) return semSugestao(res, 'sem_categorias');

    const ia = await resolverIA();
    if (!ia) return semSugestao(res, 'sem_chave');

    let resposta;
    try {
      resposta = await clienteIA(ia, { timeout: 15_000 }).messages.parse({
        model: ia.model,
        max_tokens: 300,
        system: sistemaDoClassificador(categorias),
        messages: [{ role: 'user', content: descricao }],
        output_config: { format: zodOutputFormat(Escolha), effort: 'low' },
        ...opcoesDeReserva(ia),
      });
    } catch (e) {
      const d = detalhesDoErro(e);
      console.error('[sugerirCategoria] IA falhou', { via: ia.via, model: ia.model, ...d });
      return semSugestao(res, 'ia_falhou');
    }

    const out = resposta.parsed_output;
    if (resposta.stop_reason === 'refusal' || !out) return semSugestao(res, 'sem_resposta');

    const escolha = escolhaValida(out.categoria, categorias);
    if (!escolha) return semSugestao(res, 'categoria_desconhecida');

    const confianca = Math.max(0, Math.min(100, Number(out.confianca) || 0));
    return res.status(200).json({
      ok: true, ia: true,
      category_id: escolha.category_id,
      name: escolha.name,
      confianca,
      conferir: confianca < CONFIANCA_MINIMA,
    });
  } catch (e) {
    console.error('[sugerirCategoria] erro', String(e?.message || e));
    return semSugestao(res, 'erro');
  }
}
