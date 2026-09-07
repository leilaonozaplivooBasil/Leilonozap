// xgameValidarPrint — O VALIDADOR DE COMPROVAÇÕES DA X-GAME (F10.2 → DIR-84).
// A IA de visão olha o print/foto SABENDO qual tarefa está sendo comprovada
// e responde JSON: aprovada / reprovada / duvida + o que viu. Usa o MESMO
// gateway de IA do atendimento (AI_GATEWAY_API_KEY) com um modelo de visão.
// GET  → health check: {ok, ia} — a tela mostra se a IA está ligada.
// POST → {image_url, tipo, titulo, hora, data, imagens_anteriores?, justificativa?, tentativa?}
//     → {veredito, confianca, o_que_viu, motivo, pergunta_para_pessoa?}
// Sem chave ou IA fora do ar: degrada pra {veredito:'duvida'} — cai na fila
// manual do gestor, nada trava.
//
// 🤖 DIR-84 (07/09/2026) — ordem do dono: "ela tem que ser o maior validador
// do caralho, ela tem que cruzar imagem, ela tem que pensar — se a pessoa
// comprova um pré-treino com foto na cama ou bebendo água, ela pergunta pra
// pessoa justificar ANTES de validar. Intervenção humana zero: ela tem que
// ser mais foda que humano." Duas coisas novas nesta rodada:
// 1. CRUZAMENTO: o prompt agora exige coerência explícita entre o TÍTULO da
//    tarefa e o CONTEÚDO da imagem — não só "tem uma pessoa numa foto".
// 2. ANTI-RECICLAGEM VISUAL: o hash exato (lib/xgame.js) já barra o MESMO
//    arquivo de novo; aqui a IA recebe as últimas fotos da pessoa pro MESMO
//    tipo de tarefa e compara visualmente — pega reciclagem reprocessada
//    (recortada, comprimida, com filtro) que o hash sozinho não vê.
// A régua de QUANDO pedir justificativa e quando só então acionar o gestor
// mora em src/lib/xgameValidacao.js (pura, testada) — a tela é quem decide
// com o veredito daqui; esta função só OLHA e RESPONDE.
const AI_KEY = process.env.AI_GATEWAY_API_KEY || '';
const OIDC = process.env.VERCEL_OIDC_TOKEN || '';
const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';
// gemini flash lê imagem e está no free tier do gateway; troque via env se quiser
const MODEL = process.env.AI_MODEL_VISION || 'google/gemini-2.0-flash-001';

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
de reunião com foto de lazer. Quando notar incoerência REAL mas não tiver
certeza absoluta de má-fé, NÃO reprove de cara — responda "duvida" e
preencha "pergunta_para_pessoa" com uma pergunta CURTA, direta e específica
pedindo pra ela explicar a foto (cite o que você viu). Só reprove sem
perguntar quando a incoerência for GRITANTE e óbvia (imagem aleatória, meme,
nada a ver mesmo perguntando).

ANTI-RECICLAGEM: se vieram FOTOS ANTERIORES da mesma pessoa pra comparar,
olhe se a foto NOVA é a MESMA cena/imagem reaproveitada (mesmo que
recortada, comprimida, com filtro ou brilho diferente — reconheça a cena,
não só o arquivo). Se for reciclagem, isso é motivo de REPROVAÇÃO direta
(não precisa perguntar: reciclar prova antiga não tem explicação válida).`;

// 🩺 PING — chamada mínima (só texto) ao modelo de visão pra saber se ele
// RESPONDE de verdade. "Tem chave" ≠ "a IA funciona": foi assim que a tela
// disse "IA ligada" enquanto toda comprovação caía em "IA indisponível".
async function pingModelo(auth) {
  try {
    const r = await fetch(GATEWAY, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: 'responda só: ok' }], max_tokens: 5 }),
      signal: AbortSignal.timeout(15000),
    });
    const corpo = (await r.text()).slice(0, 400);
    return { status: r.status, ok: r.ok, corpo: r.ok ? undefined : corpo };
  } catch (e) {
    return { status: 0, ok: false, corpo: String(e?.message || e).slice(0, 200) };
  }
}

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
      .map((u) => String(u || '').slice(0, 2000)).filter(Boolean).slice(0, 4);
    const justificativa = String(body?.justificativa || '').slice(0, 800);
    const tentativa = Number(body?.tentativa) === 2 ? 2 : 1;
    if (!imageUrl) return res.status(400).json({ ok: false, error: 'image_url obrigatório' });

    const auth = await chaveDaIA();
    if (!auth) {
      return res.status(200).json({ ok: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo: 'IA não conectada — comprovação enviada pra análise manual do gestor.' });
    }

    const sys = `Você é o VALIDADOR DE COMPROVAÇÕES da gamificação X-GAME (Leilão no Zap) — o padrão é ALTO: intervenção humana deve ser rara, então você precisa ser mais rigorosa e mais atenta que um humano faria. Responda SOMENTE com JSON válido, sem markdown:
{"veredito":"aprovada"|"reprovada"|"duvida","confianca":0-100,"o_que_viu":"descrição curta do que a imagem mostra","motivo":"explicação curta e PEDAGÓGICA em pt-BR (se reprovar, diga exatamente o que faltou e como corrigir)","pergunta_para_pessoa":"só quando veredito=duvida por incoerência: uma pergunta curta e específica pra pessoa se explicar; string vazia nos outros casos"}`;
    const contexto = `TAREFA COMPROVADA: "${titulo}"${hora ? ` (horário da tarefa: ${hora})` : ''}${data ? `. HOJE É ${data}` : ''}.
${REGRAS_POR_TIPO[tipo] || REGRAS_POR_TIPO.foto}
${CRUZAMENTO}${resumo ? `\nRESUMO DIGITADO PELA PESSOA: "${resumo}"` : ''}${imagensAnteriores.length ? `\n\nAs próximas ${imagensAnteriores.length} imagem(ns) anexada(s) DEPOIS desta primeira são comprovações ANTERIORES da MESMA pessoa pro MESMO tipo de tarefa — use-as SÓ pra checar reciclagem, não para julgar a tarefa de hoje.` : ''}${justificativa ? `\n\nESTA É A SEGUNDA ANÁLISE: na primeira você teve dúvida e perguntou; a pessoa respondeu: "${justificativa}". Decida agora considerando a explicação dela — se a justificativa é plausível e coerente com a imagem, aprove; se ainda não convence ou é evasiva, responda "duvida" de novo (sem pergunta nova: isso já vai pra análise do gestor).` : ''}`;

    const conteudoImagens = [
      { type: 'image_url', image_url: { url: imageUrl } },
      ...imagensAnteriores.map((u) => ({ type: 'image_url', image_url: { url: u } })),
    ];

    const r = await fetch(GATEWAY, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: [
            { type: 'text', text: contexto },
            ...conteudoImagens,
          ] },
        ],
        max_tokens: 400, temperature: 0.1,
      }),
      signal: AbortSignal.timeout(28000),
    });
    if (!r.ok) {
      // 🔍 DIR-84.1 — o erro do gateway NÃO pode mais sumir: vai pro log da
      // Vercel e volta em `details` pra tela/painel saberem POR QUE caiu.
      const corpo = (await r.text().catch(() => '')).slice(0, 400);
      console.error('[xgameValidarPrint] gateway falhou', { status: r.status, model: MODEL, corpo });
      return res.status(200).json({ ok: true, ia_indisponivel: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo: 'IA indisponível agora — comprovação enviada pra análise manual.', details: { status: r.status, model: MODEL, corpo } });
    }
    const j = await r.json();
    let clean = String(j?.choices?.[0]?.message?.content || '').replace(/```(json)?/gi, '').trim();
    const a = clean.indexOf('{'); const b = clean.lastIndexOf('}');
    if (a >= 0 && b > a) clean = clean.slice(a, b + 1);
    let out;
    try { out = JSON.parse(clean); } catch { out = null; }
    if (!out || !['aprovada', 'reprovada', 'duvida'].includes(out.veredito)) {
      return res.status(200).json({ ok: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo: 'A IA não conseguiu analisar — vai pra análise manual.' });
    }
    return res.status(200).json({
      ok: true,
      veredito: out.veredito,
      confianca: Math.max(0, Math.min(100, Number(out.confianca) || 0)),
      o_que_viu: String(out.o_que_viu || '').slice(0, 300),
      motivo: String(out.motivo || '').slice(0, 300),
      // 🔒 blindagem contra o LLM "esquecer" a instrução: a SEGUNDA rodada
      // NUNCA gera pergunta nova — a régua (lib/xgameValidacao.decisaoAposIA)
      // manda pro gestor se ainda houver dúvida aqui, e é isso que garante
      // que a pessoa tem exatamente UMA chance de se justificar, não um loop.
      pergunta_para_pessoa: tentativa === 2 ? '' : String(out.pergunta_para_pessoa || '').slice(0, 300),
    });
  } catch (e) {
    return res.status(200).json({ ok: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo: 'Erro na análise — vai pra fila manual.', details: String(e?.message || e).slice(0, 120) });
  }
}
