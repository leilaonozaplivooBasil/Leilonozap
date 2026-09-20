/**
 * leilaAtendente — a Leila rodando do NOSSO lado, sem Base44.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (15/09/2026)
 * ══════════════════════════════════════════════════════════════════════════
 * A conta do Base44 perdeu o direito de rodar backend functions e a Leila
 * parou inteira — respondendo a cliente, numa bolha de chat,
 * "Functions are blocked - app owner lacks backend functions capability".
 *
 * Ela era a ÚNICA das quatro coisas que usam a ponte `chamarRuntimeBase44`
 * sem reserva: comparaiPrices e marketSearch caem pra SerpAPI local,
 * buscarFotosPorImagem tem SearchAPI/SerpAPI atrás. A Leila, não. Terceira
 * vez que uma dependência do Base44 derruba função nossa.
 *
 * Aqui ela passa a rodar pelo mesmo caminho de IA do resto do sistema
 * (api/_lib/ia.js: chave direta da Anthropic ou AI Gateway, o que existir),
 * com as ferramentas que o Zeca já usa no WhatsApp desde agosto
 * (supabase/functions/whatsapp-router/index.ts).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 🔐 A DECISÃO DE SEGURANÇA — DE ONDE VEM A IDENTIDADE
 * ══════════════════════════════════════════════════════════════════════════
 * O Zeca sabe com quem fala pelo número do WhatsApp, que a operadora garante.
 * A Leila não tem isso: o `user_id` chega do navegador, de dentro do
 * localStorage, que qualquer pessoa edita no console em dez segundos.
 *
 * Por isso a identidade aqui NÃO vem do corpo da requisição. Vem do CRACHÁ
 * ASSINADO (api/_lib/sessao.js → conferirSessao), e usamos o id que está
 * DENTRO do crachá — nunca o que o corpo alega. Sem isso, "consultar_saldo"
 * viraria um jeito de ler a carteira alheia sabendo só o id da pessoa, que é
 * exatamente o buraco que o crachá foi criado pra fechar.
 *
 * ⚠️ E a conferência é `conferirSessao`, não `exigirSessao`: a segunda está
 * em ETAPA 1 (só anota no log, não recusa) até alguém publicar
 * SESSAO_MODO=bloquear. Depender dela aqui seria uma fechadura desligada.
 *
 * Quem não tem crachá válido continua conversando — só não alcança dado
 * pessoal. É o atendimento de visitante, que é a maior parte do tráfego.
 */
import { resolverIA, clienteIA, opcoesDeReserva, detalhesDoErro } from './ia.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MODEL_DIRETO = process.env.AI_MODEL_TEXT_ANTHROPIC || 'claude-sonnet-5';
const MODEL_GATEWAY = process.env.AI_MODEL_TEXT || 'anthropic/claude-sonnet-5';
const MODEL_GATEWAY_RESERVA = process.env.AI_MODEL_TEXT_RESERVA || 'anthropic/claude-haiku-4-5';

/** Quantas rodadas de ferramenta antes de desistir. Mesma régua do Zeca. */
export const MAX_RODADAS_TOOL = 4;
/** Quantos turnos de memória são relidos. Curto de propósito: contexto, não arquivo. */
export const TURNOS_DE_MEMORIA = 12;

function sb(caminho, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    ...opts,
    headers: {
      apikey: SR, Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json', ...(opts.headers || {}),
    },
  });
}
const linhas = async (r) => { try { const j = await r.json(); return Array.isArray(j) ? j : []; } catch { return []; } };

/**
 * 🔢 O PostgREST devolve `numeric` como TEXTO JSON ("150.00", não 150).
 * Somar isso sem converter concatena string. Toda saída numérica das
 * ferramentas passa por aqui antes de chegar na Claude.
 */
const num = (v) => (Number(v) || 0);
const dinheiro = (v) => `R$ ${num(v).toFixed(2).replace('.', ',')}`;

// ════════════════════════════════════════════════════════════════════════════
// AS FERRAMENTAS — as mesmas do Zeca, com a identidade trocada
// ════════════════════════════════════════════════════════════════════════════

/** Ferramentas que qualquer um pode usar: não tocam em dado de ninguém. */
const FERRAMENTAS_PUBLICAS = [
  {
    name: 'consultar_leiloes_ativos',
    description: 'Lista os leilões abertos agora (até 8), do que encerra primeiro para o que encerra por último. Use sempre que a pessoa perguntar o que está em leilão, o que dá pra arrematar hoje, ou pedir uma indicação.',
    input_schema: { type: 'object', properties: {} },
    executar: async () => {
      const r = await sb('auctions?select=id,title,current_price,end_time&status=eq.active&order=end_time.asc&limit=8');
      const rows = await linhas(r);
      return {
        leiloes: rows.map((a) => ({
          titulo: a.title,
          lance_atual: dinheiro(a.current_price),
          encerra_em: a.end_time,
          link: `https://leilaonozap.net/leiloes`,
        })),
      };
    },
  },
];

/** Ferramentas que leem dado PESSOAL — só com crachá assinado conferido. */
const FERRAMENTAS_IDENTIFICADAS = [
  {
    name: 'consultar_saldo',
    description: 'Consulta o saldo da carteira digital de quem está falando agora: o disponível e o que está reservado em lances. Use quando a pessoa perguntar do saldo dela, se dá pra dar um lance, ou por que o dinheiro dela está preso.',
    input_schema: { type: 'object', properties: {} },
    executar: async (_input, ctx) => {
      const r = await sb(`app_users?select=full_name,saldo_disponivel,saldo_reservado&id=eq.${encodeURIComponent(ctx.userId)}&limit=1`);
      const u = (await linhas(r))[0];
      if (!u) return { encontrado: false, mensagem: 'Não achei o cadastro desta pessoa.' };
      return {
        encontrado: true,
        nome: u.full_name,
        saldo_disponivel: dinheiro(u.saldo_disponivel),
        saldo_reservado_em_lances: dinheiro(u.saldo_reservado),
        // 🧠 A regra do negócio junto do número: sem isto a Claude explica
        // "reservado" do jeito dela, e já explicou errado ("paga depois").
        como_funciona: 'O reservado é o valor travado em lances que ainda estão de pé. Se alguém cobre o lance, volta pro disponível na hora.',
      };
    },
  },
  {
    name: 'consultar_pedidos',
    description: 'Lista as compras mais recentes de quem está falando (até 5), com status, forma de pagamento e código de rastreio quando já existe. Use quando perguntarem "cadê meu pedido", "já enviou?", "chegou o pagamento?".',
    input_schema: { type: 'object', properties: {} },
    executar: async (_input, ctx) => {
      const r = await sb(
        'catalog_sales?select=product_title,total_amount,status,fulfillment_status,tracking_code,created_at' +
        `&buyer_id=eq.${encodeURIComponent(ctx.userId)}&order=created_at.desc&limit=5`
      );
      const rows = await linhas(r);
      if (!rows.length) return { pedidos: [], mensagem: 'Esta pessoa ainda não tem nenhuma compra registrada.' };
      return {
        pedidos: rows.map((p) => ({
          produto: p.product_title,
          valor: dinheiro(p.total_amount),
          status: p.status,
          entrega: p.fulfillment_status || 'ainda não separado',
          rastreio: p.tracking_code || null,
          quando: p.created_at,
        })),
      };
    },
  },
  {
    name: 'encaminhar_lead_vendedor',
    description:
      'Encaminha pro executivo humano (João Paim) o contato de alguém interessado em SER VENDEDOR / trabalhar com a empresa. ' +
      'Chame só quando o assunto for claramente "quero ser vendedor", "como faço pra revender", "quero trabalhar com vocês" — ' +
      'nunca por dúvida comum de comprador.',
    input_schema: {
      type: 'object',
      properties: {
        resumo: { type: 'string', description: 'Resumo em 1-2 frases do que a pessoa disse, pro executivo ter contexto.' },
      },
      required: ['resumo'],
    },
    executar: async (input, ctx) => {
      const r = await sb(`app_users?select=full_name,email,phone&id=eq.${encodeURIComponent(ctx.userId)}&limit=1`);
      const u = (await linhas(r))[0] || {};
      const gravou = await sb('system_logs', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: (globalThis.crypto?.randomUUID?.() || String(Date.now())).replace(/-/g, ''),
          component_name: 'LeadVendedorPelaLeila',
          step: 'encaminhar', status: 'success',
          message: `Lead de vendedor pela Leila: ${u.full_name || ctx.userId}`,
          payload: { user_id: ctx.userId, nome: u.full_name || null, email: u.email || null, telefone: u.phone || null, resumo: String(input?.resumo || '').slice(0, 500) },
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }),
      });
      // Se a gravação falhar, a Leila NÃO pode dizer que encaminhou. Prometer
      // contato que não vai acontecer é pior que dizer "não consegui".
      if (!gravou.ok) return { encaminhado: false, mensagem: 'Não consegui registrar o contato agora — peça pra pessoa tentar de novo em alguns minutos.' };
      return { encaminhado: true, mensagem: 'Contato registrado. O executivo fala com a pessoa em breve.' };
    },
  },
];

/** As ferramentas desta conversa. Sem crachá, só as públicas. */
export function ferramentasDaLeila(identificado) {
  return identificado ? [...FERRAMENTAS_PUBLICAS, ...FERRAMENTAS_IDENTIFICADAS] : [...FERRAMENTAS_PUBLICAS];
}

// ════════════════════════════════════════════════════════════════════════════
// A PERSONA
// ════════════════════════════════════════════════════════════════════════════

/**
 * O texto da persona saiu de base44/agents/leila_atendente.jsonc e passa a
 * morar aqui, versionado com o resto do código. Enquanto vivia só no painel do
 * Base44, mudar a Leila exigia entrar lá — e ninguém revisava a mudança.
 */
export function personaDaLeila({ nome, identificado, temMemoria }) {
  return `Você é a Leila, atendente oficial da plataforma Leilão NoZap. Você é a melhor atendente que existe: rápida, gente, precisa e resolve.

COMO VOCÊ FALA
- Humana, informal e simpática, como a melhor atendente de chat de um grande e-commerce. Nada de tom robótico ou repetitivo.
- Português do Brasil coloquial, como mensagem de WhatsApp de verdade: "tá", "pra", "né", 1 emoji por mensagem quando couber.
- Frases e parágrafos curtos. Nunca um bloco gigante de texto.
- Responde exatamente o que foi perguntado e termina com um próximo passo claro.
${nome ? `- O nome de quem está falando é ${nome}. Use de vez em quando, não em toda frase. Nunca diga que recebeu o nome automaticamente.` : '- Você não sabe o nome desta pessoa. Trate com simpatia sem nome, e NUNCA invente ou chute um nome.'}
${temMemoria ? '- Você tem o histórico desta conversa. Se já houve troca antes, a mensagem atual é CONTINUAÇÃO: não cumprimente de novo, não se reapresente, não re-explique o que já explicou.' : '- Esta é a primeira mensagem desta conversa.'}

SUAS FERRAMENTAS — A REGRA MAIS IMPORTANTE
- Quando a pergunta for sobre saldo, pedidos ou leilões, USE A FERRAMENTA. Nunca responda de cabeça.
- Cite o número exato que a ferramenta devolveu. Nunca arredonde, estime ou invente.
- Se a ferramenta disser que não encontrou, diga isso com naturalidade e ofereça o próximo passo — não tente de novo.
- Pra dado que ferramenta nenhuma cobre (estoque de um produto específico, prazo de entrega exato), diga que não tem essa informação e mande o link certo. NUNCA invente.
${identificado ? '' : '- ⚠️ Esta pessoa NÃO está logada, então você não alcança saldo nem pedidos dela. Se perguntarem, explique com simpatia que precisa entrar na conta e mande o link da Carteira ou de Meus Pedidos.'}

A REGRA DE NEGÓCIO DOS LEILÕES — A ÚNICA VERDADE
- O pagamento é ANTES do lance, nunca depois do arremate.
- Funciona assim: 1) deposita na Carteira digital; 2) ao dar o lance, o valor fica RESERVADO na hora; 3) se alguém cobrir, volta pro disponível; 4) se ganhar, o que já estava reservado paga o produto.
- NUNCA diga que "paga depois de arrematar" nem que existe "prazo de pagamento pós-arremate". Isso não existe aqui.
- Na Loja Virtual é e-commerce normal: escolhe, carrinho, checkout. Sem reserva.

💸 NÃO EXISTE SAQUE DO SALDO DA CARTEIRA DE LANCES — NUNCA PROMETA ISSO
- O dinheiro depositado na Carteira serve para DAR LANCE e para ARREMATAR. Só isso.
- Ele NÃO sai em dinheiro: não tem saque, não tem PIX de volta, não tem estorno
  para a conta, não tem "devolvo no cartão". Não existe e nunca existiu.
- Ele também NÃO paga compra na Loja Virtual. Loja é checkout à parte.
- Se o lance for superado, o valor volta do RESERVADO para o DISPONÍVEL — e fica
  ali, na carteira, para o próximo lance. "Voltar para a carteira" NÃO é
  "receber de volta".
- Se a pessoa perguntar sobre saque, resgate, estorno ou receber o dinheiro de volta:
  diga que NÃO, com clareza e sem rodeio, e explique que o valor fica na carteira
  para usar em outro leilão. Antes de inventar qualquer exceção, é melhor dizer
  que não sabe e mandar falar com o atendimento humano.
- 🔴 Esta é a regra mais cara de errar do atendimento inteiro: prometer saque faz
  a pessoa depositar achando que pode se arrepender. Não pode.

🎟️ O BÔNUS DE 10% — O QUE ELE É DE VERDADE
- Nasce do DEPÓSITO de R$ 100 ou mais, não de ter o lance superado. Ser superado
  não gera bônus nenhum.
- Nasce BLOQUEADO. Não vira saldo gastável no momento do depósito.
- Vai sendo liberado conforme a pessoa DÁ LANCE, em pedaços proporcionais.
- O que é liberado serve só para compra na Loja Virtual — e também não vira
  dinheiro nem saque.
- Se não souber em que pé está o bônus de alguém, diga que não tem esse número e
  mande a pessoa ver na Carteira. NUNCA estime.

LINKS — PODE E DEVE MANDAR, desde que sejam do próprio site
- Loja Virtual: https://leilaonozap.net/Loja-Virtual
- Leilões ativos: https://leilaonozap.net/leiloes
- Carteira: https://leilaonozap.net/Carteira
- Meus Pedidos: https://leilaonozap.net/MyCatalogOrders
- Meus Arremates: https://leilaonozap.net/MyWinnings
- Parceiro: https://leilaonozap.net/Partners
- NUNCA mande pra WhatsApp, Instagram ou qualquer site fora do leilaonozap.net.

🚫 PROIBIÇÃO ABSOLUTA
- NUNCA fale de "rede", "indicação", "comissão em níveis", "licenciamento", "plano de carreira" ou qualquer estrutura de ganhar dinheiro indicando gente. Nem se perguntarem direto.
- Se perguntarem como ganhar dinheiro, diga de forma breve e neutra que isso fica numa área própria dentro do app, e volte pra leilões, loja ou pedidos.

🤝 PARCEIRO DE COMPRA
- É programa de investimento em lotes, com contrato e ciclo — não é atendimento rápido. Explique a ideia geral e mande https://leilaonozap.net/Partners. Nunca invente rentabilidade, prazo ou condição.

REGRAS GERAIS
- Você só CONSULTA e ORIENTA. Não executa operação financeira nem altera dado.
- Reclamação grave, problema de pagamento não resolvido ou pedido de reembolso: diga que vai encaminhar pra um humano.
- Nunca deixe a pessoa sem resposta. Não entendeu? Peça pra reformular.`;
}

// ════════════════════════════════════════════════════════════════════════════
// MEMÓRIA — ai_conversas, a mesma tabela do Zeca e do Heloim
// ════════════════════════════════════════════════════════════════════════════

export const AGENTE = 'leila';

/** Os últimos turnos desta pessoa, do mais antigo pro mais novo. */
export async function lerMemoria(userId) {
  if (!userId) return [];
  const r = await sb(
    `ai_conversas?select=role,content&agente=eq.${AGENTE}&remetente=eq.${encodeURIComponent(userId)}` +
    `&order=created_at.desc&limit=${TURNOS_DE_MEMORIA}`
  );
  return (await linhas(r)).reverse()
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
    .map((t) => ({ role: t.role, content: t.content }));
}

/**
 * Guarda a pergunta e a resposta. Nunca lança: memória é conforto, e perder um
 * turno de histórico não pode derrubar um atendimento que já foi respondido.
 */
export async function guardarMemoria(userId, pergunta, resposta) {
  if (!userId) return;
  try {
    const agora = new Date().toISOString();
    await sb('ai_conversas', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify([
        { remetente: userId, agente: AGENTE, role: 'user', content: String(pergunta).slice(0, 4000), created_at: agora },
        { remetente: userId, agente: AGENTE, role: 'assistant', content: String(resposta).slice(0, 4000), created_at: agora },
      ]),
    });
  } catch (e) {
    console.warn('[leila] não guardei a memória deste turno:', e?.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// O LAÇO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Responde como a Leila.
 *
 * @param {{ mensagem: string, userId: string|null }} entrada
 *   `userId` SÓ pode vir do crachá conferido. Ver o cabeçalho deste arquivo.
 * @returns {Promise<{ok:boolean, texto:string, motivo_tecnico?:string, usou_ferramentas?:string[]}>}
 */
export async function responderComoLeila({ mensagem, userId = null }) {
  const identificado = !!userId;

  const ia = await resolverIA({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY, reserva: MODEL_GATEWAY_RESERVA });
  if (!ia) return { ok: false, texto: '', motivo_tecnico: 'sem_chave_de_ia' };

  let nome = null;
  if (identificado) {
    try {
      const u = (await linhas(await sb(`app_users?select=display_first_name,full_name,nickname&id=eq.${encodeURIComponent(userId)}&limit=1`)))[0];
      nome = u ? (u.display_first_name || String(u.full_name || '').split(' ')[0] || u.nickname || null) : null;
    } catch { nome = null; }
  }

  const historico = identificado ? await lerMemoria(userId) : [];
  const ferramentas = ferramentasDaLeila(identificado);
  const porNome = Object.fromEntries(ferramentas.map((f) => [f.name, f]));
  const system = personaDaLeila({ nome, identificado, temMemoria: historico.length > 0 });

  const mensagens = [...historico, { role: 'user', content: String(mensagem) }];
  const usadas = [];

  try {
    for (let rodada = 0; rodada < MAX_RODADAS_TOOL; rodada++) {
      const resp = await clienteIA(ia, { timeout: 25_000 }).messages.create({
        model: ia.model,
        max_tokens: 1024,
        system,
        messages: mensagens,
        tools: ferramentas.map(({ name, description, input_schema }) => ({ name, description, input_schema })),
        ...opcoesDeReserva(ia),
      });

      if (resp.stop_reason !== 'tool_use') {
        const texto = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        if (!texto) return { ok: false, texto: '', motivo_tecnico: 'resposta_vazia' };
        if (identificado) await guardarMemoria(userId, mensagem, texto);
        return { ok: true, texto, usou_ferramentas: usadas };
      }

      mensagens.push({ role: 'assistant', content: resp.content });
      const resultados = [];
      for (const bloco of resp.content) {
        if (bloco.type !== 'tool_use') continue;
        usadas.push(bloco.name);
        const f = porNome[bloco.name];
        let saida;
        try {
          // 🔐 A ferramenta recebe o userId do CRACHÁ, não o que a Claude
          // eventualmente tenha inventado no input. Nenhuma delas aceita id
          // como parâmetro, e é de propósito.
          saida = f ? await f.executar(bloco.input, { userId }) : { erro: 'ferramenta desconhecida' };
        } catch (e) {
          saida = { erro: String(e?.message || e).slice(0, 200) };
        }
        resultados.push({ type: 'tool_result', tool_use_id: bloco.id, content: JSON.stringify(saida) });
      }
      mensagens.push({ role: 'user', content: resultados });
    }

    return { ok: false, texto: '', motivo_tecnico: `estourou ${MAX_RODADAS_TOOL} rodadas de ferramenta` };
  } catch (e) {
    const d = detalhesDoErro(e);
    return { ok: false, texto: '', motivo_tecnico: `${d.status} ${d.tipo}: ${d.mensagem}`.slice(0, 300) };
  }
}
