// xgameValidarPrint — O VALIDADOR DE COMPROVAÇÕES DA X-GAME (F10.2 → DIR-84 → DIR-84.2).
// A IA de visão olha o print/foto SABENDO qual tarefa está sendo comprovada
// e responde: aprovada / reprovada / duvida + o que viu + (se dúvida) a
// pergunta pra pessoa.
// GET  → health check: {ok, ia, tem_chave, model}; com ?ping=1 faz uma
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
// regex; entra o SDK oficial da Anthropic apontado pro MESMO AI Gateway da
// Vercel (a Vercel documenta exatamente isso: baseURL ai-gateway.vercel.sh +
// AI_GATEWAY_API_KEY), com Claude Opus 5 e SAÍDA ESTRUTURADA — o JSON volta
// no formato certo por contrato, não por sorte. A chave é a mesma de sempre.
// Modelo reserva no gateway se o principal cair (sobrecarga, indisponível).
//
// A régua de QUANDO pedir justificativa / quando bloquear / quando só então
// acionar o gestor mora em src/lib/xgameValidacao.js (pura, testada). Esta
// função só OLHA e RESPONDE — e quando NÃO consegue olhar, DIZ (ia_indisponivel)
// em vez de fingir dúvida.
import Anthropic from '@anthropic-ai/sdk';
// o helper do SDK fala zod v4 (`zod/v4`, que o zod 3.25+ já exporta); schema
// feito com o `zod` v3 chega sem `.def` e quebra ANTES de chamar a IA
import * as z from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const AI_KEY = process.env.AI_GATEWAY_API_KEY || '';
const OIDC = process.env.VERCEL_OIDC_TOKEN || '';
// o AI Gateway da Vercel fala a Messages API da Anthropic neste endereço
const GATEWAY = 'https://ai-gateway.vercel.sh';
// modelo de visão principal e o reserva (fallback DO GATEWAY, não da Anthropic:
// a requisição passa pelo gateway, então é ele quem redireciona se o
// principal falhar). Troque via env sem mexer no código.
const MODEL = process.env.AI_MODEL_VISION || 'anthropic/claude-opus-5';
const MODEL_RESERVA = process.env.AI_MODEL_VISION_RESERVA || 'anthropic/claude-sonnet-5';

// 🔐 Sem env? A chave pode morar no COFRE do banco (app_segredos, RLS sem
// policy — só o service role lê). Cache de 5 min pra não bater no banco toda hora.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
let _cacheChave = { valor: null, ate: 0 };
async function chaveDaIA() {
  if (AI_KEY || OIDC) return AI_KEY || OIDC;
  if (_cacheChave.ate > Date.now()) return _cacheChave.valor;
  let valor = null;
  try {
    if (SUPABASE_URL && SR) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/app_segredos?id=eq.ai_gateway_key&select=valor&limit=1`, {
        headers: { apikey: SR, Authorization: `Bearer ${SR}` },
        signal: AbortSignal.timeout(5000),
      });
      const j = await r.json().catch(() => []);
      valor = Array.isArray(j) && j[0]?.valor ? String(j[0].valor) : null;
    }
  } catch { valor = null; }
  _cacheChave = { valor, ate: Date.now() + 5 * 60 * 1000 };
  return valor;
}

function clienteIA(auth) {
  // maxRetries 1: o SDK já refaz 429/5xx/queda de rede uma vez; mais que isso
  // estoura o tempo da função com a pessoa esperando no celular.
  return new Anthropic({ apiKey: auth, baseURL: GATEWAY, timeout: 40_000, maxRetries: 1 });
}

// o erro do SDK vira um `details` legível pra tela e pro log — e o motivo
// certo: 404 é modelo que não existe (foi o caso do gemini), 401/403 é chave,
// 429 é limite, 5xx/529 é a IA fora, rede é rede.
function detalhesDoErro(e) {
  if (e instanceof Anthropic.APIConnectionError) return { status: 0, tipo: 'rede', mensagem: String(e.message || '').slice(0, 300) };
  if (e instanceof Anthropic.APIError) return { status: e.status ?? 0, tipo: e.type || e.name || 'api', mensagem: String(e.message || '').slice(0, 300) };
  return { status: 0, tipo: 'desconhecido', mensagem: String(e?.message || e).slice(0, 300) };
}

// 🩺 PING — chamada mínima (só texto) ao modelo, pelo MESMO caminho da
// validação. "Tem chave" ≠ "a IA funciona": foi assim que a tela disse "IA
// ligada" enquanto toda comprovação caía em "IA indisponível".
async function pingModelo(auth) {
  try {
    const m = await clienteIA(auth).messages.create({
      model: MODEL, max_tokens: 16,
      messages: [{ role: 'user', content: 'responda só: ok' }],
    });
    return { status: 200, ok: true, model: m.model };
  } catch (e) {
    const d = detalhesDoErro(e);
    console.error('[xgameValidarPrint] ping falhou', { model: MODEL, ...d });
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
    const chave = await chaveDaIA();
    const querPing = String(req.query?.ping || '') === '1';
    const ping = chave && querPing ? await pingModelo(chave) : undefined;
    // `ia` só é true quando o modelo RESPONDEU (se pediu ping); sem ping, é só "tem chave"
    return res.status(200).json({ ok: true, ia: ping ? ping.ok : Boolean(chave), tem_chave: Boolean(chave), model: MODEL, ...(ping ? { ping } : {}) });
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

    const auth = await chaveDaIA();
    if (!auth) return indisponivel(res, { status: 0, tipo: 'sem_chave', mensagem: 'AI_GATEWAY_API_KEY ausente' }, 'IA não conectada — configure a chave do AI Gateway.');

    const contexto = `TAREFA COMPROVADA: "${titulo}"${hora ? ` (horário da tarefa: ${hora})` : ''}${data ? `. HOJE É ${data}` : ''}.
${REGRAS_POR_TIPO[tipo] || REGRAS_POR_TIPO.foto}
${CRUZAMENTO}${resumo ? `\nRESUMO DIGITADO PELA PESSOA: "${resumo}"` : ''}${imagensAnteriores.length ? `\n\nA PRIMEIRA imagem anexada é a comprovação de HOJE, a ser julgada. As ${imagensAnteriores.length} seguinte(s) são comprovações ANTERIORES da MESMA pessoa pro MESMO tipo de tarefa — use-as SÓ pra checar reciclagem, não para julgar a tarefa de hoje.` : '\n\nA imagem anexada é a comprovação de HOJE, a ser julgada.'}${justificativa ? `\n\nESTA É A SEGUNDA ANÁLISE: na primeira você teve dúvida e perguntou; a pessoa respondeu: "${justificativa}". Decida agora considerando a explicação dela — se a justificativa é plausível e coerente com a imagem, aprove; se ainda não convence ou é evasiva, responda "duvida" de novo, com pergunta_para_pessoa vazia (isso já vai pra análise do gestor).` : ''}`;

    const conteudo = [
      { type: 'text', text: contexto },
      { type: 'image', source: { type: 'url', url: imageUrl } },
      ...imagensAnteriores.map((u) => ({ type: 'image', source: { type: 'url', url: u } })),
    ];

    let resposta;
    try {
      resposta = await clienteIA(auth).messages.parse({
        model: MODEL,
        max_tokens: 2000,
        system: SISTEMA,
        messages: [{ role: 'user', content: conteudo }],
        output_config: { format: zodOutputFormat(Veredito) },
        // extensão do AI Gateway: se o modelo principal falhar, ele tenta o reserva
        providerOptions: { gateway: { models: [MODEL_RESERVA] } },
      });
    } catch (e) {
      const d = detalhesDoErro(e);
      console.error('[xgameValidarPrint] IA falhou', { model: MODEL, ...d });
      return indisponivel(res, { model: MODEL, ...d });
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
