// 🆘 TIRA DÚVIDAS 24h — o atendimento da gamificação (07/09/2026).
//
// POST → { pergunta, imagem_url?, entrada?, pagina?, usuario_id?, usuario_nome?, transcricao? }
//        ← { ok, resposta, tipo, prioridade, titulo, confianca, chamado_id }
// GET  → saúde: { ok, ia, tem_chave, model, via } — "tem chave" ≠ "IA funciona",
//        lição do xgameValidarPrint, que dizia "IA ligada" enquanto toda
//        comprovação caía em indisponível.
//
// DUAS COISAS QUE NÃO SÃO DETALHE:
//  1. A ficha de regras vem de src/lib/tiraDuvidas.js, montada das constantes
//     de verdade do X-GAME. Prompt com número copiado à mão envelhece calado.
//  2. O chamado é GRAVADO mesmo quando a IA falha. Atendimento que perde o
//     relato porque o modelo caiu é pior do que não ter atendimento: a pessoa
//     contou o problema e ninguém ficou sabendo.
import * as z from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { resolverIA as resolverIACompartilhada, clienteIA, opcoesDeReserva, detalhesDoErro } from '../_lib/ia.js';
import {
  sistemaDoAtendente, validarChamado, normalizarTipo, normalizarPrioridade,
  tituloDoChamado, TIPOS, LIMITE_PERGUNTA,
} from '../../src/lib/tiraDuvidas.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

// mesmos modelos do validador de print: precisa enxergar imagem
const MODEL_DIRETO = process.env.AI_MODEL_VISION_ANTHROPIC || 'claude-opus-5';
const MODEL_GATEWAY = process.env.AI_MODEL_VISION || 'anthropic/claude-opus-5';
const MODEL_GATEWAY_RESERVA = process.env.AI_MODEL_VISION_RESERVA || 'anthropic/claude-sonnet-5';

const resolverIA = () => resolverIACompartilhada({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY, reserva: MODEL_GATEWAY_RESERVA });

const Atendimento = z.object({
  resposta: z.string().describe('a resposta pra pessoa, em português simples, no máximo 5 frases curtas'),
  tipo: z.enum(TIPOS).describe('duvida quando é pergunta de uso/regra; bug, erro, correcao ou otimizacao quando é problema a resolver'),
  prioridade: z.number().describe('1 = para tudo (impede de trabalhar), 3 = normal, 5 = quando der'),
  titulo: z.string().describe('resumo de até 90 caracteres do caso, pro dono bater o olho na fila'),
  confianca: z.number().describe('0 a 100: o quanto você tem certeza da resposta. Abaixo de 60 admita a incerteza no texto'),
});

/** Grava o chamado. Nunca derruba a resposta: falhou o banco, o atendimento continua. */
async function gravar(linha) {
  if (!SUPABASE_URL || !SR) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/suporte_chamados`, {
      method: 'POST',
      headers: {
        apikey: SR, Authorization: `Bearer ${SR}`,
        'Content-Type': 'application/json', Prefer: 'return=representation',
      },
      body: JSON.stringify(linha),
      signal: AbortSignal.timeout(6000),
    });
    const j = await r.json().catch(() => null);
    return Array.isArray(j) && j[0]?.id ? j[0].id : null;
  } catch (e) {
    console.error('[tiraDuvidas] não gravou o chamado', String(e?.message || e));
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    const ia = await resolverIA();
    return res.status(200).json({ ok: true, ia: !!ia, tem_chave: !!ia, model: ia?.model || null, via: ia?.via || null });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const pergunta = String(body?.pergunta || '').trim().slice(0, LIMITE_PERGUNTA);
    const imagemUrl = String(body?.imagem_url || '').trim().slice(0, 2000);
    const temImagem = /^https?:\/\//.test(imagemUrl);

    const checagem = validarChamado({ pergunta, imagemUrl: temImagem ? imagemUrl : '' });
    if (!checagem.valido) return res.status(400).json({ ok: false, error: checagem.motivo });

    const base = {
      usuario_id: String(body?.usuario_id || '').slice(0, 120) || null,
      usuario_nome: String(body?.usuario_nome || '').slice(0, 120) || null,
      entrada: ['texto', 'audio', 'imagem'].includes(body?.entrada) ? body.entrada : 'texto',
      pergunta: pergunta || '(só imagem)',
      transcricao: String(body?.transcricao || '').slice(0, LIMITE_PERGUNTA) || null,
      imagem_url: temImagem ? imagemUrl : null,
      pagina: String(body?.pagina || '').slice(0, 200) || null,
    };

    const ia = await resolverIA();
    if (!ia) {
      // 🔒 SEM IA O RELATO NÃO SE PERDE. Grava como dúvida aberta e diz a
      // verdade — não finge uma resposta genérica.
      const id = await gravar({ ...base, titulo: tituloDoChamado('', pergunta), tipo: 'duvida', resposta: null });
      return res.status(200).json({
        ok: true, ia: false, chamado_id: id,
        resposta: 'O atendimento automático está fora do ar agora, mas eu guardei o seu recado — o time vai ver.',
        tipo: 'duvida', prioridade: 3, titulo: base.pergunta.slice(0, 90), confianca: 0,
      });
    }

    const conteudo = [
      { type: 'text', text: `${pergunta || 'A pessoa mandou só a imagem, sem escrever nada. Olhe o print e diga o que está acontecendo.'}${base.pagina ? `\n\n(a pessoa estava em: ${base.pagina})` : ''}` },
      ...(temImagem ? [{ type: 'image', source: { type: 'url', url: imagemUrl } }] : []),
    ];

    let resposta;
    try {
      resposta = await clienteIA(ia).messages.parse({
        model: ia.model,
        max_tokens: 1500,
        system: sistemaDoAtendente(),
        messages: [{ role: 'user', content: conteudo }],
        output_config: { format: zodOutputFormat(Atendimento), effort: 'medium' },
        ...opcoesDeReserva(ia),
      });
    } catch (e) {
      const d = detalhesDoErro(e);
      console.error('[tiraDuvidas] IA falhou', { via: ia.via, model: ia.model, ...d });
      const id = await gravar({ ...base, titulo: tituloDoChamado('', pergunta), tipo: 'duvida', resposta: null });
      return res.status(200).json({
        ok: true, ia: false, chamado_id: id,
        resposta: 'Não consegui responder agora — mas o seu recado ficou registrado e o time vai olhar.',
        tipo: 'duvida', prioridade: 3, titulo: base.pergunta.slice(0, 90), confianca: 0,
      });
    }

    const out = resposta.parsed_output;
    if (resposta.stop_reason === 'refusal' || !out) {
      const id = await gravar({ ...base, titulo: tituloDoChamado('', pergunta), tipo: 'duvida', resposta: null });
      return res.status(200).json({
        ok: true, ia: false, chamado_id: id,
        resposta: 'Não consegui analisar esse caso automaticamente — registrei pro time olhar.',
        tipo: 'duvida', prioridade: 3, titulo: base.pergunta.slice(0, 90), confianca: 0,
      });
    }

    const tipo = normalizarTipo(out.tipo);
    const prioridade = normalizarPrioridade(out.prioridade);
    const titulo = tituloDoChamado(out.titulo, pergunta);
    const confianca = Math.max(0, Math.min(100, Math.round(Number(out.confianca) || 0)));
    const texto = String(out.resposta || '').slice(0, 2000);

    const id = await gravar({ ...base, resposta: texto, titulo, tipo, prioridade, confianca });

    return res.status(200).json({
      ok: true, ia: true, model: resposta.model, via: ia.via,
      chamado_id: id, resposta: texto, tipo, prioridade, titulo, confianca,
    });
  } catch (e) {
    console.error('[tiraDuvidas] erro', String(e?.message || e));
    return res.status(200).json({ ok: false, error: 'Falha no atendimento', resposta: 'Deu um erro aqui do meu lado. Tenta de novo em instantes.' });
  }
}
