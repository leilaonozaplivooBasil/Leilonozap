// 📊 OS 8 HÁBITOS DO TIME — a visão executiva de todo mundo, Hábito por Hábito.
//
// DE ONDE VEIO (dono, 06/09/2026): "a X-Performance vai abrir os oito hábitos
// do sucesso do time, numa visão executiva: quantos fizeram quadro dos sonhos,
// quantos contatos foram feitos, quem não fez quadro dos sonhos, quem não
// acordou… do primeiro até o oitavo hábito. Quem vendeu, quem não vendeu.
// Expor mesmo, com riqueza de detalhes, sem ficar sujo."
//
// Cada Hábito lê o DADO REAL da casa (nada é digitado aqui):
//   1 Sonho        — o quadro dos sonhos no perfil (metodo_perfil.sonhos) e a
//                    gratidão das 05:00 feita;
//   2 Compromisso  — acordou (a story das 05:15 ou a tarefa das 05:00 feita),
//                    gerou a Rotina Perfeita e quanto dela fez;
//   3 Lista        — nomes qualificados na lista de networking
//                    (customers.qualificacao_network, por quem criou o contato);
//   4 Contato      — contatos registrados no método (customers.contatos_metodo,
//                    por registrado_por_id) e tarefas de contato feitas;
//   5 Apresentação — reuniões/apresentações feitas (tarefas H5) e reuniões de
//                    investimento marcadas (captacao_oportunidades.reuniao_em);
//   6 Fechamento   — vendas pagas (catalog_sales) e captações fechadas
//                    (captacao_oportunidades fechado_100);
//   7 Verificação  — planejou o dia (rotina gerada) e registrou os números
//                    (tarefas H7 feitas); atrasos;
//   8 Duplicação   — treinou alguém (tarefas H8 feitas) e entregáveis de
//                    duplicação validados (xperf_entregaveis H8 entregue).
// A saída de cada Hábito é a mesma: número do time, quem FEZ (com o detalhe)
// e quem NÃO FEZ — pra expor com clareza, sem sujeira.
import { HABITOS } from './metodo.js';
import { classificarAcao } from './catalogoAcoes.js';

const dia = (v) => String(v || '').slice(0, 10);
const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const dentro = (iso, periodo) => { const d = dia(iso); return !!d && d >= periodo.de && d <= periodo.ate; };
const donoDaVenda = (s) => s.seller_id || s.licensee_id || s.anchor_id || s.owner_id || null;
const valorDaVenda = (s) => Number(s?.total_amount ?? s?.total ?? s?.amount ?? 0) || 0;
const fmtReais = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Que Hábito uma tarefa da rotina serve — pelo campo, senão pelo título (a rotina padrão não carrega hábito). */
export function habitoDaTarefa(t) {
  if (Number(t?.habito) >= 1 && Number(t?.habito) <= 8) return Number(t.habito);
  const s = semAcento(t?.titulo);
  if (/acordar|gratidao|foco no sonho|sonho/.test(s)) return 1;
  if (/story|treino|atividade fisica|caminho pra empresa|chegar a empresa|rotina|compromisso|descanso/.test(s)) return 2;
  if (/lista|qualificar|networking/.test(s)) return 3;
  if (/contato|convite|f\.o\.r\.m|prospec/.test(s)) return 4;
  if (/reuniao|apresenta|live/.test(s)) return 5;
  if (/follow|contrato|fechament|ppv|proposta|acompanhamento|pedido/.test(s)) return 6;
  if (/numero|verific|placar|organizacao do dia|conferir|fechar o dia|relatorio|resultado/.test(s)) return 7;
  if (/treinar|treinamento|ensinar|duplicar|formar|mentoria|onboarding/.test(s)) return 8;
  return classificarAcao(t?.titulo || '').habito || null;
}

const acordou = (t) => { const s = semAcento(t.titulo); return t.feito && (t.hora === '05:15' || t.hora === '05:00' || /story antes da atividade|acordar/.test(s)); };

/** O período: hoje, a semana (segunda a domingo) ou o mês, em ISO. */
export function periodoDe(tipo, hojeISO) {
  const d = new Date(`${hojeISO}T12:00:00`);
  const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  if (tipo === 'semana') {
    const seg = new Date(d); seg.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
    return { tipo, de: iso(seg), ate: iso(dom), rotulo: 'esta semana' };
  }
  if (tipo === 'mes') {
    const ini = new Date(d.getFullYear(), d.getMonth(), 1); const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { tipo, de: iso(ini), ate: iso(fim), rotulo: 'este mês' };
  }
  return { tipo: 'hoje', de: hojeISO, ate: hojeISO, rotulo: 'hoje' };
}

/**
 * Os 8 Hábitos do time no período.
 * `time` = [{id, nome, funcaoCurta}], `tarefas` = metodo_tarefas do período (todo mundo),
 * `perfis` = metodo_perfil (user_id, sonhos), `clientes` = customers (created_by_id,
 * qualificacao_network, contatos_metodo), `vendas` = catalog_sales pagas,
 * `oportunidades` = captacao_oportunidades, `entregaveis` = xperf_entregaveis.
 */
export function habitosDoTime({ time = [], tarefas = [], perfis = [], clientes = [], vendas = [], oportunidades = [], entregaveis = [], periodo, hojeISO } = {}) {
  const per = periodo || periodoDe('hoje', hojeISO);
  const noPeriodo = tarefas.filter((t) => dentro(t.data, per));
  const ate = per.ate <= String(hojeISO) ? per.ate : String(hojeISO);
  const diasPassados = noPeriodo.filter((t) => dia(t.data) <= ate);
  const porPessoa = (lista, chave = 'user_id') => { const m = new Map(); for (const x of lista) { const k = x[chave]; if (!k) continue; (m.get(k) || m.set(k, []).get(k)).push(x); } return m; };
  const tarefasDe = porPessoa(diasPassados);
  const pessoa = (id) => time.find((p) => p.id === id);
  const nomeDe = (id) => pessoa(id)?.nome || id;

  const monta = (n, linhasFeitas, extra = {}) => {
    const h = HABITOS.find((x) => x.n === n);
    const feitos = new Map();
    for (const l of linhasFeitas) if (l && l.pessoaId && pessoa(l.pessoaId)) feitos.set(l.pessoaId, l);
    const fizeram = [...feitos.values()].sort((a, b) => (b.valor || 0) - (a.valor || 0) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const naoFizeram = time.filter((p) => !feitos.has(p.id)).map((p) => ({ pessoaId: p.id, nome: p.nome, funcaoCurta: p.funcaoCurta || null, motivo: extra.motivo?.(p.id) || null }));
    const total = fizeram.reduce((s, f) => s + (Number(f.valor) || 0), 0);
    return { n, id: h?.id, nome: h?.completo || `Hábito ${n}`, curto: h?.curto, sub: h?.sub, pergunta: extra.pergunta, unidade: extra.unidade || '', total, totalRotulo: extra.totalRotulo ? extra.totalRotulo(total) : String(total), fizeram, naoFizeram, quantos: fizeram.length, deQuantos: time.length, pct: time.length ? Math.round((fizeram.length / time.length) * 100) : 0 };
  };

  // 1 · Sonho: tem quadro dos sonhos? e a gratidão do dia
  const sonhosDe = new Map(perfis.map((p) => [p.user_id, Array.isArray(p.sonhos) ? p.sonhos.length : (p.sonhos && typeof p.sonhos === 'object' ? Object.values(p.sonhos).flat().length : 0)]));
  const h1 = monta(1, time.map((p) => {
    const qtd = sonhosDe.get(p.id) || 0;
    const gratidao = (tarefasDe.get(p.id) || []).filter((t) => habitoDaTarefa(t) === 1 && t.feito).length;
    if (!qtd && !gratidao) return null;
    return { pessoaId: p.id, nome: p.nome, funcaoCurta: p.funcaoCurta, valor: qtd, detalhe: [qtd ? `${qtd} sonho${qtd > 1 ? 's' : ''} no quadro` : 'sem quadro', gratidao ? `gratidão ${gratidao}×` : null].filter(Boolean).join(' · ') };
  }), { pergunta: 'Quem tem o quadro dos sonhos e fez a gratidão?', unidade: 'sonhos no quadro', motivo: (id) => ((tarefasDe.get(id) || []).length ? 'sem quadro dos sonhos' : 'sem quadro e sem rotina'), totalRotulo: (t) => `${t} sonho${t === 1 ? '' : 's'}` });

  // 2 · Compromisso: acordou (05:00/05:15), gerou a rotina, quanto fez
  const diasDoPeriodo = new Set(diasPassados.map((t) => dia(t.data)));
  const h2 = monta(2, time.map((p) => {
    const minhas = tarefasDe.get(p.id) || [];
    const dias = [...new Set(minhas.map((t) => dia(t.data)))];
    const diasAcordou = dias.filter((d) => minhas.some((t) => dia(t.data) === d && acordou(t))).length;
    const diasPlanejou = dias.filter((d) => minhas.some((t) => dia(t.data) === d && (t.origem || '') !== 'xperf')).length;
    const feitas = minhas.filter((t) => t.feito).length;
    if (!diasAcordou && !diasPlanejou) return null;
    const pctRotina = minhas.length ? Math.round((feitas / minhas.length) * 100) : 0;
    return { pessoaId: p.id, nome: p.nome, funcaoCurta: p.funcaoCurta, valor: diasAcordou, detalhe: `${per.tipo === 'hoje' ? (diasAcordou ? 'acordou' : 'não acordou') : `acordou ${diasAcordou} de ${dias.length} dia${dias.length > 1 ? 's' : ''}`} · rotina ${pctRotina}% (${feitas}/${minhas.length})`, fraco: !diasAcordou };
  }), { pergunta: 'Quem acordou às 5 e cumpriu a rotina?', unidade: 'dias acordado', motivo: (id) => ((tarefasDe.get(id) || []).some((t) => (t.origem || '') !== 'xperf') ? 'não acordou' : 'não gerou a rotina'), totalRotulo: (t) => `${t} dia${t === 1 ? '' : 's'} acordado${t === 1 ? '' : 's'}` });

  // 3 · Lista: nomes qualificados na lista de networking (por quem criou o contato)
  const clientesDe = porPessoa(clientes.map((c) => ({ ...c, user_id: c.created_by_id || c.assigned_seller || null })));
  const h3 = monta(3, time.map((p) => {
    const meus = clientesDe.get(p.id) || [];
    const qualificados = meus.filter((c) => c.qualificacao_network && typeof c.qualificacao_network === 'object' && Object.keys(c.qualificacao_network).length);
    const noPeriodoQ = qualificados.filter((c) => !c.qualificacao_network?.em || dentro(c.qualificacao_network.em, per));
    const tarefasLista = (tarefasDe.get(p.id) || []).filter((t) => habitoDaTarefa(t) === 3 && t.feito).length;
    if (!qualificados.length && !tarefasLista) return null;
    return { pessoaId: p.id, nome: p.nome, funcaoCurta: p.funcaoCurta, valor: qualificados.length, detalhe: `${qualificados.length} qualificado${qualificados.length === 1 ? '' : 's'} de ${meus.length} na lista${noPeriodoQ.length !== qualificados.length ? ` · ${noPeriodoQ.length} ${per.rotulo}` : ''}${tarefasLista ? ` · ${tarefasLista} tarefa${tarefasLista > 1 ? 's' : ''} de lista` : ''}` };
  }), { pergunta: 'Quem qualificou a lista de networking?', unidade: 'nomes qualificados', motivo: (id) => ((clientesDe.get(id) || []).length ? 'lista sem qualificação' : 'sem lista'), totalRotulo: (t) => `${t} nome${t === 1 ? '' : 's'} qualificado${t === 1 ? '' : 's'}` });

  // 4 · Contato: contatos registrados no método (por quem registrou) + tarefas de contato feitas
  const contatosPor = new Map();
  for (const c of clientes) for (const r of (Array.isArray(c.contatos_metodo) ? c.contatos_metodo : [])) {
    if (!r?.registrado_por_id || !dentro(r.em, per)) continue;
    const x = contatosPor.get(r.registrado_por_id) || { feitos: 0, agendados: 0, semResposta: 0 };
    x.feitos += 1; if (r.resultado === 'agendado') x.agendados += 1; if (r.resultado === 'nao_atendeu') x.semResposta += 1;
    contatosPor.set(r.registrado_por_id, x);
  }
  const h4 = monta(4, time.map((p) => {
    const c = contatosPor.get(p.id); const tarefas4 = (tarefasDe.get(p.id) || []).filter((t) => habitoDaTarefa(t) === 4 && t.feito).length;
    if (!c && !tarefas4) return null;
    return { pessoaId: p.id, nome: p.nome, funcaoCurta: p.funcaoCurta, valor: c?.feitos || 0, detalhe: `${c?.feitos || 0} contato${(c?.feitos || 0) === 1 ? '' : 's'}${c?.agendados ? ` · ${c.agendados} agendado${c.agendados > 1 ? 's' : ''}` : ''}${c?.semResposta ? ` · ${c.semResposta} sem resposta` : ''}${tarefas4 ? ` · ${tarefas4} tarefa${tarefas4 > 1 ? 's' : ''} de contato feita${tarefas4 > 1 ? 's' : ''}` : ''}` };
  }), { pergunta: 'Quem fez contato?', unidade: 'contatos', motivo: () => 'nenhum contato registrado', totalRotulo: (t) => `${t} contato${t === 1 ? '' : 's'}` });

  // 5 · Apresentação: reuniões/apresentações feitas + reuniões de investimento marcadas
  const h5 = monta(5, time.map((p) => {
    const t5 = (tarefasDe.get(p.id) || []).filter((t) => habitoDaTarefa(t) === 5 && t.feito).length;
    const inv = oportunidades.filter((o) => o.responsavel_id === p.id && o.reuniao_em && dentro(o.reuniao_em, per)).length;
    if (!t5 && !inv) return null;
    return { pessoaId: p.id, nome: p.nome, funcaoCurta: p.funcaoCurta, valor: t5 + inv, detalhe: `${t5 ? `${t5} apresentaç${t5 === 1 ? 'ão' : 'ões'}` : ''}${t5 && inv ? ' · ' : ''}${inv ? `${inv} reuni${inv === 1 ? 'ão' : 'ões'} de investimento` : ''}` };
  }), { pergunta: 'Quem apresentou?', unidade: 'apresentações', motivo: () => 'nenhuma apresentação', totalRotulo: (t) => `${t} apresentaç${t === 1 ? 'ão' : 'ões'}` });

  // 6 · Fechamento: vendeu? fechou captação? follow-up
  const h6 = monta(6, time.map((p) => {
    const minhasVendas = vendas.filter((s) => donoDaVenda(s) === p.id && dentro(s.created_date, per));
    const soma = minhasVendas.reduce((s, v) => s + valorDaVenda(v), 0);
    const fechadas = oportunidades.filter((o) => o.responsavel_id === p.id && o.estagio === 'fechado_100' && dentro(o.fechado_em, per));
    const captado = fechadas.reduce((s, o) => s + (Number(o.valor_previsto) || 0), 0);
    const t6 = (tarefasDe.get(p.id) || []).filter((t) => habitoDaTarefa(t) === 6 && t.feito).length;
    if (!minhasVendas.length && !fechadas.length && !t6) return null;
    return { pessoaId: p.id, nome: p.nome, funcaoCurta: p.funcaoCurta, valor: soma + captado, detalhe: [minhasVendas.length ? `${minhasVendas.length} venda${minhasVendas.length > 1 ? 's' : ''} · ${fmtReais(soma)}` : null, fechadas.length ? `${fechadas.length} captaç${fechadas.length === 1 ? 'ão' : 'ões'} · ${fmtReais(captado)}` : null, t6 ? `${t6} follow-up${t6 > 1 ? 's' : ''}` : null].filter(Boolean).join(' · '), fraco: !minhasVendas.length && !fechadas.length };
  }), { pergunta: 'Quem vendeu e quem fechou?', unidade: 'R$', motivo: () => 'não vendeu', totalRotulo: (t) => fmtReais(t) });

  // 7 · Verificação: planejou o dia e registrou os números; atrasos
  const h7 = monta(7, time.map((p) => {
    const minhas = tarefasDe.get(p.id) || [];
    const dias = [...new Set(minhas.map((t) => dia(t.data)))];
    const planejou = dias.filter((d) => minhas.some((t) => dia(t.data) === d && (t.origem || '') !== 'xperf')).length;
    const t7 = minhas.filter((t) => habitoDaTarefa(t) === 7 && t.feito).length;
    const atrasadas = minhas.filter((t) => !t.feito && t.prazo_em && new Date(t.prazo_em).getTime() < Date.now() && dia(t.data) < String(hojeISO)).length;
    if (!planejou && !t7) return null;
    return { pessoaId: p.id, nome: p.nome, funcaoCurta: p.funcaoCurta, valor: t7, detalhe: `${per.tipo === 'hoje' ? (planejou ? 'planejou o dia' : 'não planejou') : `planejou ${planejou} de ${dias.length} dia${dias.length > 1 ? 's' : ''}`}${t7 ? ` · ${t7} verificaç${t7 === 1 ? 'ão' : 'ões'}` : ''}${atrasadas ? ` · ${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}` : ''}`, fraco: atrasadas > 0 };
  }), { pergunta: 'Quem planejou e verificou os números?', unidade: 'verificações', motivo: () => 'não planejou o dia', totalRotulo: (t) => `${t} verificaç${t === 1 ? 'ão' : 'ões'}` });

  // 8 · Duplicação: treinou alguém; entregável de duplicação validado
  const h8 = monta(8, time.map((p) => {
    const t8 = (tarefasDe.get(p.id) || []).filter((t) => habitoDaTarefa(t) === 8 && t.feito).length;
    const validados = entregaveis.filter((e) => e.dono_id === p.id && Number(e.habito) === 8 && e.coluna === 'entregue' && (!e.validado_em || dentro(e.validado_em, per))).length;
    if (!t8 && !validados) return null;
    return { pessoaId: p.id, nome: p.nome, funcaoCurta: p.funcaoCurta, valor: t8 + validados, detalhe: `${t8 ? `${t8} treinamento${t8 > 1 ? 's' : ''}` : ''}${t8 && validados ? ' · ' : ''}${validados ? `${validados} entregável${validados > 1 ? 'is' : ''} de duplicação validado${validados > 1 ? 's' : ''}` : ''}` };
  }), { pergunta: 'Quem treinou e duplicou?', unidade: 'treinamentos', motivo: () => 'não treinou ninguém', totalRotulo: (t) => `${t} treinamento${t === 1 ? '' : 's'}` });

  const habitos = [h1, h2, h3, h4, h5, h6, h7, h8];
  // o resumo: quem está inteiro (fez os 8), quem fez nada, e a média do time
  const porPessoaFez = new Map(time.map((p) => [p.id, habitos.filter((h) => h.fizeram.some((f) => f.pessoaId === p.id)).length]));
  return {
    periodo: per,
    habitos,
    resumo: {
      pessoas: time.length,
      mediaHabitos: time.length ? Math.round((([...porPessoaFez.values()].reduce((s, v) => s + v, 0) / time.length) * 10)) / 10 : 0,
      inteiros: [...porPessoaFez.entries()].filter(([, v]) => v === 8).map(([id]) => nomeDe(id)),
      zerados: [...porPessoaFez.entries()].filter(([, v]) => v === 0).map(([id]) => nomeDe(id)),
      acordaram: h2.quantos, venderam: h6.fizeram.filter((f) => !f.fraco).length, contatos: h4.total,
      porPessoa: [...porPessoaFez.entries()].map(([id, v]) => ({ pessoaId: id, nome: nomeDe(id), habitos: v })).sort((a, b) => b.habitos - a.habitos || a.nome.localeCompare(b.nome, 'pt-BR')),
    },
    diasComDado: diasDoPeriodo.size,
  };
}
