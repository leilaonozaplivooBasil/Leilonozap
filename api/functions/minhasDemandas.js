// 🧠 minhasDemandas — o ✈ do mapa mental larga a anotação na fila que já existe.
//
// Dono (áudio de 19/09/2026): "vou esvaziando a mente… E automaticamente eu já
// transformo isso e direciono para onde eu quero."
//
// 🔴 21/09/2026 — ESTA ROTA GRAVAVA NA TABELA ERRADA.
//
// A primeira versão escrevia numa tabela `demandas` criada por mim. Só que a
// casa já tem `xperf_demandas`: é ela que o Encontro da Mentalidade preenche,
// que o Painel Corporativo mostra (recebida → agendada → devolvida) e que a
// Performance da Equipe conta. Ela tem `pessoa_id` — o "direciono para onde eu
// quero" do pedido — e `tarefa_id`/`card_id`, o caminho de virar trabalho já
// pronto. A minha não tinha nada disso.
//
// O dono escolheu em 21/09 reusar a fila que existe. A tabela nova morreu com
// a migração dela; esta rota agora escreve onde todo mundo já olha.
//
// POST → anota uma demanda vinda de um nó do mapa
//
// 🔐 A identidade sai do CRACHÁ assinado, nunca do corpo. Se viesse de
// `body.pessoa_id`, trocar um número plantaria demanda na fila de outra pessoa.

import { conferirSessao } from '../_lib/sessao.js';
import { demandaDoNo, aQueJaEstaNaFila, ORIGEM_MAPA, RECEBIDA } from '../../src/lib/demandas.js';
import { tarefaDaDemanda, cardDaDemanda } from '../../src/lib/encontro.js';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR, Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json', ...(opts.headers || {}),
    },
  });
}

const enc = encodeURIComponent;

// ✈ 22/09/2026 — os destinos diretos do mapa. Dono (áudio de 19/09, 10h32):
// "automaticamente, quando eu esvazio a mente no mapa mental, eu jogo para o
// meu quadro, para a minha lista e para a minha jornada."
// 'demandas' continua sendo o padrão: quem só quer largar a ideia larga.
const DESTINOS = new Set(['demandas', 'dia', 'quadro', 'ambos']);

/** Hoje em Brasília. DIR-129: UTC vira amanhã das 21h às 23h59 — e a tarefa
 *  nasceria no dia errado, num servidor que roda em UTC. */
const hojeBR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

/**
 * A demanda vira trabalho DE VERDADE: tarefa da jornada, cartão do quadro, ou
 * os dois — o mesmo caminho e as mesmas funções da aba Demandas e do Painel
 * Corporativo (`tarefaDaDemanda`, `cardDaDemanda`). Nada de formato paralelo.
 *
 * 🔒 A demanda só é marcada `agendada` DEPOIS que o trabalho existe. Marcar
 * antes faria a anotação sumir da caixa sem nada ter sido criado — o pior
 * defeito possível aqui, porque ninguém descobre: some calado.
 */
async function virarTrabalho(demanda, destino, dono) {
  const dia = hojeBR();
  let tarefaId = null; let cardId = null;

  if (destino !== 'quadro') {
    const doDia = await (await sb(
      `metodo_tarefas?select=id&user_id=eq.${enc(dono)}&data=eq.${enc(dia)}&limit=200`,
    )).json().catch(() => []);
    const ordem = Array.isArray(doDia) ? doDia.length : 0;
    const linha = tarefaDaDemanda({ ...demanda, pessoa_id: dono }, { dia, ordem });
    const r = await sb('metodo_tarefas', {
      method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(linha),
    });
    if (!r.ok) throw new Error('falha_ao_criar_tarefa');
    const salvo = await r.json().catch(() => null);
    tarefaId = (Array.isArray(salvo) ? salvo[0] : salvo)?.id || null;
  }

  if (destino !== 'dia') {
    const linha = cardDaDemanda({ ...demanda, pessoa_id: dono }, { tarefaId, responsavelNome: demanda.criado_por_nome || null });
    const r = await sb('metodo_quadro', {
      method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(linha),
    });
    if (!r.ok) throw new Error('falha_ao_criar_card');
    const salvo = await r.json().catch(() => null);
    cardId = (Array.isArray(salvo) ? salvo[0] : salvo)?.id || null;
  }

  await sb(`xperf_demandas?id=eq.${enc(demanda.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'agendada',
      agendada_para: destino === 'quadro' ? null : dia,
      tarefa_id: tarefaId, card_id: cardId,
      updated_at: new Date().toISOString(),
    }),
  });

  return { tarefaId, cardId, dia };
}

/** O nome de quem anotou, para a linha do Painel não sair anônima. */
async function nomeDe(userId) {
  try {
    const r = await sb(`app_users?select=full_name&id=eq.${enc(userId)}&limit=1`);
    if (!r.ok) return null;
    const linhas = await r.json();
    return (Array.isArray(linhas) && linhas[0]?.full_name) || null;
  } catch {
    // nome é enfeite: sem ele a demanda ainda chega. Falhar a gravação por
    // causa disto seria perder a anotação por um detalhe de exibição.
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

  const ses = conferirSessao(req);
  if (!ses.ok || !ses.userId) return res.status(401).json({ success: false, error: 'nao_autenticado' });
  const dono = String(ses.userId);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const titulo = String(body?.titulo ?? '').trim();
    if (!titulo) return res.status(400).json({ success: false, error: 'sem_titulo' });
    const pedido = String(body?.destino || 'demandas');
    // destino desconhecido cai em 'demandas', não em erro: a anotação é a
    // coisa insubstituível aqui — perdê-la por causa de um rótulo errado
    // seria trocar o essencial pelo acessório.
    const destino = DESTINOS.has(pedido) ? pedido : 'demandas';

    // 🔒 a trava contra duplicata roda ANTES do insert: lê o que já está
    // aberto na fila dele vindo do mapa e compara título.
    const abertas = await (await sb(
      `xperf_demandas?select=id,titulo,origem,status` +
      `&pessoa_id=eq.${enc(dono)}&origem=eq.${enc(ORIGEM_MAPA)}&status=eq.${enc(RECEBIDA)}&limit=300`,
    )).json().catch(() => []);

    const repetida = aQueJaEstaNaFila(Array.isArray(abertas) ? abertas : [], titulo);
    if (repetida) {
      // Não é erro: o dono clicou de novo no mesmo nó. Devolver 200 com
      // `jaExistia` deixa a tela dizer "já está lá" em vez de acusar falha.
      //
      // 🔴 Mas se desta vez ele escolheu um destino, "já está lá" sozinho
      // seria um botão que não faz nada: a demanda repetida é JUSTAMENTE a que
      // ele quer no quadro agora. Então ela vai — sem virar uma segunda linha.
      if (destino === 'demandas') return res.status(200).json({ success: true, jaExistia: true, destino });
      const feito = await virarTrabalho(repetida, destino, dono);
      return res.status(200).json({ success: true, jaExistia: true, destino, ...feito });
    }

    const linha = demandaDoNo({ texto: titulo }, { pessoaId: dono, pessoaNome: await nomeDe(dono) });
    if (!linha) return res.status(400).json({ success: false, error: 'sem_titulo' });

    const r = await sb('xperf_demandas', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify(linha),
    });
    const salvo = await r.json().catch(() => null);
    if (!r.ok) return res.status(500).json({ success: false, error: 'falha_ao_salvar' });

    const demanda = Array.isArray(salvo) ? salvo[0] : salvo;
    if (destino === 'demandas') return res.status(200).json({ success: true, jaExistia: false, destino, demanda });

    const feito = await virarTrabalho(demanda, destino, dono);
    return res.status(200).json({ success: true, jaExistia: false, destino, demanda, ...feito });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || e).slice(0, 200) });
  }
}
