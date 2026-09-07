// xgameValidarPrint — O VALIDADOR DE COMPROVAÇÕES DA X-GAME (F10.2 → DIR-84 → DIR-84.2).
// A IA de visão olha o print/foto SABENDO qual tarefa está sendo comprovada
// e responde: aprovada / reprovada / duvida + o que viu + (se dúvida) a
// pergunta pra pessoa.
// GET  → health check: {ok, ia, tem_chave, model, via}; com ?ping=1 faz uma
//        chamada REAL ao modelo e devolve {ping:{ok,status,corpo}}.
// POST → {image_url, tipo, titulo, hora, data, imagens_anteriores?, justificativa?, tentativa?}
//     → {veredito, confianca, o_que_viu, motivo, pergunta_para_pessoa}
//        ou {ia_indisponivel:true, details} quando a IA não respondeu.
//
// 🤖 DIR-84 (07/09/2026) — ordem do dono: "ela tem que ser o maior validador
// do caralho, ela tem que cruzar imagem, ela tem que pensar — se a pessoa
// comprova um pré-treino com foto na cama ou bebendo água, ela pergunta pra
// pessoa justificar ANTES de validar. Intervenção humana zero: ela tem que
// ser mais foda que humano." Aqui: CRUZAMENTO explícito tarefa×imagem e
// ANTI-RECICLAGEM visual (as últimas fotos da pessoa vêm junto).
//
// 🔁 DIR-84.2 — A TROCA DE IA. O ping real (DIR-84.1) mostrou a causa de
// toda comprovação cair em "indisponível": HTTP 404 model_not_found — o
// `google/gemini-2.0-flash` foi descontinuado no gateway e a função engolia
// o erro. Sai o chat/completions "compatível com OpenAI" com JSON raspado por
// regex; entra o SDK oficial da Anthropic com Claude Opus 5 e SAÍDA
// ESTRUTURADA — o JSON volta no formato certo por contrato, não por sorte.
//
// DOIS CAMINHOS pra chegar no Claude, escolhidos pela chave que existir (sem
// mexer em código nem redeploy):
//   1. ANTHROPIC_API_KEY (env ou cofre `anthropic_api_key`) → api.anthropic.com
//      direto. Prioridade quando existe.
//   2. AI_GATEWAY_API_KEY (env ou cofre `ai_gateway_key`) → o MESMO AI Gateway
//      da Vercel de sempre, que fala a Messages API (baseURL
//      ai-gateway.vercel.sh, caminho documentado pela Vercel) — MAS exige
//      créditos pagos no gateway: no free tier o Claude devolve 403
//      "Free tier users do not have access to this model" (foi o que o ping
//      mostrou em 07/09). Modelo reserva do gateway (claude-sonnet-5) se o
//      principal cair.
//
// A régua de QUANDO pedir justificativa / quando bloquear / quando só então
// acionar o gestor mora em src/lib/xgameValidacao.js (pura, testada). Esta
// função só OLHA e RESPONDE — e quando NÃO consegue olhar, DIZ (ia_indisponivel)
// em vez de fingir dúvida.
// o helper do SDK fala zod v4 (`zod/v4`, que o zod 3.25+ já exporta); schema
// feito com o `zod` v3 chega sem `.def` e quebra ANTES de chamar a IA
import * as z from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
// o acesso à IA (chave, caminho, erros) é compartilhado com o InvokeLLM — DIR-84.5
import { resolverIA as resolverIACompartilhada, clienteIA, opcoesDeReserva, detalhesDoErro } from '../_lib/ia.js';

// modelos: pelo gateway levam o prefixo do provedor; direto na Anthropic, não.
const MODEL_DIRETO = process.env.AI_MODEL_VISION_ANTHROPIC || 'claude-opus-5';
const MODEL_GATEWAY = process.env.AI_MODEL_VISION || 'anthropic/claude-opus-5';
const MODEL_GATEWAY_RESERVA = process.env.AI_MODEL_VISION_RESERVA || 'anthropic/claude-sonnet-5';

/** Qual IA usar agora: { via, apiKey, model, reserva } — ou null sem chave. */
const resolverIA = () => resolverIACompartilhada({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY, reserva: MODEL_GATEWAY_RESERVA });

// 🩺 PING — chamada mínima (só texto) ao modelo, pelo MESMO caminho da
// validação. "Tem chave" ≠ "a IA funciona": foi assim que a tela disse "IA
// ligada" enquanto toda comprovação caía em "IA indisponível".
const PingSaida = z.object({ ok: z.string().describe('escreva exatamente: ok') });
async function pingModelo(ia) {
  try {
    // a MESMA forma da validação real (saída estruturada + effort + system com
    // cache_control), só sem imagem: se o gateway recusar qualquer parte dessa
    // forma, é AQUI que aparece — não na primeira pessoa comprovando de manhã.
    const m = await clienteIA(ia).messages.parse({
      model: ia.model, max_tokens: 64,
      system: [{ type: 'text', text: 'Você é um health check. Responda só o que for pedido.', cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: 'responda só: ok' }],
      output_config: { format: zodOutputFormat(PingSaida), effort: 'medium' },
    });
    return { status: 200, ok: true, model: m.model, saida: m.parsed_output?.ok ?? null };
  } catch (e) {
    const d = detalhesDoErro(e);
    console.error('[xgameValidarPrint] ping falhou', { via: ia.via, model: ia.model, ...d });
    return { status: d.status, ok: false, corpo: `${d.tipo}: ${d.mensagem}` };
  }
}

// 📐 O CONTRATO DA RESPOSTA — saída estruturada: o modelo é obrigado a
// devolver exatamente isto. Não existe mais "a IA respondeu fora do formato".
const Veredito = z.object({
  veredito: z.enum(['aprovada', 'reprovada', 'duvida']),
  confianca: z.number().describe('0 a 100'),
  o_que_viu: z.string().describe('descrição curta e objetiva do que a imagem mostra'),
  motivo: z.string().describe('explicação curta e PEDAGÓGICA em pt-BR; se reprovar, diga exatamente o que faltou e como corrigir'),
  pergunta_para_pessoa: z.string().describe('SÓ quando veredito=duvida por incoerência: uma pergunta curta e específica pra pessoa se explicar, citando o que você viu; string vazia nos outros casos'),
});

const REGRAS_POR_TIPO = {
  instagram: `A tarefa exige comprovação VISUAL de que foi cumprida AGORA (não vale coisa antiga). ACEITE apenas um destes três:
1. PRINT de um post/story do Instagram coerente com a tarefa (ex.: "bom dia" pra tarefa de acordar), de preferência com horário visível na barra do celular ou no story;
2. PRINT de uma conversa/grupo (WhatsApp) com a mensagem coerente com a tarefa e a DATA DE HOJE visível;
3. FOTO REAL da pessoa executando a tarefa (ex.: acordada, fora da cama, treinando, no ambiente de trabalho) — foto nítida, ambiente real.
REPROVE: imagem aleatória, meme, foto de banco de imagens, tela apagada/preta, print ilegível, print claramente de outro dia (data antiga visível), foto de pessoa dormindo/na cama pra tarefa de acordar.
Se a imagem é plausível mas não dá pra cravar (sem data visível, qualidade baixa), responda "duvida".`,
  aprendizado: `A comprovação esperada tem DUAS partes: (1) foto/print relacionado a leitura ou estudo (página do livro, anotação, tela do curso) e (2) o RESUMO que a pessoa digitou. Reprove imagem sem nenhuma relação com estudo. Se o resumo digitado for claramente incoerente com a imagem, genérico demais (ex.: "aprendi muito hoje") ou parecer texto copiado de sinopse/internet em vez das palavras da própria pessoa, responda "duvida" e explique. Na incerteza, "duvida".`,
  foto: `A comprovação esperada é uma FOTO REAL da pessoa/do ambiente executando a tarefa AGORA (ex.: treinando, organizando a sala, na reunião, na sala de treinamento, no caminho) OU um print claramente coerente com a tarefa.
REPROVE: imagem aleatória, meme, foto de banco de imagens, tela preta/apagada, imagem sem NENHUMA relação com a tarefa descrita.
Se a imagem é plausível mas não dá pra cravar a relação com a tarefa, responda "duvida".`,
  link: `A comprovação esperada é um LINK/ENDEREÇO que leva a algo real e coerente com a tarefa (ex.: link de um post, de um documento, de um endereço/localização). A imagem anexada é o PRINT desse link aberto — confira que a página/local realmente mostrado bate com o que a tarefa pede.
REPROVE: link quebrado, página em branco, print que não mostra conteúdo nenhum, conteúdo sem NENHUMA relação com a tarefa.
Se o link abre mas o conteúdo é ambíguo, responda "duvida".`,
};

// 🎯 CRUZAMENTO — DIR-84. Vale pra TODOS os tipos, além da regra específica
// acima: a IMAGEM tem que bater com o TÍTULO da tarefa, não só "parecer uma
// foto de gente fazendo algo". Exemplo do dono: tarefa de PRÉ-TREINO com foto
// da pessoa deitada na cama, ou só bebendo água sem nenhum sinal de
// treino (roupa de treino, academia, tênis, equipamento) — isso é
// INCOERÊNCIA, não aprova nem reprova de cara: PERGUNTA.
const CRUZAMENTO = `
CRUZAMENTO OBRIGATÓRIO (vale pra qualquer tipo de comprovação): a cena da
imagem precisa ser COERENTE com o título da tarefa — não basta "ter uma
pessoa" ou "ter uma foto". Exemplos de INCOERÊNCIA que você TEM que pegar:
tarefa de treino/pré-treino com foto da pessoa deitada, sonolenta, na cama,
ou só bebendo água sem NENHUM sinal de treino (roupa/ambiente/equipamento de
treino); tarefa de leitura com foto sem livro/tela/anotação nenhuma; tarefa
de reunião ou de trabalho (ex.: "Resolver: o financeiro") com foto de lazer,
de cama, de descanso. Quando notar incoerência REAL mas não tiver certeza
absoluta de má-fé, NÃO reprove de cara — responda "duvida" e preencha
"pergunta_para_pessoa" com uma pergunta CURTA, direta e específica pedindo
pra ela explicar a foto (cite o que você viu). Só reprove sem perguntar
quando a incoerência for GRITANTE e óbvia (imagem aleatória, meme, nada a
ver mesmo perguntando).

ANTI-RECICLAGEM: se vieram FOTOS ANTERIORES da mesma pessoa pra comparar,
olhe se a foto NOVA é a MESMA cena/imagem reaproveitada (mesmo que
recortada, comprimida, com filtro ou brilho diferente — reconheça a cena,
não só o arquivo). Se for reciclagem, isso é motivo de REPROVAÇÃO direta
(não precisa perguntar: reciclar prova antiga não tem explicação válida).`;

const SISTEMA = `Você é o VALIDADOR DE COMPROVAÇÕES da gamificação X-GAME (Leilão no Zap). O padrão é ALTO: intervenção humana deve ser rara, então você precisa ser mais rigoroso e mais atento do que um humano seria — mas justo: quem cumpriu de verdade tem que ser aprovado sem burocracia. Analise a imagem principal com cuidado antes de decidir.`;

const indisponivel = (res, details, motivo = 'IA indisponível agora — tente de novo em instantes.') =>
  res.status(200).json({ ok: true, ia_indisponivel: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo, pergunta_para_pessoa: '', details });

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') {
    const ia = await resolverIA();
    const querPing = String(req.query?.ping || '') === '1';
    const ping = ia && querPing ? await pingModelo(ia) : undefined;
    // `ia` só é true quando o modelo RESPONDEU (se pediu ping); sem ping, é só "tem chave"
    return res.status(200).json({
      ok: true, ia: ping ? ping.ok : Boolean(ia), tem_chave: Boolean(ia),
      model: ia?.model || MODEL_GATEWAY, via: ia?.via || null, ...(ping ? { ping } : {}),
    });
  }
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const imageUrl = String(body?.image_url || '').slice(0, 2000);
    const tipo = String(body?.tipo || 'instagram');
    const titulo = String(body?.titulo || '').slice(0, 200);
    const hora = String(body?.hora || '').slice(0, 5);
    const data = String(body?.data || '').slice(0, 10);
    const resumo = String(body?.resumo || '').slice(0, 1500);
    // 🤖 DIR-84 — fotos recentes da MESMA pessoa pro MESMO tipo de tarefa
    // (a tela monta essa lista com lib/xgameValidacao.imagensParaComparar),
    // pra cruzamento anti-reciclagem visual; e a justificativa da pessoa
    // quando esta é a SEGUNDA rodada (depois que a IA pediu explicação).
    const imagensAnteriores = (Array.isArray(body?.imagens_anteriores) ? body.imagens_anteriores : [])
      .map((u) => String(u || '').slice(0, 2000)).filter((u) => /^https?:\/\//.test(u)).slice(0, 4);
    const justificativa = String(body?.justificativa || '').slice(0, 800);
    const tentativa = Number(body?.tentativa) === 2 ? 2 : 1;
    if (!/^https?:\/\//.test(imageUrl)) return res.status(400).json({ ok: false, error: 'image_url obrigatório (http/https)' });

    const ia = await resolverIA();
    if (!ia) return indisponivel(res, { status: 0, tipo: 'sem_chave', mensagem: 'nem ANTHROPIC_API_KEY nem AI_GATEWAY_API_KEY configuradas' }, 'IA não conectada — configure a chave da Anthropic ou do AI Gateway.');

    // 💸 DIR-84.3 — CACHE: tudo que NÃO muda entre chamadas (papel + regra do
    // tipo + cruzamento, ~1,2 mil tokens) vai no `system` com cache_control;
    // a partir da 2ª chamada do mesmo tipo é cobrado a 10% (Opus 5 aceita a
    // partir de 512 tokens). O que muda (tarefa, resumo, justificativa) fica
    // na mensagem do usuário, DEPOIS do prefixo cacheado.
    // TODAS as regras de tipo vão no prefixo (não só a do tipo atual): assim o
    // prefixo é IDÊNTICO em toda chamada — uma entrada de cache só pra tudo,
    // e folgado acima do mínimo — e a mensagem diz qual regra vale agora.
    const tipoRegra = REGRAS_POR_TIPO[tipo] ? tipo : 'foto';
    const sistema = [{
      type: 'text',
      text: `${SISTEMA}\n\nREGRAS POR TIPO DE COMPROVAÇÃO (a mensagem diz qual tipo vale nesta análise):\n${Object.entries(REGRAS_POR_TIPO).map(([k, v]) => `\n[TIPO ${k}]\n${v}`).join('\n')}\n${CRUZAMENTO}`,
      cache_control: { type: 'ephemeral' },
    }];
    const contexto = `TIPO DE COMPROVAÇÃO: ${tipoRegra} — aplique a regra [TIPO ${tipoRegra}].
TAREFA COMPROVADA: "${titulo}"${hora ? ` (horário da tarefa: ${hora})` : ''}${data ? `. HOJE É ${data}` : ''}.${resumo ? `\nRESUMO DIGITADO PELA PESSOA: "${resumo}"` : ''}${imagensAnteriores.length ? `\n\nA PRIMEIRA imagem anexada é a comprovação de HOJE, a ser julgada. As ${imagensAnteriores.length} seguinte(s) são comprovações ANTERIORES da MESMA pessoa pro MESMO tipo de tarefa — use-as SÓ pra checar reciclagem, não para julgar a tarefa de hoje.` : '\n\nA imagem anexada é a comprovação de HOJE, a ser julgada.'}${justificativa ? `\n\nESTA É A SEGUNDA ANÁLISE: na primeira você teve dúvida e perguntou; a pessoa respondeu: "${justificativa}". Decida agora considerando a explicação dela — se a justificativa é plausível e coerente com a imagem, aprove; se ainda não convence ou é evasiva, responda "duvida" de novo, com pergunta_para_pessoa vazia (isso já vai pra análise do gestor).` : ''}`;

    const conteudo = [
      { type: 'text', text: contexto },
      { type: 'image', source: { type: 'url', url: imageUrl } },
      ...imagensAnteriores.map((u) => ({ type: 'image', source: { type: 'url', url: u } })),
    ];

    let resposta;
    try {
      resposta = await clienteIA(ia).messages.parse({
        model: ia.model,
        max_tokens: 2000,
        system: sistema,
        messages: [{ role: 'user', content: conteudo }],
        // effort medium: julgar uma foto contra uma regra não precisa do
        // raciocínio máximo — corta tokens de pensamento sem perder rigor.
        // (o thinking adaptativo do Opus 5 segue ligado por padrão)
        output_config: { format: zodOutputFormat(Veredito), effort: 'medium' },
        // extensão do AI Gateway: se o modelo principal falhar, ele tenta o reserva
        ...opcoesDeReserva(ia),
      });
    } catch (e) {
      const d = detalhesDoErro(e);
      console.error('[xgameValidarPrint] IA falhou', { via: ia.via, model: ia.model, ...d });
      return indisponivel(res, { via: ia.via, model: ia.model, ...d });
    }

    if (resposta.stop_reason === 'refusal') {
      // o modelo se recusou a analisar (raro numa foto de comprovação): não é
      // IA fora, é um caso que precisa de olho humano — dúvida sem pergunta
      console.warn('[xgameValidarPrint] refusal', resposta.stop_details);
      return res.status(200).json({ ok: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo: 'A IA não pôde analisar esta imagem — vai pra análise do gestor.', pergunta_para_pessoa: '' });
    }
    const out = resposta.parsed_output;
    if (!out) {
      console.error('[xgameValidarPrint] resposta sem parsed_output', { stop_reason: resposta.stop_reason });
      return res.status(200).json({ ok: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo: 'A IA não conseguiu concluir a análise — vai pra análise do gestor.', pergunta_para_pessoa: '' });
    }
    return res.status(200).json({
      ok: true,
      model: resposta.model,
      via: ia.via,
      veredito: out.veredito,
      confianca: Math.max(0, Math.min(100, Math.round(Number(out.confianca) || 0))),
      o_que_viu: String(out.o_que_viu || '').slice(0, 300),
      motivo: String(out.motivo || '').slice(0, 300),
      // 🔒 blindagem: a SEGUNDA rodada NUNCA gera pergunta nova — a régua
      // (lib/xgameValidacao.decisaoAposIA) manda pro gestor se ainda houver
      // dúvida, e é isso que garante UMA chance de se justificar, não um loop.
      pergunta_para_pessoa: tentativa === 2 || out.veredito !== 'duvida' ? '' : String(out.pergunta_para_pessoa || '').slice(0, 300),
    });
  } catch (e) {
    console.error('[xgameValidarPrint] erro inesperado', String(e?.message || e));
    return indisponivel(res, { status: 0, tipo: 'inesperado', mensagem: String(e?.message || e).slice(0, 200) });
  }
}
