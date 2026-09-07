// gerarJornadaDoDia — CRON DIÁRIO, de madrugada (DIR-81, 07/09/2026).
//
// POR QUE ISTO EXISTE
// Dono: "eu quero mudar a questão de depender delas gerarem automáticas, já
// vamos deixar abertas pra incentivá-las tanto a gamificação como alguns
// quadros e jornadas — elas acordam hoje cinco horas da manhã e não tem
// nada... mas a jornada pode deixar completa pra quando ela acordar amanhã,
// ela ter aquela experiência."
//
// Antes deste job, `rotina_automatica` (DIR-80) só ligava depois da PESSOA
// gerar o primeiro dia na mão — até lá o Compromisso abria vazio. Este cron
// tira essa dependência: liga o automático sozinho pra quem tem DIREITO ao
// X-Game (vendedor pra cima — `temDireitoAoXGame`, careerLevels.js) e nunca
// decidiu nada, gera a jornada de hoje se o dia ainda está vazio, e semeia o
// quadro (as 3 listas-modelo + 1 card de exemplo) pra quem nunca abriu o
// dele. "Só se a pessoa pedir pra parar" (DIR-80) continua de pé: quem já
// clicou "parar de gerar todo dia" fica marcado (`rotina_automatica_recusada`,
// migração 20260907060000) e o cron nunca religa por ela.
//
// IDEMPOTÊNCIA: cada uma das três coisas (ligar o automático, gerar o dia,
// semear o quadro) só acontece pra quem ainda NÃO tem aquilo — rodar de novo
// no mesmo dia, ou depois de falhar no meio, não duplica nada. A geração do
// dia NÃO conta linha de `metodo_tarefas` pra decidir "já tem algo hoje"
// (DIR-81.1 — um compromisso avulso, tipo reunião sincronizada ou demanda
// direcionada, quebrava essa conta e travava a Rotina Perfeita de nascer);
// a prova é `rotina_gerada_em`, escrita por qualquer caminho que gere o dia
// (este cron, o botão "gerar", "regerar o dia" e a repetição automática).
//
// PERFORMANCE: nada de round-trip por pessoa. As leituras são 3 SELECTs no
// total (usuários, perfis, listas do quadro) e as escritas são lotes (bulk
// insert/patch) — o tempo não cresce linearmente com o número de pessoas
// elegíveis.
//
// SEGURANÇA: best-effort. Isto é abrir uma tela vazia com um rascunho — não é
// movimento de dinheiro. Se o quadro de alguém falhar, os outros continuam.
import { gerarTarefasDaRotina, ROTINA_PADRAO } from '../../src/lib/metodo.js';
import { pesoAutomatico } from '../../src/lib/xgame.js';
import { rotinaEmVigor, devePreAbrirAutomatico, jaGerouHoje } from '../../src/lib/rotinaPessoal.js';
import { temDireitoAoXGame } from '../../src/lib/careerLevels.js';
import { LISTAS_MODELO, CARD_EXEMPLO, ESTADO_ABERTO } from '../../src/lib/quadroCompromisso.js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
const j = async (r) => r.json().catch(() => []);
const arr = (x) => (Array.isArray(x) ? x : []);

// PostgREST aceita `in.(a,b,c)`, mas uma URL não é infinita — em lotes de 150.
function emLotes(lista, tamanho = 150) {
  const lotes = [];
  for (let i = 0; i < lista.length; i += tamanho) lotes.push(lista.slice(i, i + tamanho));
  return lotes;
}
const listaFiltro = (ids) => ids.map((id) => `"${id}"`).join(',');

// "hoje" no fuso de quem vai acordar — não o dia UTC do servidor do cron.
function hojeBrasil() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });
    const hoje = hojeBrasil();

    const usuarios = arr(await j(await sb('app_users?select=id,career_levels')));
    const ids = usuarios.filter((u) => temDireitoAoXGame(u.career_levels)).map((u) => u.id);
    if (!ids.length) return res.status(200).json({ success: true, elegiveis: 0 });

    // ── 1. o perfil de cada elegível (rotina, rotina_automatica, recusada) ──
    const perfilPor = new Map();
    for (const lote of emLotes(ids)) {
      for (const p of arr(await j(await sb(`metodo_perfil?user_id=in.(${listaFiltro(lote)})&select=*`)))) perfilPor.set(p.user_id, p);
    }
    const semPerfil = ids.filter((id) => !perfilPor.has(id));
    if (semPerfil.length) {
      const criados = arr(await j(await sb('metodo_perfil', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify(semPerfil.map((user_id) => ({ user_id }))),
      })));
      criados.forEach((p) => perfilPor.set(p.user_id, p));
    }

    // ── 2. liga sozinho quem nunca decidiu nada (nem ligou, nem pediu pra parar) ──
    const paraLigar = [...perfilPor.values()].filter(devePreAbrirAutomatico);
    if (paraLigar.length) {
      for (const lote of emLotes(paraLigar.map((p) => p.id))) {
        await sb(`metodo_perfil?id=in.(${listaFiltro(lote)})`, {
          method: 'PATCH', body: JSON.stringify({ rotina_automatica: true, rotina_automatica_desde: hoje }),
        });
      }
      paraLigar.forEach((p) => { p.rotina_automatica = true; p.rotina_automatica_desde = hoje; });
    }

    // ── 3. a jornada de hoje, pra quem está com o automático ligado e ainda
    // não foi gerada hoje — NÃO conta linha de metodo_tarefas (DIR-81.1: um
    // compromisso avulso, tipo uma reunião sincronizada do Contato & Convite
    // ou uma demanda direcionada, não pode travar a Rotina Perfeita de nascer
    // ao redor dele). `rotina_gerada_em` é a prova de que a ROTINA, e não
    // qualquer outra coisa, já nasceu nesse dia.
    const paraGerar = ids.filter((id) => {
      const p = perfilPor.get(id);
      return p?.rotina_automatica && !jaGerouHoje(p, hoje);
    });
    const linhasNovas = [];
    for (const id of paraGerar) {
      const rotina = rotinaEmVigor(perfilPor.get(id), ROTINA_PADRAO);
      linhasNovas.push(...gerarTarefasDaRotina(rotina, id, hoje, pesoAutomatico));
    }
    if (linhasNovas.length) await sb('metodo_tarefas', { method: 'POST', body: JSON.stringify(linhasNovas) });
    if (paraGerar.length) {
      const perfilIds = paraGerar.map((id) => perfilPor.get(id).id);
      for (const lote of emLotes(perfilIds)) {
        await sb(`metodo_perfil?id=in.(${listaFiltro(lote)})`, { method: 'PATCH', body: JSON.stringify({ rotina_gerada_em: hoje }) });
      }
    }

    // ── 4. o quadro (as 3 listas-modelo + 1 card de exemplo), pra quem nunca teve nenhuma lista ──
    const comQuadro = new Set(arr(await j(await sb('metodo_quadro_listas?select=user_id'))).map((l) => l.user_id));
    const semQuadro = ids.filter((id) => !comQuadro.has(id));
    let quadrosMontados = 0;
    if (semQuadro.length) {
      const listasParaCriar = semQuadro.flatMap((id) => LISTAS_MODELO.map((l, i) => ({ user_id: id, nome: l.nome, cor: l.cor, ordem: i })));
      const listasCriadas = arr(await j(await sb('metodo_quadro_listas', {
        method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(listasParaCriar),
      })));
      const primeiraPor = new Map();
      for (const l of listasCriadas) if (l.ordem === 0 && !primeiraPor.has(l.user_id)) primeiraPor.set(l.user_id, l);
      const cartoes = [...primeiraPor.values()].map((l) => ({
        user_id: l.user_id, lista_id: l.id, titulo: CARD_EXEMPLO.titulo, checklist: CARD_EXEMPLO.checklist, coluna: ESTADO_ABERTO, ordem: 0,
      }));
      if (cartoes.length) await sb('metodo_quadro', { method: 'POST', body: JSON.stringify(cartoes) });
      quadrosMontados = primeiraPor.size;
    }

    return res.status(200).json({
      success: true,
      elegiveis: ids.length,
      automatico_ligado_agora: paraLigar.length,
      jornadas_geradas: paraGerar.length,
      quadros_montados: quadrosMontados,
    });
  } catch (e) {
    console.error('[gerarJornadaDoDia] erro geral:', e?.message);
    return res.status(500).json({ success: false, error: e?.message || 'Erro desconhecido' });
  }
}
