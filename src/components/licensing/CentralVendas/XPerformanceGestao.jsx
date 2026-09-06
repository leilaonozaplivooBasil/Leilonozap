import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, Wallet, Wrench, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import XGameAdmin from '@/components/licensing/XGameAdmin';
import {
  fmtReais, nomeExibicao, pesoAutomatico, porqueDoPeso, categoriaDaTarefa,
  fixoDoParticipante, inicioCicloOficial, fimCiclo, dataISO, PARTICIPANTE_PADRAO,
} from '@/lib/xgame';
import { distribuirDia, simularNovaTarefa, resumoDoCiclo, DIAS_FIXO, PESO_MIN, PESO_MAX } from '@/lib/distribuicaoFixo';

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
// O que NÃO mudou: quem participa, as verbas e o ciclo continuam sendo
// decididos no admin de sempre; esta tela não duplica nada disso.

const CATEGORIAS = [
  ['mentoria', 'Mentoria'], ['producao', 'Produção'], ['visao', 'Visão estratégica'], ['bonus', 'Bônus / estudo'],
];
const CARGO = { trainee: 'Trainee', executivo: 'Executivo', diretor: 'Diretor', ceo: 'CEO' };

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
  const [nova, setNova] = useState({ titulo: '', hora: '', peso: '', categoria: 'mentoria' });

  const nomeDe = useCallback((id) => {
    const u = usuarios.find((x) => x.id === id);
    return u ? nomeExibicao(u) : (id ? String(id).slice(0, 6) : '—');
  }, [usuarios]);

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
    if (!participantes.length || !diasCiclo.length) { setTarefasCiclo([]); return; }
    const ate = diasCiclo[diasCiclo.length - 1] > dia ? diasCiclo[diasCiclo.length - 1] : dia;
    const de = diasCiclo[0] < dia ? diasCiclo[0] : dia;
    const { data } = await supabase.from('metodo_tarefas')
      .select('id,user_id,data,hora,titulo,peso,categoria,feito,conferido,origem')
      .in('user_id', participantes.map((p) => p.user_id))
      .gte('data', de).lte('data', ate)
      .order('data').order('hora');
    setTarefasCiclo(data || []);
  }, [participantes, diasCiclo, dia]);
  useEffect(() => { carregarTarefas(); }, [carregarTarefas]);

  useEffect(() => { if (!pessoa && participantes.length) setPessoa(participantes[0].user_id); }, [participantes, pessoa]);

  const participante = participantes.find((p) => p.user_id === pessoa) || null;
  const ehProducao = (t) => { const c = categoriaDaTarefa(t); return c !== 'bonus' && c !== 'venda'; };
  const tarefasDoDia = useMemo(
    () => tarefasCiclo.filter((t) => t.user_id === pessoa && String(t.data).slice(0, 10) === dia),
    [tarefasCiclo, pessoa, dia],
  );

  // 🔮 A PRÉVIA: quanto vale a tarefa que está sendo digitada, e o que as
  // outras do dia perdem — antes de gravar qualquer coisa.
  const pesoEfetivo = nova.peso !== '' ? Number(nova.peso) : pesoAutomatico(nova.titulo);
  const previa = useMemo(() => {
    if (!participante) return null;
    const base = { ...PARTICIPANTE_PADRAO, ...participante };
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
    setNova({ titulo: '', hora: '', peso: '', categoria: nova.categoria });
    carregarTarefas();
  };

  // só o que nasceu aqui pode ser desfeito aqui — a rotina da pessoa é dela
  const desfazer = async (t) => {
    setTarefasCiclo((l) => l.filter((x) => x.id !== t.id));
    const { error } = await supabase.from('metodo_tarefas').delete().eq('id', t.id);
    if (error) { toast.error('Não apagou — recarregando'); carregarTarefas(); }
  };

  const salvarFixo = async (p, patch) => {
    const { error } = await supabase.from('xgame_participantes')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', p.id);
    if (error) { toast.error('Não salvou'); return; }
    setParticipantes((l) => l.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    toast.success(`${nomeDe(p.user_id)}: fixo atualizado — o valor do dia já mudou`);
  };

  // 💰 o ciclo de cada pessoa
  const resumoDe = (p) => {
    const base = { ...PARTICIPANTE_PADRAO, ...p };
    const porDia = {};
    for (const t of tarefasCiclo) {
      if (t.user_id !== p.user_id || !ehProducao(t)) continue;
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

        {!participantes.length ? (
          <p className="mt-3 text-[12px] text-amber-300/80">Ninguém no jogo ainda — cadastre os participantes na gestão do X-GAME, logo abaixo.</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <label className="text-[10px] text-white/45 uppercase tracking-wider">
                responsável
                <select value={pessoa} onChange={(e) => setPessoa(e.target.value)} className={`mt-1 block w-full ${campo}`} data-teste="pessoa">
                  {participantes.map((p) => (
                    <option key={p.user_id} value={p.user_id}>{nomeDe(p.user_id)} · {CARGO[p.cargo] || p.cargo}</option>
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
                  onChange={(e) => setNova((n) => ({ ...n, titulo: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') distribuir(); }}
                  placeholder='ex.: "Pegar as pautas da reunião de amanhã"'
                  className="mt-1 h-9 border-white/15 bg-white/[0.06] text-white placeholder:text-white/30"
                  data-teste="titulo"
                />
              </label>
              <label className="text-[10px] text-white/45 uppercase tracking-wider" title={nova.peso === '' ? `sugestão pelo título: ${porqueDoPeso(nova.titulo)}` : 'peso escolhido por você'}>
                peso {nova.peso === '' && <span className="normal-case text-white/30">(auto {pesoEfetivo})</span>}
                <select value={nova.peso} onChange={(e) => setNova((n) => ({ ...n, peso: e.target.value }))} className={`mt-1 block ${campo}`} data-teste="peso">
                  <option value="">automático</option>
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

            {/* 🔮 a prévia */}
            {previa && (
              <div className="mt-3 rounded-lg border border-white/10 p-3 text-[12px]" style={{ background: 'rgba(255,255,255,0.03)' }} data-teste="previa">
                <p className="text-white/60">
                  {fmtDia(dia)} de <span className="text-white font-bold">{nomeDe(pessoa)}</span> vale{' '}
                  <span className="text-white font-bold tabular-nums" data-teste="valor-dia">{fmtReais(previa.dist.valorDia)}</span>
                  <span className="text-white/35"> (fixo {fmtReais(previa.fixo)} ÷ {DIAS_FIXO} dias úteis)</span>
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

      {/* ── 2. 💰 O FIXO DE CADA UM ─────────────────────────────────────── */}
      {participantes.length > 0 && (
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-nz-verde" />
            <p className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">O fixo de cada um</p>
            <span className="text-[10px] text-white/35">· ciclo de {fmtDia(diasCiclo[0])} a {fmtDia(diasCiclo[diasCiclo.length - 1])}</span>
          </div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2" data-teste="fixos">
            {participantes.map((p) => {
              const base = { ...PARTICIPANTE_PADRAO, ...p };
              const r = resumoDe(p);
              const hojeDele = tarefasCiclo.filter((t) => t.user_id === p.user_id && ehProducao(t) && String(t.data).slice(0, 10) === hoje);
              const reguaHoje = distribuirDia({ fixoMes: fixoDoParticipante(base), minimoDia: base.minimo_dia, tarefas: hojeDele });
              return (
                <div key={p.id} className="rounded-xl border border-white/10 p-3" style={{ background: 'rgba(255,255,255,0.03)' }} data-teste="fixo-pessoa" data-pessoa={p.user_id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-extrabold text-white truncate">{nomeDe(p.user_id)} <span className="text-white/35 font-medium">· {CARGO[p.cargo] || p.cargo}</span></p>
                    <p className="text-[11px] text-white/50 shrink-0 tabular-nums"><span className="text-white font-bold" data-teste="valor-dia-pessoa">{fmtReais(r.valorDia)}</span> / dia útil</p>
                  </div>
                  <div className="mt-2 flex items-center gap-3 flex-wrap text-[10px] text-white/45 uppercase tracking-wider">
                    <label>fixo mensal R$
                      <input
                        type="number" min="0" step="50"
                        defaultValue={p.fixo_mes ?? p.verba_producao ?? ''}
                        onBlur={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v !== Number(p.fixo_mes)) salvarFixo(p, { fixo_mes: v }); }}
                        className={`ml-1 w-24 ${campo} normal-case tabular-nums`}
                        data-teste="fixo-mes"
                      />
                    </label>
                    <label>mínimo / dia
                      <input
                        type="number" min="1" max="30"
                        defaultValue={p.minimo_dia ?? 3}
                        onBlur={(e) => { const v = Math.max(1, Math.round(Number(e.target.value) || 0)); if (v !== Number(p.minimo_dia ?? 3)) salvarFixo(p, { minimo_dia: v }); }}
                        className={`ml-1 w-14 ${campo} normal-case tabular-nums`}
                        data-teste="minimo-dia"
                      />
                    </label>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-center">
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
                </div>
              );
            })}
          </div>
        </div>
      )}

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
