import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, Wallet, Wrench, ChevronDown, X, UserRound, GraduationCap, Zap } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import XGameAdmin from '@/components/licensing/XGameAdmin';
import {
  fmtReais, nomeExibicao, pesoAutomatico, categoriaDaTarefa, valoresDasTarefas,
  fixoDoParticipante, inicioCicloOficial, fimCiclo, dataISO, PARTICIPANTE_PADRAO,
} from '@/lib/xgame';
import { distribuirDia, simularNovaTarefa, resumoDoCiclo, DIAS_FIXO, PESO_MIN, PESO_MAX } from '@/lib/distribuicaoFixo';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { ROTINA_PADRAO, gerarTarefasDaRotina } from '@/lib/metodo';
import { MENTALIDADES, mentalidadeDe, mentalidadePadrao, pesoComMentalidade, ensinamentoDaTarefa, planejamentoDoDia, resumoPorMentalidade, habitoDe } from '@/lib/mentalidades';

// 🎯 A GESTÃO DENTRO DO X-PERFORMANCE — o antigo Admin X-GAME mais a
// distribuição do fixo, num lugar só. Só o super admin chega aqui.
//
// DE ONDE VEIO (ditado pelo dono em 06/09/2026): "junta o Admin do X-Game com
// o X-Performance, que lá eu já administro a gamificação e as demandas. Ali
// eu boto a tarefa — 'pegar as pautas da reunião de amanhã' —, pego o time
// corporativo, seleciono o responsável, isso já entra na tarefa do dia dele e
// já vai entrar quanto equivale de dinheiro dentro do fixo mensal. O sistema
// tem que me avisar: essa tarefa tem peso x, vale x em dinheiro, e
// automaticamente vai ser tirado das outras."
//
// AS TRÊS PARTES, na ordem em que o dono usa:
//   1. 🎯 DISTRIBUIR TAREFA — o "menu suspenso": pessoa, dia, título, peso.
//      Antes de gravar, a prévia mostra quanto a tarefa vale E quanto cada
//      uma das outras do dia perde. A conta é a de src/lib/distribuicaoFixo.
//      Gravar = uma linha em metodo_tarefas (origem 'xperf'): é a MESMA
//      tabela do Compromisso da pessoa, então aparece na lista dela na hora.
//   2. 💰 O FIXO DE CADA UM — fixo mensal e mínimo diário por pessoa, o valor
//      do dia útil e o ciclo: ganho, a conferir, em jogo, perdido.
//   3. 🛠️ GESTÃO DO X-GAME — o admin de sempre (participantes, verbas, ciclo,
//      conferência dupla, comprovações), embutido e dobrado.
//
// O que NÃO mudou: as verbas e o ciclo continuam sendo decididos no admin de
// sempre; esta tela não duplica nada disso.
//
// 🔁 SEGUNDA RODADA (dono, mesmo dia, olhando a tela no ar): "bem pontual,
// bem devagar":
//   • QUEM APARECE vem do PAINEL DE CONTROLE — o time corporativo, do Sócio
//     Executivo ao Embaixador (src/lib/timeCorporativo), com a função de lá.
//     Não é mais a lista de participantes do jogo: quem ainda não tem fixo
//     definido entra com a verba padrão até você definir.
//   • O FIXO DE CADA UM virou um menu suspenso: escolhe a pessoa e abre o
//     MODAL dela — em vez de vinte cartões um embaixo do outro.
//   • O PESO nasce preenchido sozinho assim que a tarefa é escrita (a regra
//     do dono pelo título, com o motivo ao lado); mexer no peso trava o seu.
//
// 🎓 TERCEIRA RODADA (dono, mesmo dia): "planejamento com ensinamento".
//   • Toda tarefa distribuída leva uma MENTALIDADE (executivo / diretor /
//     CEO — as trilhas do X-Performance) e o Hábito que serve; o peso ganha o
//     acréscimo da mentalidade e o `detalhe` recebe o ENSINAMENTO de como
//     aquela mentalidade trabalha (src/lib/mentalidades). É o que a pessoa lê
//     no Compromisso dela, embaixo do título.
//   • O modal da pessoa abre a gamificação inteira: se o planejamento do dia
//     foi gerado (a Rotina Perfeita) ou não — e um botão pra gerar daqui —,
//     e o resumo do ciclo por mentalidade.

const CATEGORIAS = [
  ['mentoria', 'Mentoria'], ['producao', 'Produção'], ['visao', 'Visão estratégica'], ['bonus', 'Bônus / estudo'],
];

/** Próximo dia útil a partir de amanhã (o dono distribui "pra amanhã"). */
export function proximoDiaUtil(hojeISO) {
  const d = new Date(`${hojeISO}T12:00:00`);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return dataISO(d);
}

/** Os dias úteis do ciclo, em ISO. */
function diasDoCicloISO(inicio) {
  const dias = [];
  const fim = fimCiclo(inicio);
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  while (d <= fim) {
    if (d.getDay() !== 0 && d.getDay() !== 6) dias.push(dataISO(d));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

const fmtDia = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

const campo = 'rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-white/40';

export default function XPerformanceGestao({ currentUser, hojeISO }) {
  const hoje = hojeISO || dataISO();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [participantes, setParticipantes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cicloConfig, setCicloConfig] = useState(null);
  const [tarefasCiclo, setTarefasCiclo] = useState([]);
  const [adminAberto, setAdminAberto] = useState(false);

  // o formulário do "menu suspenso"
  const [pessoa, setPessoa] = useState('');
  const [dia, setDia] = useState(() => proximoDiaUtil(hoje));
  const [nova, setNova] = useState({ titulo: '', hora: '', peso: 3, pesoManual: false, categoria: 'mentoria', mentalidade: '', habito: '' });
  const [gerando, setGerando] = useState(false);
  // o menu suspenso do fixo: a pessoa escolhida abre o modal dela
  const [pessoaFixo, setPessoaFixo] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  const nomeDe = useCallback((id) => {
    const u = usuarios.find((x) => x.id === id);
    return u ? nomeExibicao(u) : (id ? String(id).slice(0, 6) : '—');
  }, [usuarios]);

  // 🏛️ o time corporativo, do painel de controle — nome e função de lá
  const equipe = useMemo(() => timeCorporativo(usuarios, nomeExibicao), [usuarios]);
  const funcaoDe = (id) => equipe.find((p) => p.id === id)?.funcao || '—';
  // o cadastro do jogo da pessoa (fixo, mínimo) — ou o padrão, até ser definido
  const participanteDe = useCallback((id) => {
    const p = participantes.find((x) => x.user_id === id);
    if (p) return { ...PARTICIPANTE_PADRAO, ...p, temFixo: p.fixo_mes !== null && p.fixo_mes !== undefined };
    const membro = equipe.find((x) => x.id === id);
    return { ...PARTICIPANTE_PADRAO, user_id: id, cargo: membro?.cargo || 'executivo', temFixo: false, semCadastro: true };
  }, [participantes, equipe]);

  const inicio = useMemo(() => inicioCicloOficial(cicloConfig, new Date(`${hoje}T12:00:00`)), [cicloConfig, hoje]);
  const diasCiclo = useMemo(() => diasDoCicloISO(inicio), [inicio]);

  const carregar = useCallback(async () => {
    const [p, u, c] = await Promise.all([
      supabase.from('xgame_participantes').select('*').eq('ativo', true).order('created_date'),
      supabase.from('app_users').select('id,full_name,nickname,role,career_levels').order('full_name'),
      supabase.from('xgame_config').select('ciclo_inicio').eq('id', 'atual').maybeSingle(),
    ]);
    setParticipantes(p.data || []);
    setUsuarios(u.data || []);
    setCicloConfig(c.data?.ciclo_inicio ? String(c.data.ciclo_inicio).slice(0, 10) : null);
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // as tarefas do ciclo de todo mundo — é daqui que sai "a distribuição de
  // todas as tarefas" e a prévia do dia escolhido
  const carregarTarefas = useCallback(async () => {
    if (!equipe.length || !diasCiclo.length) { setTarefasCiclo([]); return; }
    const ate = diasCiclo[diasCiclo.length - 1] > dia ? diasCiclo[diasCiclo.length - 1] : dia;
    const de = diasCiclo[0] < dia ? diasCiclo[0] : dia;
    const { data } = await supabase.from('metodo_tarefas')
      .select('id,user_id,data,hora,titulo,peso,categoria,feito,conferido,origem,mentalidade,habito')
      .in('user_id', equipe.map((p) => p.id))
      .gte('data', de).lte('data', ate)
      .order('data').order('hora');
    setTarefasCiclo(data || []);
  }, [equipe, diasCiclo, dia]);
  useEffect(() => { carregarTarefas(); }, [carregarTarefas]);

  useEffect(() => { if (!pessoa && equipe.length) setPessoa(equipe[0].id); }, [equipe, pessoa]);

  const participante = pessoa ? participanteDe(pessoa) : null;
  // a mentalidade nasce da trilha da pessoa (pelo cargo) e pode ser trocada
  const mentalidadeAtual = nova.mentalidade || mentalidadePadrao(participante?.cargo);
  const mentalidadeObj = mentalidadeDe(mentalidadeAtual);
  const ehProducao = (t) => { const c = categoriaDaTarefa(t); return c !== 'bonus' && c !== 'venda'; };
  const tarefasDoDia = useMemo(
    () => tarefasCiclo.filter((t) => t.user_id === pessoa && String(t.data).slice(0, 10) === dia),
    [tarefasCiclo, pessoa, dia],
  );

  // 🔮 A PRÉVIA: quanto vale a tarefa que está sendo digitada, e o que as
  // outras do dia perdem — antes de gravar qualquer coisa.
  // 🪄 assim que a tarefa é escrita, o peso nasce sozinho: a regra do dono
  // pelo título + o acréscimo da mentalidade; quem mexeu no peso mantém o
  // seu até limpar o campo
  const pesoSugerido = pesoComMentalidade(nova.titulo, mentalidadeAtual);
  const pesoEfetivo = nova.pesoManual ? (Number(nova.peso) || 3) : pesoSugerido.peso;
  const mudarTitulo = (titulo) => setNova((n) => ({ ...n, titulo, pesoManual: titulo.trim() ? n.pesoManual : false }));
  const ensinamento = ensinamentoDaTarefa({ mentalidade: mentalidadeAtual, habito: nova.habito });
  const previa = useMemo(() => {
    if (!participante) return null;
    const base = participante;
    const producao = tarefasDoDia.filter(ehProducao);
    const dist = distribuirDia({ fixoMes: fixoDoParticipante(base), minimoDia: base.minimo_dia, tarefas: producao });
    const cat = nova.categoria;
    const entraNoFixo = cat !== 'bonus' && cat !== 'venda';
    const sim = entraNoFixo
      ? simularNovaTarefa({ fixoMes: fixoDoParticipante(base), minimoDia: base.minimo_dia, tarefas: producao, novaPeso: pesoEfetivo })
      : null;
    return { dist, sim, entraNoFixo, fixo: fixoDoParticipante(base) };
  }, [participante, tarefasDoDia, nova.categoria, pesoEfetivo]);

  const distribuir = async () => {
    if (!pessoa || !nova.titulo.trim()) { toast.error('Escolha a pessoa e diga qual é a tarefa.'); return; }
    setSalvando(true);
    const linha = {
      user_id: pessoa, data: dia, hora: nova.hora || null, titulo: nova.titulo.trim(),
      feito: false, ordem: tarefasDoDia.length, categoria: nova.categoria, peso: pesoEfetivo,
      origem: 'xperf', criado_por_id: currentUser?.id || null,
      // 🎓 a mentalidade, o Hábito e o ensinamento que a pessoa vai ler
      mentalidade: mentalidadeAtual, habito: nova.habito ? Number(nova.habito) : null,
      detalhe: ensinamento || null,
    };
    const { error } = await supabase.from('metodo_tarefas').insert(linha);
    setSalvando(false);
    if (error) { toast.error('Não distribuiu a tarefa — tenta de novo'); return; }
    const valor = previa?.sim?.valorNova;
    toast.success(
      valor != null
        ? `Tarefa distribuída pra ${nomeDe(pessoa)}: vale ${fmtReais(valor)} — as outras do dia foram recalculadas`
        : `Tarefa distribuída pra ${nomeDe(pessoa)}`,
    );
    setNova({ titulo: '', hora: '', peso: 3, pesoManual: false, categoria: nova.categoria, mentalidade: nova.mentalidade, habito: '' });
    carregarTarefas();
  };

  // ⚡ gerar o planejamento do dia da pessoa daqui — a MESMA conta do
  // Compromisso e do admin: a rotina dela (metodo_perfil) ou a Rotina do
  // Método, com peso automático e categoria deduzida
  const gerarPlanejamento = async (userId, diaISO) => {
    setGerando(true);
    try {
      const { data: perfil } = await supabase.from('metodo_perfil').select('rotina').eq('user_id', userId).maybeSingle();
      const rotina = Array.isArray(perfil?.rotina) && perfil.rotina.length ? perfil.rotina : ROTINA_PADRAO;
      const linhas = gerarTarefasDaRotina(rotina, userId, diaISO).map((l) => ({
        ...l, peso: pesoAutomatico(l.titulo), categoria: categoriaDaTarefa({ titulo: l.titulo }),
      }));
      const { error } = await supabase.from('metodo_tarefas').insert(linhas);
      if (error) throw error;
      toast.success(`Planejamento de ${fmtDia(diaISO)} gerado pra ${nomeDe(userId)}: ${linhas.length} tarefas da Rotina Perfeita`);
      carregarTarefas();
    } catch {
      toast.error('Não gerou o planejamento — tenta de novo');
    } finally { setGerando(false); }
  };

  // só o que nasceu aqui pode ser desfeito aqui — a rotina da pessoa é dela
  const desfazer = async (t) => {
    setTarefasCiclo((l) => l.filter((x) => x.id !== t.id));
    const { error } = await supabase.from('metodo_tarefas').delete().eq('id', t.id);
    if (error) { toast.error('Não apagou — recarregando'); carregarTarefas(); }
  };

  // grava o fixo/mínimo; quem ainda não tinha cadastro no jogo ganha um
  // (user_id é único na tabela — o upsert cria ou atualiza)
  const salvarFixo = async (p, patch) => {
    const linha = p.semCadastro
      ? { user_id: p.user_id, cargo: p.cargo, ativo: true, ...patch, updated_at: new Date().toISOString() }
      : { user_id: p.user_id, ...patch, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('xgame_participantes').upsert(linha, { onConflict: 'user_id' }).select();
    if (error) { toast.error('Não salvou'); return; }
    const gravada = Array.isArray(data) ? data[0] : data;
    setParticipantes((l) => {
      const existe = l.some((x) => x.user_id === p.user_id);
      return existe
        ? l.map((x) => (x.user_id === p.user_id ? { ...x, ...patch } : x))
        : [...l, { ...PARTICIPANTE_PADRAO, ...(gravada || linha), ...patch }];
    });
    toast.success(`${nomeDe(p.user_id)}: fixo atualizado — o valor do dia já mudou`);
  };

  // 💰 o ciclo de cada pessoa
  const resumoDe = (userId) => {
    const base = participanteDe(userId);
    const porDia = {};
    for (const t of tarefasCiclo) {
      if (t.user_id !== userId || !ehProducao(t)) continue;
      const d = String(t.data).slice(0, 10);
      (porDia[d] ||= []).push(t);
    }
    return resumoDoCiclo({ fixoMes: fixoDoParticipante(base), minimoDia: base.minimo_dia, tarefasPorDia: porDia, diasDoCiclo: diasCiclo, hojeISO: hoje });
  };

  if (carregando) {
    return <div className="py-6 text-center text-white/40"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;
  }

  const valoresDoDia = previa?.dist.valores || {};

  return (
    <div className="space-y-5" data-teste="gestao">
      {/* ── 1. 🎯 DISTRIBUIR TAREFA ─────────────────────────────────────── */}
      <div className="rounded-xl border border-white/15 p-3 sm:p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-nz-verde" />
          <p className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">Distribuir tarefa</p>
        </div>
        <p className="mt-1 text-[11px] text-white/40">
          Escolhe quem, o dia e a tarefa. Antes de gravar, a prévia diz quanto ela vale e o que as outras do dia perdem — a soma do dia nunca passa do fixo.
        </p>

        {!equipe.length ? (
          <p className="mt-3 text-[12px] text-amber-300/80">Ninguém do time corporativo no painel de controle ainda (do Sócio Executivo ao Embaixador).</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <label className="text-[10px] text-white/45 uppercase tracking-wider">
                responsável
                <select value={pessoa} onChange={(e) => setPessoa(e.target.value)} className={`mt-1 block w-full ${campo}`} data-teste="pessoa">
                  {equipe.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome} · {p.funcao}</option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] text-white/45 uppercase tracking-wider">
                dia
                <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className={`mt-1 block ${campo}`} data-teste="dia" />
              </label>
              <label className="text-[10px] text-white/45 uppercase tracking-wider">
                hora
                <input type="time" value={nova.hora} onChange={(e) => setNova((n) => ({ ...n, hora: e.target.value }))} className={`mt-1 block ${campo}`} />
              </label>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <label className="text-[10px] text-white/45 uppercase tracking-wider">
                qual é a tarefa
                <Input
                  value={nova.titulo}
                  onChange={(e) => mudarTitulo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') distribuir(); }}
                  placeholder='ex.: "Pegar as pautas da reunião de amanhã"'
                  className="mt-1 h-9 border-white/15 bg-white/[0.06] text-white placeholder:text-white/30"
                  data-teste="titulo"
                />
              </label>
              <label className="text-[10px] text-white/45 uppercase tracking-wider" title={nova.pesoManual ? 'peso escolhido por você' : `gerado pelo título e pela mentalidade: ${pesoSugerido.porque}`}>
                peso {nova.pesoManual
                  ? <button type="button" onClick={() => setNova((n) => ({ ...n, pesoManual: false }))} className="normal-case text-nz-verde hover:underline" data-teste="peso-auto">(voltar ao automático)</button>
                  : <span className="normal-case text-white/30" data-teste="peso-motivo">{nova.titulo.trim() ? `· ${pesoSugerido.porque}` : '(automático)'}</span>}
                <select value={pesoEfetivo} onChange={(e) => setNova((n) => ({ ...n, peso: Number(e.target.value), pesoManual: true }))} className={`mt-1 block ${campo}`} data-teste="peso">
                  {Array.from({ length: PESO_MAX - PESO_MIN + 1 }, (_, i) => PESO_MIN + i).map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="text-[10px] text-white/45 uppercase tracking-wider">
                categoria
                <select value={nova.categoria} onChange={(e) => setNova((n) => ({ ...n, categoria: e.target.value }))} className={`mt-1 block ${campo}`}>
                  {CATEGORIAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </select>
              </label>
            </div>

            {/* 🎓 a mentalidade e o Hábito — o ensinamento que vai junto */}
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-[auto_auto_1fr] gap-2 items-start">
              <label className="text-[10px] text-white/45 uppercase tracking-wider">
                mentalidade
                <select value={mentalidadeAtual} onChange={(e) => setNova((n) => ({ ...n, mentalidade: e.target.value, habito: '' }))} className={`mt-1 block ${campo}`} data-teste="mentalidade">
                  {MENTALIDADES.map((m) => <option key={m.id} value={m.id}>{m.nome}{m.acrescimo ? ` (+${m.acrescimo} no peso)` : ''}</option>)}
                </select>
              </label>
              <label className="text-[10px] text-white/45 uppercase tracking-wider">
                hábito
                <select value={nova.habito} onChange={(e) => setNova((n) => ({ ...n, habito: e.target.value }))} className={`mt-1 block ${campo}`} data-teste="habito">
                  <option value="">—</option>
                  {(mentalidadeObj?.foco || []).map((n) => { const h = habitoDe(n); return <option key={n} value={n}>{n} · {h?.completo || ''}</option>; })}
                </select>
              </label>
              <div className="rounded-lg border border-white/10 px-2.5 py-2 text-[11px] text-white/60 whitespace-pre-line sm:mt-4" style={{ background: 'rgba(255,255,255,0.03)' }} data-teste="ensinamento">
                <span className="inline-flex items-center gap-1 text-white/40 text-[10px] uppercase tracking-wider"><GraduationCap className="w-3 h-3" /> o que a pessoa vai ler embaixo da tarefa</span>
                {'\n'}{ensinamento}
              </div>
            </div>

            {/* 🔮 a prévia */}
            {previa && (
              <div className="mt-3 rounded-lg border border-white/10 p-3 text-[12px]" style={{ background: 'rgba(255,255,255,0.03)' }} data-teste="previa">
                <p className="text-white/60">
                  {fmtDia(dia)} de <span className="text-white font-bold">{nomeDe(pessoa)}</span> vale{' '}
                  <span className="text-white font-bold tabular-nums" data-teste="valor-dia">{fmtReais(previa.dist.valorDia)}</span>
                  <span className="text-white/35"> (fixo {fmtReais(previa.fixo)} ÷ {DIAS_FIXO} dias úteis)</span>
                  {!participante?.temFixo && <span className="text-amber-300/80" data-teste="sem-fixo"> · sem fixo definido: usando a verba padrão — defina no modal da pessoa</span>}
                  {' · '}{tarefasDoDia.length} tarefa{tarefasDoDia.length === 1 ? '' : 's'} no dia
                </p>
                {previa.entraNoFixo ? (
                  <>
                    <p className="mt-1.5 text-white">
                      Esta tarefa (peso {pesoEfetivo}) vale{' '}
                      <span className="font-extrabold text-nz-verde tabular-nums" data-teste="valor-nova">{fmtReais(previa.sim.valorNova)}</span>
                    </p>
                    {previa.sim.quedas.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-[11px] text-white/55" data-teste="quedas">
                        {previa.sim.quedas.slice(0, 6).map((q) => {
                          const t = tarefasDoDia.find((x) => x.id === q.id);
                          return (
                            <li key={q.id} className="flex items-center gap-2">
                              <span className="truncate">{t?.titulo || q.id}</span>
                              <span className="ml-auto shrink-0 tabular-nums">
                                {fmtReais(q.de)} <span className="text-white/30">→</span>{' '}
                                <span className={q.para < q.de ? 'text-amber-300' : 'text-nz-verde'}>{fmtReais(q.para)}</span>
                              </span>
                            </li>
                          );
                        })}
                        {previa.sim.quedas.length > 6 && <li className="text-white/35">+ {previa.sim.quedas.length - 6} outras recalculadas</li>}
                      </ul>
                    )}
                    {previa.sim.faltam > 0 && (
                      <p className="mt-1 text-[11px] text-amber-300/90" data-teste="faltam">
                        Com ela o dia paga {fmtReais(previa.sim.pagoDepois)}: ainda falta{previa.sim.faltam > 1 ? 'm' : ''} {previa.sim.faltam} tarefa{previa.sim.faltam > 1 ? 's' : ''} pro mínimo de {previa.dist.minimoDia} — o resto fica em aberto.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1.5 text-white/60">Bônus não sai do fixo: reparte a verba de bônus do dia entre as tarefas de estudo.</p>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={distribuir} disabled={salvando || !nova.titulo.trim()} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 text-[11px]" data-teste="distribuir">
                {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                Distribuir tarefa
              </Button>
              <span className="text-[10px] text-white/35">entra na hora no Compromisso da pessoa, no dia escolhido</span>
            </div>

            {/* as tarefas do dia escolhido, já com o valor de cada uma */}
            {tarefasDoDia.length > 0 && (
              <ul className="mt-3 space-y-1" data-teste="tarefas-dia">
                {tarefasDoDia.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px]" style={{ background: 'rgba(255,255,255,0.02)' }} data-origem={t.origem || ''}>
                    <span className="text-white/40 tabular-nums w-10 shrink-0">{t.hora ? String(t.hora).slice(0, 5) : '—'}</span>
                    <span className={`truncate ${t.feito ? 'line-through text-white/40' : 'text-white/85'}`}>{t.titulo}</span>
                    {t.mentalidade && <span className="shrink-0 rounded-full border border-white/15 px-1.5 text-[9px] uppercase tracking-wider text-white/50" title={mentalidadeDe(t.mentalidade)?.nome}>{t.mentalidade}{t.habito ? ` · H${t.habito}` : ''}</span>}
                    <span className="text-white/30 shrink-0">peso {t.peso ?? 3}</span>
                    <span className="ml-auto shrink-0 font-bold tabular-nums text-white/80">{ehProducao(t) ? fmtReais(valoresDoDia[t.id] || 0) : 'bônus'}</span>
                    {t.origem === 'xperf' && (
                      <button type="button" onClick={() => desfazer(t)} title="desfazer (só tarefa distribuída aqui)" className="text-white/30 hover:text-red-300" aria-label={`desfazer ${t.titulo}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* ── 2. 💰 O FIXO DE CADA UM — menu suspenso, e o modal da pessoa ── */}
      {equipe.length > 0 && (
        <div className="rounded-xl border border-white/15 p-3 sm:p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-nz-verde" />
            <p className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">O fixo de cada um</p>
            <span className="text-[10px] text-white/35">· ciclo de {fmtDia(diasCiclo[0])} a {fmtDia(diasCiclo[diasCiclo.length - 1])}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <select
              value={pessoaFixo}
              onChange={(e) => { setPessoaFixo(e.target.value); if (e.target.value) setModalAberto(true); }}
              className={`${campo} min-w-[240px]`}
              data-teste="pessoa-fixo"
            >
              <option value="">escolha a pessoa…</option>
              {equipe.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} · {p.funcao}{participanteDe(p.id).temFixo ? '' : ' · sem fixo'}</option>
              ))}
            </select>
            <Button size="sm" onClick={() => { if (pessoaFixo) setModalAberto(true); }} disabled={!pessoaFixo} className="bg-white/10 hover:bg-white/20 text-white h-8 text-[11px]" data-teste="abrir-pessoa">
              <UserRound className="w-3.5 h-3.5 mr-1" /> abrir
            </Button>
            <span className="text-[10px] text-white/35">{equipe.length} no time corporativo (do painel de controle) · {equipe.filter((p) => participanteDe(p.id).temFixo).length} com fixo definido</span>
          </div>
        </div>
      )}

      {modalAberto && pessoaFixo && (() => {
        const base = participanteDe(pessoaFixo);
        const r = resumoDe(pessoaFixo);
        const hojeDele = tarefasCiclo.filter((t) => t.user_id === pessoaFixo && ehProducao(t) && String(t.data).slice(0, 10) === hoje);
        const reguaHoje = distribuirDia({ fixoMes: fixoDoParticipante(base), minimoDia: base.minimo_dia, tarefas: hojeDele });
        // os dias do ciclo com tarefa, de hoje em diante — o que está distribuído
        const proximos = [...new Set(tarefasCiclo.filter((t) => t.user_id === pessoaFixo && String(t.data).slice(0, 10) >= hoje).map((t) => String(t.data).slice(0, 10)))].sort().slice(0, 8);
        return (
          <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4" data-teste="modal-pessoa" data-pessoa={pessoaFixo}>
            <div className="absolute inset-0 bg-black/70" onClick={() => setModalAberto(false)} />
            <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/15 p-4 text-white" style={{ background: 'var(--xeos-preto, #00020C)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold truncate">{nomeDe(pessoaFixo)}</p>
                  <p className="text-[11px] text-white/45">{funcaoDe(pessoaFixo)} <span className="text-white/25">· função do painel de controle</span></p>
                </div>
                <button type="button" onClick={() => setModalAberto(false)} aria-label="Fechar" className="rounded-lg p-1.5 text-white/50 hover:bg-white/10"><X className="w-4 h-4" /></button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-white/50 tabular-nums"><span className="text-white font-bold text-[14px]" data-teste="valor-dia-pessoa">{fmtReais(r.valorDia)}</span> / dia útil</p>
                {!base.temFixo && <span className="text-[10px] text-amber-300/80" data-teste="sem-fixo-modal">sem fixo definido · usando {fmtReais(fixoDoParticipante(base))}</span>}
              </div>
              <div className="mt-2 flex items-center gap-3 flex-wrap text-[10px] text-white/45 uppercase tracking-wider">
                <label>fixo mensal R$
                  <input
                    key={`fixo-${pessoaFixo}`}
                    type="number" min="0" step="50"
                    defaultValue={base.temFixo ? base.fixo_mes : ''}
                    placeholder={String(fixoDoParticipante(base))}
                    onBlur={(e) => { if (e.target.value === '') return; const v = Number(e.target.value); if (Number.isFinite(v) && (!base.temFixo || v !== Number(base.fixo_mes))) salvarFixo(base, { fixo_mes: v }); }}
                    className={`ml-1 w-28 ${campo} normal-case tabular-nums`}
                    data-teste="fixo-mes"
                  />
                </label>
                <label>mínimo / dia
                  <input
                    key={`min-${pessoaFixo}`}
                    type="number" min="1" max="30"
                    defaultValue={base.minimo_dia ?? 3}
                    onBlur={(e) => { const v = Math.max(1, Math.round(Number(e.target.value) || 0)); if (v !== Number(base.minimo_dia ?? 3)) salvarFixo(base, { minimo_dia: v }); }}
                    className={`ml-1 w-14 ${campo} normal-case tabular-nums`}
                    data-teste="minimo-dia"
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1 text-center">
                {[
                  ['ganho', r.ganho, 'text-nz-verde'], ['a conferir', r.aConferir, 'text-amber-300'],
                  ['em jogo', r.emJogo, 'text-white/70'], ['perdido', r.perdido, 'text-red-300'],
                ].map(([rotulo, v, cor]) => (
                  <div key={rotulo} className="rounded-md border border-white/10 py-1">
                    <p className={`text-[12px] font-bold tabular-nums ${cor}`}>{fmtReais(v)}</p>
                    <p className="text-[9px] text-white/35 uppercase tracking-wider">{rotulo}</p>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-white/40">
                hoje: {hojeDele.length} tarefa{hojeDele.length === 1 ? '' : 's'}
                {reguaHoje.faltam > 0
                  ? <span className="text-amber-300/80"> · faltam {reguaHoje.faltam} pro mínimo de {reguaHoje.minimoDia} ({fmtReais(reguaHoje.emAberto)} em aberto)</span>
                  : ' · mínimo batido'}
              </p>

              {/* 🗓️ o planejamento do dia: gerou ou não gerou? */}
              {(() => {
                const doDia = tarefasCiclo.filter((t) => t.user_id === pessoaFixo && String(t.data).slice(0, 10) === hoje);
                const plano = planejamentoDoDia(doDia);
                return (
                  <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] ${plano.gerado ? 'border-white/10 text-white/60' : 'border-red-400/40 text-red-200'}`} style={{ background: plano.gerado ? 'rgba(255,255,255,0.03)' : 'rgba(248,113,113,0.08)' }} data-teste="planejamento-dia" data-gerado={plano.gerado ? 'sim' : 'nao'}>
                    {plano.gerado ? (
                      <p><span className="font-bold text-white">Planejamento de hoje gerado</span> · {plano.daRotina} da rotina{plano.distribuidas ? ` + ${plano.distribuidas} distribuída${plano.distribuidas > 1 ? 's' : ''}` : ''} · {plano.feitas} feita{plano.feitas === 1 ? '' : 's'}</p>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="flex-1 min-w-[160px]"><span className="font-bold">⚠️ Não gerou o planejamento de hoje</span>{plano.distribuidas ? ` · só ${plano.distribuidas} tarefa${plano.distribuidas > 1 ? 's' : ''} distribuída${plano.distribuidas > 1 ? 's' : ''}` : ' · dia vazio'}</p>
                        <Button size="sm" onClick={() => gerarPlanejamento(pessoaFixo, hoje)} disabled={gerando} className="bg-amber-400 hover:bg-amber-300 text-amber-950 h-7 text-[11px] font-extrabold" data-teste="gerar-planejamento">
                          {gerando ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />} gerar a Rotina Perfeita dele
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 🎓 o ciclo por mentalidade */}
              {(() => {
                const doCiclo = tarefasCiclo.filter((t) => t.user_id === pessoaFixo);
                const porDia = {};
                for (const t of doCiclo) (porDia[String(t.data).slice(0, 10)] ||= []).push(t);
                const valores = {};
                for (const lista of Object.values(porDia)) Object.assign(valores, valoresDasTarefas(lista, base));
                const r = resumoPorMentalidade(doCiclo, valores);
                return (
                  <div className="mt-3" data-teste="por-mentalidade">
                    <p className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">O ciclo por mentalidade</p>
                    <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-1">
                      {[...MENTALIDADES.map((m) => [m.id, m.nome.replace('Mentalidade do ', '')]), ['rotina', 'Rotina']].map(([id, rotulo]) => (
                        <div key={id} className="rounded-md border border-white/10 px-2 py-1" data-mentalidade={id}>
                          <p className="text-[9px] text-white/35 uppercase tracking-wider">{rotulo}</p>
                          <p className="text-[12px] font-bold text-white tabular-nums">{r[id].n} <span className="text-white/40 font-medium">tarefa{r[id].n === 1 ? '' : 's'}</span></p>
                          <p className="text-[10px] text-white/50 tabular-nums">peso {r[id].peso} · {fmtReais(r[id].valor)}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-1 text-[10px] text-white/35">{mentalidadeDe(mentalidadePadrao(base.cargo))?.nome}: a trilha dela hoje — {mentalidadeDe(mentalidadePadrao(base.cargo))?.lema.toLowerCase()}.</p>
                  </div>
                );
              })()}

              {proximos.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">Distribuído de hoje em diante</p>
                  <ul className="mt-1 space-y-0.5 text-[11px]" data-teste="proximos">
                    {proximos.map((d) => {
                      const doDia = tarefasCiclo.filter((t) => t.user_id === pessoaFixo && String(t.data).slice(0, 10) === d);
                      const dist = distribuirDia({ fixoMes: fixoDoParticipante(base), minimoDia: base.minimo_dia, tarefas: doDia.filter(ehProducao) });
                      return (
                        <li key={d} className="flex items-center gap-2 text-white/60">
                          <span className="w-24 shrink-0">{fmtDia(d)}</span>
                          <span className="truncate">{doDia.length} tarefa{doDia.length === 1 ? '' : 's'}{dist.faltam ? ` · faltam ${dist.faltam}` : ''}</span>
                          <span className="ml-auto tabular-nums text-white/80">{fmtReais(dist.pago)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={() => { setPessoa(pessoaFixo); setModalAberto(false); }} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 text-[11px]">
                  <Send className="w-3.5 h-3.5 mr-1" /> distribuir tarefa pra {nomeDe(pessoaFixo).split(' ')[0]}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 3. 🛠️ GESTÃO DO X-GAME (o admin de sempre, dobrado) ────────── */}
      <div className="rounded-xl border border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <button
          type="button"
          onClick={() => setAdminAberto((v) => !v)}
          aria-expanded={adminAberto}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
          data-teste="abrir-admin"
        >
          <Wrench className="w-4 h-4 text-nz-verde" />
          <span className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">Gestão do X-GAME</span>
          <span className="text-[10px] text-white/35">· participantes, verbas, ciclo, conferência dupla e comprovações</span>
          <ChevronDown className={`ml-auto w-4 h-4 text-white/40 transition-transform ${adminAberto ? 'rotate-180' : ''}`} />
        </button>
        {adminAberto && (
          <div className="xeos-cru rounded-b-xl bg-white p-3 text-gray-900">
            <XGameAdmin />
          </div>
        )}
      </div>
    </div>
  );
}
