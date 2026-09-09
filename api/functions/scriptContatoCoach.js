// scriptContatoCoach — a "dica" (e agora também o VALIDADOR) do Hábito 4
// (Contato e Convite), DIR-112 (09/09/2026).
//
// Dono, ao vivo (1ª rodada): "tem que ter um validador do também pra tu
// ajudá-lo, entendeu? Não escrever pra ele, mas ajudá-lo." Cada um escreve o
// PRÓPRIO script (metodo.js, Hábito 4) — esta rota NUNCA reescreve o script
// da pessoa.
//
// Dono, ao vivo (2ª rodada, depois de ver o ponto automático): "você só vai
// dar um ponto quando você conferir, como se fosse uma validação... se o
// script estiver bom, aí você vai fixar e dar esse ponto." O ponto de
// gamificação SAIU do simples "escreveu 20 caracteres" (CrmMetodo.jsx) e
// passou a depender do `aprovado` que esta rota devolve — a mesma IA que dá
// a dica agora também é o portão do ponto, no mesmo pedido, sem duplicar
// chamada.
//
// GET  → health check: {ok, ia, tem_chave, model, via}.
// POST → {script} → {aprovado, dica, pontos_fortes} ou {ia_indisponivel:true, details}.
import * as z from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { resolverIA as resolverIACompartilhada, clienteIA, opcoesDeReserva, detalhesDoErro } from '../_lib/ia.js';

// texto puro, sem imagem: os mesmos modelos de texto usados no restante da
// X-GAME (não precisa da variante de visão).
const MODEL_DIRETO = process.env.AI_MODEL_TEXTO_ANTHROPIC || 'claude-opus-5';
const MODEL_GATEWAY = process.env.AI_MODEL_TEXTO || 'anthropic/claude-opus-5';
const MODEL_GATEWAY_RESERVA = process.env.AI_MODEL_TEXTO_RESERVA || 'anthropic/claude-sonnet-5';

const resolverIA = () => resolverIACompartilhada({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY, reserva: MODEL_GATEWAY_RESERVA });

const LIMITE_SCRIPT = 4000;

const Dica = z.object({
  aprovado: z.boolean().describe('true SOMENTE se o script já está bom o suficiente pra valer o ponto de gamificação: personalização de verdade (usa {nome} ou é claramente sob medida pra uma pessoa, não genérico de robô), clareza do que está sendo oferecido, convite objetivo (dia/hora ou "topa conversar?"), tamanho suficiente pra ser um script de verdade. Na dúvida, false — reprovar sem querer custa uma dica; aprovar sem merecer custa a credibilidade do ponto.'),
  pontos_fortes: z.string().describe('1 frase curta reconhecendo o que já está bom no script — nunca vazio, nunca genérico'),
  dica: z.string().describe('2 a 3 observações curtas em português simples, cada uma fechando com o que fazer — nunca reescreva o script inteiro, só aponte o que melhorar. Se aprovado=true, ainda assim traga 1 observação pra próxima evolução (o script pode sempre melhorar, mesmo já valendo o ponto).'),
});

// mesmo espírito socrático do validador de comprovações (xgameValidarPrint):
// treinador E validador ao mesmo tempo — faz a pessoa pensar no PRÓPRIO
// texto em vez de entregar pronto, mas também decide se already vale o ponto.
const SISTEMA = `Você é o TREINADOR e o VALIDADOR de scripts de convite do Hábito 4 (Contato e Convite) da X-GAME (Leilão no Zap). Cada pessoa escreve o PRÓPRIO script — você NUNCA reescreve por ela, NUNCA entrega um script pronto pra copiar. Seu trabalho tem duas partes: (1) decidir se o script JÁ está bom o suficiente pra valer o ponto de gamificação daquela pessoa (campo aprovado) e (2) devolver observações curtas, em português simples, que a façam pensar e melhorar com as PRÓPRIAS palavras — aprovado ou não.

O que um bom script de convite tem: personalização de verdade (usa {nome} ou mostra que fala com uma pessoa específica, não uma mensagem genérica de robô), clareza sobre o que está oferecendo, um convite objetivo (dia/hora ou "topa conversar?"), tom natural — como a própria pessoa fala, não um discurso decorado. Um rascunho de uma frase, copiado sem nenhuma personalização, ou sem convite nenhum NÃO aprova.

TOM: sempre comece reconhecendo algo que já está bom (pontos_fortes nunca fica vazio nem genérico — cite algo específico do texto dela). Na dica, use perguntas que abrem reflexão ("Se você recebesse essa mensagem sem conhecer quem mandou, ia entender o que está sendo oferecido?") fechando sempre com uma instrução direta do que ajustar. Nunca seja seco, nunca corrija como quem tira nota — reprovar É dar uma instrução clara do que falta, não uma sentença.`;

const indisponivel = (res, details, motivo = 'IA indisponível agora — tente de novo em instantes.') =>
  res.status(200).json({ ok: true, ia_indisponivel: true, aprovado: false, pontos_fortes: '', dica: motivo, details });

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') {
    const ia = await resolverIA();
    return res.status(200).json({ ok: true, ia: Boolean(ia), tem_chave: Boolean(ia), model: ia?.model || MODEL_GATEWAY, via: ia?.via || null });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const script = String(body?.script || '').trim().slice(0, LIMITE_SCRIPT);
    if (script.length < 15) return res.status(400).json({ ok: false, error: 'Escreva um pouco mais do script antes de pedir a dica.' });

    const ia = await resolverIA();
    if (!ia) return indisponivel(res, { status: 0, tipo: 'sem_chave', mensagem: 'nem ANTHROPIC_API_KEY nem AI_GATEWAY_API_KEY configuradas' }, 'IA não conectada — configure a chave da Anthropic ou do AI Gateway.');

    let resposta;
    try {
      resposta = await clienteIA(ia).messages.parse({
        model: ia.model,
        max_tokens: 800,
        system: [{ type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `O SCRIPT QUE A PESSOA ESCREVEU:\n"""\n${script}\n"""` }],
        output_config: { format: zodOutputFormat(Dica), effort: 'medium' },
        ...opcoesDeReserva(ia),
      });
    } catch (e) {
      const d = detalhesDoErro(e);
      console.error('[scriptContatoCoach] IA falhou', { via: ia.via, model: ia.model, ...d });
      return indisponivel(res, { via: ia.via, model: ia.model, ...d });
    }

    const out = resposta.parsed_output;
    if (resposta.stop_reason === 'refusal' || !out) {
      return res.status(200).json({ ok: true, aprovado: false, pontos_fortes: '', dica: 'A IA não conseguiu olhar o script agora — tenta de novo em instantes?' });
    }
    // 🐛 09/09/2026 — achado na auditoria pré-publicação: esta resposta
    // esquecia o campo `aprovado` — o front sempre lia `undefined` e tratava
    // como reprovado, então NINGUÉM jamais ganhava o ponto do script,
    // mesmo escrevendo um script perfeito. É o contrato documentado no
    // topo do arquivo (POST → {aprovado, dica, pontos_fortes}) e o schema
    // Zod (`Dica`) já garantia que `out.aprovado` sempre existe — só faltava
    // devolver.
    return res.status(200).json({ ok: true, aprovado: out.aprovado, pontos_fortes: out.pontos_fortes, dica: out.dica });
  } catch (e) {
    console.error('[scriptContatoCoach] erro geral', String(e?.message || e));
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
}
