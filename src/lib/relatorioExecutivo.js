// 📄 O RELATÓRIO DO EXECUTIVO — o que vai pro PDF de cada um (dono, 06/09/2026).
//
// "Quero geração de PDF de cada executivo, pra ser compartilhado. Mais
// organizado, mais limpo, mais bonito." Este arquivo monta o CONTEÚDO do
// relatório — puro, sem jsPDF, sem React — pra ser provado em Node e desenhado
// por quem quiser (o PDF, o texto do WhatsApp, a tela). A leitura vem da mesma
// fonte da X-Performance: os 8 Hábitos da pessoa (habitosDoTime), as metas do
// mês (progressoDasMetas), as demandas do Painel Corporativo e a produção da
// semana (producaoDaSemana).
//
// Aqui também moram as regras de LIMPEZA que o dono pediu pra tela ("com 16
// pessoas o 'não fez' explode"): o nome bonito (o painel guarda "JOSÉ
// AMÂNCIO" e "DISTRIBUIDOR") e o agrupamento de quem não fez pelo motivo —
// "sem quadro dos sonhos: Jean, Karen, +6" em vez de dezesseis etiquetas.

const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'del', 'della', 'van', 'von']);

/** "JOSÉ AMÂNCIO" → "José Amâncio"; "maria de souza" → "Maria de Souza"; siglas de 2–3 letras ficam (ex.: "JR"). */
export function nomeBonito(nome) {
  const s = String(nome || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return s.split(' ').map((p, i) => {
    const baixo = p.toLocaleLowerCase('pt-BR');
    if (i > 0 && CONECTIVOS.has(baixo)) return baixo;
    if (/^[A-Z]{2,3}\.?$/.test(p) && i > 0) return p; // "JR", "II" no fim continuam siglas
    // apóstrofo e hífen: "Sant'Anna", "Ana-Clara"
    return baixo.replace(/(^|['-])(\p{L})/gu, (m, sep, letra) => sep + letra.toLocaleUpperCase('pt-BR'));
  }).join(' ');
}

/** O primeiro nome, bonito. */
export const primeiroNome = (nome) => nomeBonito(nome).split(' ')[0] || '';

/**
 * Quem não fez, agrupado pelo motivo — o que a tela mostra em vez de um chip
 * por pessoa. Grupos maiores primeiro; dentro, ordem alfabética.
 * → [{ motivo, pessoas: [{pessoaId, nome}], quantos }]
 */
export function agruparPorMotivo(naoFizeram = []) {
  const m = new Map();
  for (const p of naoFizeram) {
    const k = p.motivo || 'não fez';
    (m.get(k) || m.set(k, []).get(k)).push({ pessoaId: p.pessoaId, nome: p.nome });
  }
  return [...m.entries()]
    .map(([motivo, pessoas]) => ({ motivo, pessoas: pessoas.sort((a, b) => nomeBonito(a.nome).localeCompare(nomeBonito(b.nome), 'pt-BR')), quantos: pessoas.length }))
    .sort((a, b) => b.quantos - a.quantos || a.motivo.localeCompare(b.motivo, 'pt-BR'));
}

/**
 * Os 8 Hábitos de UMA pessoa, tirados da leitura do time (habitosDoTime).
 * → [{ n, nome, sub, fez, fraco, texto }] — `texto` é o detalhe (fez) ou o motivo (não fez).
 */
export function habitosDaPessoa(oito, pessoaId) {
  return (oito?.habitos || []).map((h) => {
    const f = h.fizeram.find((x) => x.pessoaId === pessoaId);
    const nf = h.naoFizeram.find((x) => x.pessoaId === pessoaId);
    return { n: h.n, nome: h.nome, curto: h.curto, sub: h.sub, fez: !!f, fraco: !!f?.fraco, texto: f ? (f.detalhe || 'fez') : (nf?.motivo || 'não fez') };
  });
}

const fmtReais = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDia = (iso) => { const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`); return Number.isNaN(d.getTime()) ? String(iso || '') : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };
const fmtDiaLongo = (iso) => { const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`); return Number.isNaN(d.getTime()) ? String(iso || '') : d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }); };
const ORIGEM = { encontro: 'encontro de segunda', ceo: 'CEO', diretor: 'diretoria', gestao: 'gestão' };
const semAcentoArquivo = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/**
 * O relatório inteiro, pronto pra virar PDF/texto.
 *
 * pessoa      = { id, nome, posicao (nome do nível), funcaoCurta, fixo }
 * periodo     = { tipo, de, ate, rotulo } (periodoDe)
 * habitos     = habitosDaPessoa(oito, id)
 * metas       = progressoDasMetas(...) → [{rotulo, feito, alvo, unidade, pct, noRitmo}]
 * demandas    = xperf_demandas da pessoa, cada uma com `estado` opcional (estadoDaDemanda)
 * producao    = producaoDaSemana(...) → {total, concluidas, pct, semAgendar, atrasadas}
 * semaforo    = {cor, motivos}
 */
export function relatorioDoExecutivo({ pessoa, periodo, habitos = [], metas = [], demandas = [], producao = null, semaforo = null, hojeISO, geradoPor = null, mes } = {}) {
  const nome = nomeBonito(pessoa?.nome);
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const mesRef = mes || hoje.slice(0, 7);
  const feitos = habitos.filter((h) => h.fez).length;
  const periodoRotulo = !periodo || periodo.tipo === 'hoje' ? `hoje, ${fmtDiaLongo(hoje)}` : `${periodo.rotulo} (${fmtDia(periodo.de)} a ${fmtDia(periodo.ate)})`;

  const recebidas = demandas.filter((d) => d.status === 'recebida');
  const andamento = demandas.filter((d) => d.status === 'agendada' && d.estado?.id !== 'conferida');
  const concluidas = demandas.filter((d) => d.status === 'agendada' && d.estado?.id === 'conferida');
  const devolvidas = demandas.filter((d) => d.status === 'devolvida');
  const linhaDemanda = (d, estado) => ({
    texto: d.titulo,
    apoio: [ORIGEM[d.origem] || d.origem, d.criado_por_nome ? nomeBonito(d.criado_por_nome) : null, d.prazo_em ? `até ${fmtDia(d.prazo_em)}` : null, d.habito ? `H${d.habito}` : null].filter(Boolean).join(' · '),
    estado,
  });

  const blocos = [
    {
      id: 'habitos', titulo: `Os 8 Hábitos do Sucesso · ${periodoRotulo}`,
      resumo: `${feitos} de 8`,
      linhas: habitos.map((h) => ({ n: h.n, texto: `${h.n}. ${h.nome}`, apoio: h.texto, cor: h.fez ? (h.fraco ? 'amarelo' : 'verde') : 'vermelho', fez: h.fez })),
    },
    {
      id: 'metas', titulo: `Metas de ${mesRef.slice(5)}/${mesRef.slice(0, 4)}`,
      resumo: metas.length ? `${metas.filter((m) => m.noRitmo).length} de ${metas.length} no ritmo` : 'sem meta definida',
      linhas: metas.map((m) => ({ texto: m.rotulo, apoio: `${m.unidade === 'R$' ? fmtReais(m.feito) : m.feito} de ${m.unidade === 'R$' ? fmtReais(m.alvo) : m.alvo}${m.unidade && m.unidade !== 'R$' ? ` ${m.unidade}` : ''}`, pct: Math.min(100, Number(m.pct) || 0), cor: m.noRitmo ? 'verde' : 'amarelo' })),
    },
    {
      id: 'demandas', titulo: 'Demandas recebidas',
      resumo: demandas.length ? `${recebidas.length} pra agendar · ${andamento.length} em andamento · ${concluidas.length} conferida${concluidas.length === 1 ? '' : 's'}${devolvidas.length ? ` · ${devolvidas.length} devolvida${devolvidas.length === 1 ? '' : 's'}` : ''}` : 'nenhuma demanda',
      linhas: [
        ...recebidas.map((d) => linhaDemanda(d, { rotulo: 'sem agendar', cor: 'amarelo' })),
        ...andamento.map((d) => linhaDemanda(d, { rotulo: d.estado?.rotulo || 'agendada', cor: d.estado?.id === 'atrasada' ? 'vermelho' : 'azul' })),
        ...concluidas.map((d) => linhaDemanda(d, { rotulo: 'conferida', cor: 'verde' })),
        ...devolvidas.map((d) => linhaDemanda(d, { rotulo: `devolvida${d.devolvida_motivo ? `: ${d.devolvida_motivo}` : ''}`, cor: 'cinza' })),
      ],
    },
  ];
  if (producao) {
    blocos.push({
      id: 'producao', titulo: 'Produção da semana',
      resumo: `${producao.concluidas} de ${producao.total} demanda${producao.total === 1 ? '' : 's'} concluída${producao.total === 1 ? '' : 's'} · ${producao.pct}%${producao.semAgendar ? ` · ${producao.semAgendar} sem agendar` : ''}${producao.atrasadas ? ` · ${producao.atrasadas} atrasada${producao.atrasadas === 1 ? '' : 's'}` : ''}`,
      linhas: [],
    });
  }

  return {
    titulo: 'X-Performance · Relatório do Executivo',
    marca: 'Top College · X-EOS',
    pessoa: { id: pessoa?.id, nome, posicao: pessoa?.posicao || null, funcao: pessoa?.funcaoCurta || null, fixo: pessoa?.fixo ? fmtReais(pessoa.fixo) : null },
    semaforo: semaforo ? { cor: semaforo.cor, texto: semaforo.motivos?.length ? semaforo.motivos.join(' · ') : 'tudo em dia' } : null,
    numeros: [
      { rotulo: 'Hábitos', valor: `${feitos}/8`, cor: feitos >= 6 ? 'verde' : feitos >= 3 ? 'amarelo' : 'vermelho' },
      { rotulo: 'Metas no ritmo', valor: metas.length ? `${metas.filter((m) => m.noRitmo).length}/${metas.length}` : '—', cor: !metas.length ? 'cinza' : metas.every((m) => m.noRitmo) ? 'verde' : 'amarelo' },
      { rotulo: 'Demandas', valor: producao ? `${producao.concluidas}/${producao.total}` : `${concluidas.length}/${demandas.length}`, cor: (producao?.atrasadas || 0) ? 'vermelho' : 'azul' },
      { rotulo: 'Sem agendar', valor: String(recebidas.length), cor: recebidas.length ? 'amarelo' : 'verde' },
    ],
    periodoRotulo,
    blocos,
    rodape: `Gerado em ${fmtDiaLongo(hoje)}${geradoPor ? ` por ${nomeBonito(geradoPor)}` : ''} · Leilão no Zap · Top College`,
    nomeArquivo: `x-performance-${semAcentoArquivo(nome) || 'executivo'}-${hoje}.pdf`,
  };
}

/** O mesmo relatório em texto — pra colar no WhatsApp quando o aparelho não compartilha arquivo. */
export function textoDoRelatorio(rel) {
  const BOLA = { verde: '🟢', amarelo: '🟡', vermelho: '🔴', azul: '🔵', cinza: '⚪' };
  const l = [];
  l.push(`*${rel.titulo}*`);
  l.push(`*${rel.pessoa.nome}*${rel.pessoa.posicao ? ` · ${rel.pessoa.posicao}` : ''}${rel.pessoa.funcao ? ` · ${rel.pessoa.funcao}` : ''}`);
  if (rel.semaforo) l.push(`${BOLA[rel.semaforo.cor] || ''} ${rel.semaforo.texto}`);
  l.push('');
  for (const b of rel.blocos) {
    l.push(`*${b.titulo}* — ${b.resumo}`);
    for (const x of b.linhas) l.push(`${BOLA[x.cor || x.estado?.cor] || '•'} ${x.texto}${x.apoio ? ` — ${x.apoio}` : ''}${x.estado ? ` (${x.estado.rotulo})` : ''}`);
    l.push('');
  }
  l.push(`_${rel.rodape}_`);
  return l.join('\n');
}

/** Só o que a fonte padrão do PDF (Helvetica, Latin-1) desenha — o resto vira o parente mais próximo. */
export function paraPdf(texto) {
  return String(texto ?? '')
    .replace(/[—–]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/…/g, '...').replace(/→/g, '->').replace(/[✓✔]+/g, 'ok').replace(/×/g, 'x')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^ -ÿ]/g, '?')
    .replace(/\s+/g, ' ').trim();
}
