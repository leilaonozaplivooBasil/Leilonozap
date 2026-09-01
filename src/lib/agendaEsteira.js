// agendaEsteira — a AGENDA DO DIA da esteira de captação (DIR-38,
// 01/09/2026). Pedido do dono: "medir a quantidade de reuniões no dia e o
// percentual por pessoa do time". Reunião nasce da oportunidade
// (reuniao_em) — não existe agenda paralela pra divergir.
import { ehAtiva } from './esteiraCaptacao.js';

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Agenda do dia: reuniões de HOJE, atrasadas, próximas na semana e
 * recontatos vencidos — só de oportunidades ATIVAS (fechada/perdida não
 * tem mais reunião pendente).
 */
export function agendaEsteira(oportunidades = [], ref = new Date()) {
  const hojeStr = ref.toISOString().slice(0, 10);
  const fimSemana = new Date(ref.getTime() + 7 * DIA_MS);
  const agenda = { reunioesHoje: [], reunioesAtrasadas: [], reunioesSemana: 0, recontatosHoje: 0 };
  for (const o of oportunidades) {
    if (!ehAtiva(o)) continue;
    if (o.reuniao_em) {
      const dia = String(o.reuniao_em).slice(0, 10);
      if (dia === hojeStr) agenda.reunioesHoje.push(o);
      else if (dia < hojeStr) agenda.reunioesAtrasadas.push(o);
      else if (new Date(o.reuniao_em) <= fimSemana) agenda.reunioesSemana += 1;
    }
    if (o.estagio === 'interesse_futuro' && o.recontato_em && String(o.recontato_em).slice(0, 10) <= hojeStr) {
      agenda.recontatosHoje += 1;
    }
  }
  return agenda;
}

/**
 * Reuniões por responsável (hoje × marcadas) — o "% do time" do dono se
 * completa com o win rate de conversaoPorResponsavel (mesma chave: nome).
 */
export function reunioesPorResponsavel(oportunidades = [], ref = new Date()) {
  const hojeStr = ref.toISOString().slice(0, 10);
  const por = new Map();
  for (const o of oportunidades) {
    if (!ehAtiva(o) || !o.reuniao_em) continue;
    const nome = o.responsavel_nome || 'Sem responsável';
    if (!por.has(nome)) por.set(nome, { nome, hoje: 0, marcadas: 0 });
    const r = por.get(nome);
    r.marcadas += 1;
    if (String(o.reuniao_em).slice(0, 10) === hojeStr) r.hoje += 1;
  }
  return [...por.values()].sort((a, b) => b.hoje - a.hoje || b.marcadas - a.marcadas);
}
