import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Users, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { timeCorporativo, contasForaDoTime } from '@/lib/timeCorporativo';
import { funcaoDaPessoaComOrigem } from '@/lib/funcoes';
import { getLevel } from '@/lib/careerLevels';
import { visaoExecutiva } from '@/lib/encontro';
import { habitosDoTime, periodoDe } from '@/lib/habitosDoTime';
import { segundaDaSemana } from '@/lib/xperformance';
import { isSalePago, isVendaMercadoria } from '@/lib/crmUnifiedCustomers';
import { nomeBonito, primeiroNome, habitosDaPessoa } from '@/lib/relatorioExecutivo';
import PainelCorporativo from '@/components/licensing/CentralVendas/PainelCorporativo';
import PdfExecutivo from '@/components/licensing/CentralVendas/PdfExecutivo';
import { Semaforo } from '@/components/licensing/CentralVendas/VerificacaoUI';

// 🏆 X-PERFORMANCE — a versão SEM administração (dono, 06/09/2026):
// "a X-Performance vai abrir os oito hábitos do sucesso do time, numa visão
// executiva… quem vendeu, quem não vendeu. Expor mesmo, com riqueza de
// detalhes, sem ficar sujo. E o painel corporativo de cada um." O
// administrativo (X-Game, distribuir tarefa) ficou na ADM X-Game.
//
// A ORGANIZAÇÃO (dono, 06/09): "em cima os NÚMEROS da equipe toda, sem nome,
// bem executivo. Embaixo o detalhamento de cada um, já com uma prévia na
// primeira linha; quando clicar abre tudo dele e dali gera o PDF."
//
// A LIMPEZA DE SÊNIOR (dono, 07/09: "está ficando muito confuso… deixe fluido"):
//   • contas institucionais (site, distribuidor, live) saem do time — eram 3 de
//     16 e deixavam a média e o "sem nenhum hábito" desonestos;
//   • quem não teve atividade vai pra UM grupo fechado embaixo ("Sem atividade
//     hoje (11): nomes…") em vez de catorze linhas de "dia vazio · 0/0 · — · não fez";
//   • cor só onde é sinal: "não fez" deixou de ser vermelho; o semáforo passou a
//     considerar dia vazio como furo (amarelo), pra não dizer "está bem" pra
//     quem não planejou;
//   • largura máxima, tipografia maior, os 8 Hábitos numa linha só no desktop;
//   • se "hoje" está vazio pra todo mundo, abre em "semana" e avisa;
//   • vazio que fala: "—" e "ninguém ainda" no lugar de "0 de 0 · 0%";
//   • "só o meu" (quem tem visão total): o time vira só a própria pessoa.

const caixa = { background: 'rgba(255,255,255,0.03)' };
const titulo = 'text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase';
const fmtDia = (iso) => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
const somaDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** Um número do time: rótulo pequeno em cima, número grande embaixo. Nenhum nome.
 * 07/09 (dono, na print): "está muito feio assim, encaixado — pode expandir
 * tudo, pegando até o final da tela, muito fluido, só aberto pra ler bem
 * legal". O número virou o protagonista do cartão. */
function Numero({ rotulo, valor, apoio = null, alerta = false }) {
  return (
    <div className="px-5 py-6 sm:px-7 sm:py-8">
      <p className="text-[11px] sm:text-xs text-white/40 uppercase tracking-wider truncate">{rotulo}</p>
      <p className={`mt-2 text-[34px] sm:text-[42px] lg:text-[48px] font-black tabular-nums leading-none ${alerta ? 'text-red-300' : 'text-white'}`}>{valor}</p>
      {apoio && <p className="mt-2 text-[12px] sm:text-[13px] text-white/35 truncate">{apoio}</p>}
    </div>
  );
}

/** Um Hábito do time em número: quantos de quantos, %, barra e o total. Sem nome. */
function HabitoDoTime({ h }) {
  return (
    <div className="p-5 sm:p-6" data-teste="habito" data-n={h.n} data-quantos={h.quantos}>
      <p className="text-[12.5px] sm:text-[13px] font-bold text-white leading-tight truncate" title={`${h.nome} · ${h.pergunta}`}><span className="text-white/35 font-bold tabular-nums mr-1.5">{String(h.n).padStart(2, '0')}</span>{h.nome}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-[32px] sm:text-[36px] font-black tabular-nums leading-none text-white" data-teste="habito-quantos">{h.quantos}<span className="text-[12px] font-bold text-white/35"> de {h.deQuantos}</span></p>
        <p className="text-[12px] font-bold tabular-nums text-white/50">{h.pct}%</p>
      </div>
      <div className="mt-3 h-[4px] rounded-full bg-white/[0.08] overflow-hidden"><div className="h-full rounded-full bg-white/60 transition-[width]" style={{ width: `${h.pct}%` }} /></div>
      <p className="mt-2 text-[11.5px] text-white/40 tabular-nums truncate">{h.quantos === 0 ? 'ninguém ainda' : `${h.totalRotulo} no time`}</p>
    </div>
  );
}

/** Os 8 Hábitos de UMA pessoa, com o detalhe: fez (e quanto) ou não fez (e por quê). */
function HabitosDaPessoa({ habitos }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.08)' }} data-teste="habitos-pessoa">
      {habitos.map((h) => (
        <div key={h.n} className="px-3 py-2.5" style={{ background: '#05070F' }} data-teste="habito-pessoa" data-n={h.n} data-fez={h.fez ? 'sim' : 'nao'}>
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${h.fez ? (h.fraco ? 'bg-amber-400' : 'bg-nz-verde') : 'bg-red-500/80'}`} />
            <p className="text-[12px] font-bold text-white truncate flex-1" title={h.nome}><span className="text-white/35 tabular-nums mr-1">{String(h.n).padStart(2, '0')}</span>{h.curto || h.nome}</p>
          </div>
          <p className={`mt-1 text-[11.5px] leading-snug ${h.fez ? (h.fraco ? 'text-amber-200/80' : 'text-white/70') : 'text-white/45'}`}>{h.texto}</p>
        </div>
      ))}
    </div>
  );
}

export default function PerformanceEquipe({ currentUser, hojeISO, gestao = false, soEu = false }) {
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const segunda = segundaDaSemana(hoje);
  const domingo = somaDias(segunda, 6);
  const [periodoTipo, setPeriodoTipo] = useState('hoje');
  const [avisoPeriodo, setAvisoPeriodo] = useState(null);
  const ajustouPeriodo = useRef(false);
  const periodo = useMemo(() => periodoDe(periodoTipo, hoje), [periodoTipo, hoje]);
  const [usuarios, setUsuarios] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [demandas, setDemandas] = useState([]);
  const [tarefasDasDemandas, setTarefasDasDemandas] = useState([]);
  const [cards, setCards] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [entregaveis, setEntregaveis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pessoaId, setPessoaId] = useState(currentUser?.id || null); // quem está aberto no detalhamento
  const [relatorio, setRelatorio] = useState(null); // o relatório de quem está aberto (vem do painel, pro PDF do cabeçalho)
  const [mostrarVazias, setMostrarVazias] = useState(false); // o grupo "sem atividade" aberto em linhas
  const [versao, setVersao] = useState(0); // recarrega quando o painel de baixo mexe

  // a janela de tarefas cobre a semana E o período escolhido (o mês pode ser maior)
  const de = periodo.de < segunda ? periodo.de : segunda;
  const ate = periodo.ate > domingo ? periodo.ate : domingo;

  const carregar = useCallback(async () => {
    const [u, p, t, d, pf, cl, v, o, e] = await Promise.all([
      supabase.from('app_users').select('id,full_name,nickname,role,career_levels,primary_career_level').order('full_name'),
      supabase.from('xgame_participantes').select('user_id,funcao_titulo,cargo').eq('ativo', true),
      supabase.from('metodo_tarefas').select('id,user_id,data,hora,titulo,habito,feito,conferido,origem,prazo_em,pronto_em,categoria').gte('data', de).lte('data', ate),
      supabase.from('xperf_demandas').select('*').gte('created_at', `${segunda}T00:00:00`).order('created_at'),
      supabase.from('metodo_perfil').select('user_id,sonhos'),
      supabase.from('customers').select('id,created_by_id,assigned_seller,qualificacao_network,contatos_metodo'),
      supabase.from('catalog_sales').select('id,status,kind,created_date,total_amount,seller_id,operator_id').gte('created_date', `${de}T00:00:00`),
      supabase.from('captacao_oportunidades').select('id,responsavel_id,estagio,valor_previsto,fechado_em,reuniao_em'),
      supabase.from('xperf_entregaveis').select('id,dono_id,habito,coluna,validado_em'),
    ]);
    setUsuarios(u.data || []); setParticipantes(p.data || []); setTarefas(t.data || []); setDemandas(d.data || []);
    setPerfis(pf.data || []); setClientes(cl.data || []);
    setVendas((v.data || []).filter((s) => isSalePago(s) && isVendaMercadoria(s)));
    setOportunidades(o.data || []); setEntregaveis(e.data || []);
    const idsT = (d.data || []).map((x) => x.tarefa_id).filter(Boolean);
    const idsC = (d.data || []).map((x) => x.card_id).filter(Boolean);
    const [tt, ct] = await Promise.all([
      idsT.length ? supabase.from('metodo_tarefas').select('id,feito,conferido,pronto_em').in('id', idsT) : Promise.resolve({ data: [] }),
      idsC.length ? supabase.from('metodo_quadro').select('id,coluna').in('id', idsC) : Promise.resolve({ data: [] }),
    ]);
    setTarefasDasDemandas(tt.data || []); setCards(ct.data || []);
    setCarregando(false);
  }, [segunda, de, ate]);
  useEffect(() => { carregar(); }, [carregar, versao]);

  const timeTodo = useMemo(() => timeCorporativo(usuarios).map((p) => {
    const part = participantes.find((x) => x.user_id === p.id);
    const { funcao } = funcaoDaPessoaComOrigem({ funcaoTitulo: part?.funcao_titulo, nivel: p.nivel, nome: p.nome });
    return { ...p, funcaoId: funcao?.id || null, funcaoCurta: funcao?.curto || funcao?.nome || null };
  }), [usuarios, participantes]);
  // 👤 "só o meu": o time vira só a própria pessoa — todos os números e a tabela seguem
  const time = useMemo(() => (soEu ? timeTodo.filter((p) => p.id === currentUser?.id) : timeTodo), [timeTodo, soEu, currentUser?.id]);
  const contas = useMemo(() => contasForaDoTime(usuarios).length, [usuarios]);
  const abrir = (id) => { setRelatorio(null); setPessoaId((atual) => (atual === id ? null : id)); };
  const trocar = (id) => { setRelatorio(null); setPessoaId(id); };
  const proprioForaDoTime = !!currentUser?.id && !timeTodo.some((p) => p.id === currentUser.id);

  const tarefasDaSemana = useMemo(() => tarefas.filter((t) => String(t.data).slice(0, 10) >= segunda && String(t.data).slice(0, 10) <= domingo), [tarefas, segunda, domingo]);
  const visao = useMemo(() => visaoExecutiva({ time, tarefas: tarefasDaSemana, demandas, tarefasDasDemandas, cards, hojeISO: hoje, segunda }), [time, tarefasDaSemana, demandas, tarefasDasDemandas, cards, hoje, segunda]);
  const oito = useMemo(() => habitosDoTime({ time, tarefas, perfis, clientes, vendas, oportunidades, entregaveis, periodo, hojeISO: hoje }), [time, tarefas, perfis, clientes, vendas, oportunidades, entregaveis, periodo, hoje]);
  const r = oito.resumo;
  const rotuloPeriodo = periodoTipo !== 'hoje' ? `${oito.periodo.rotulo} (${fmtDia(oito.periodo.de)} a ${fmtDia(oito.periodo.ate)})` : `hoje · ${fmtDia(hoje)}`;
  const habDe = (id) => r.porPessoa.find((p) => p.pessoaId === id)?.habitos || 0;

  // 📅 período inteligente: se "hoje" está vazio pra todo mundo, mostra a semana e avisa (uma vez)
  useEffect(() => {
    if (carregando || ajustouPeriodo.current || !time.length) return;
    ajustouPeriodo.current = true;
    if (periodoTipo === 'hoje' && r.porPessoa.every((p) => p.habitos === 0) && visao.planejaramHoje === 0) {
      setPeriodoTipo('semana');
      setAvisoPeriodo('hoje ainda não tem dado — mostrando a semana');
    }
  }, [carregando, time.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const escolherPeriodo = (id) => { setPeriodoTipo(id); setAvisoPeriodo(null); };

  // 🧹 a tabela: quem tem algo em cima; quem não tem nada vai pro grupo fechado
  const vazia = (l) => habDe(l.pessoaId) === 0 && !l.demandas.total && (periodoTipo === 'hoje' ? l.hoje.vazio : l.semana.total === 0);
  const ativas = visao.linhas.filter((l) => !vazia(l));
  const vazias = visao.linhas.filter(vazia);
  const grupoAberto = mostrarVazias || vazias.some((l) => l.pessoaId === pessoaId);
  const linhasVisiveis = grupoAberto ? visao.linhas : ativas;
  const abrirDoGrupo = (id) => { setMostrarVazias(true); trocar(id); };

  const linhaDe = (l) => {
    const hab = habDe(l.pessoaId);
    const aberto = l.pessoaId === pessoaId;
    return (
      <React.Fragment key={l.pessoaId}>
        <tr onClick={() => abrir(l.pessoaId)} className={`cursor-pointer border-t border-white/[0.07] hover:bg-white/[0.04] ${aberto ? 'bg-white/[0.06]' : ''}`} data-teste="visao-linha" data-pessoa={l.pessoaId} data-cor={l.cor} data-produziu={l.produziu ? 'sim' : 'nao'} data-aberto={aberto ? 'sim' : 'nao'}>
          <td className="py-2 pr-3">
            <div className="flex items-center gap-2"><Semaforo cor={l.cor} /><span className="font-bold text-white truncate">{nomeBonito(l.nome)}</span></div>
            <p className="text-[11px] text-white/40 pl-[18px]">{l.nivel ? getLevel(l.nivel).name : ''}{l.funcaoCurta ? ` · ${l.funcaoCurta}` : ''}</p>
          </td>
          <td className="py-2 pr-3 tabular-nums">
            <div className="flex items-center gap-2"><span className={`font-bold ${hab === 0 ? 'text-white/35' : 'text-white'}`}>{hab}/8</span>
              <span className="flex gap-0.5">{oito.habitos.map((h) => <span key={h.n} className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: h.fizeram.some((f) => f.pessoaId === l.pessoaId) ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.12)' }} title={h.nome} />)}</span>
            </div>
          </td>
          <td className="py-2 pr-3 tabular-nums">{l.hoje.vazio ? <span className="text-white/30">—</span> : <><span className={l.hoje.planejou ? 'text-white/80' : 'text-amber-300'}>{l.hoje.planejou ? 'planejou' : 'não planejou'}</span><span className="text-white/45"> · {l.hoje.feitas}/{l.hoje.total} feitas</span></>}</td>
          <td className="py-2 pr-3 tabular-nums">{l.semana.total ? <><span className="text-white/80">{l.semana.feitas} de {l.semana.total} feita{l.semana.total === 1 ? '' : 's'}</span>{l.semana.atrasadas ? <span className="text-red-300"> · {plural(l.semana.atrasadas, 'atrasada', 'atrasadas')}</span> : null}</> : <span className="text-white/30">—</span>}</td>
          <td className="py-2 pr-3 tabular-nums">{l.demandas.total ? <><span className="text-white/80">{l.demandas.concluidas}/{l.demandas.total}</span>{l.demandas.semAgendar ? <span className="text-amber-300"> · {l.demandas.semAgendar} sem agendar</span> : null}{l.demandas.atrasadas ? <span className="text-red-300"> · {plural(l.demandas.atrasadas, 'atrasada', 'atrasadas')}</span> : null}</> : <span className="text-white/30">—</span>}</td>
          <td className="py-2 text-white/40 text-right">{aberto ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />}</td>
        </tr>
        {aberto && (
          <tr className="border-t border-white/[0.07]" data-teste="detalhe-pessoa" data-pessoa={l.pessoaId}>
            <td colSpan={6} className="p-0">
              <div className="my-2 rounded-xl border border-white/15 p-3 sm:p-4 space-y-3" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Semaforo cor={l.cor} tamanho="grande" />
                  <p className="text-[17px] font-extrabold">{nomeBonito(l.nome)}</p>
                  <p className="text-[12px] text-white/50">{l.nivel ? getLevel(l.nivel).name : ''}{l.funcaoCurta ? ` · ${l.funcaoCurta}` : ''}</p>
                  <span className="text-[11px] text-white/35">· {hab} de 8 Hábitos {oito.periodo.rotulo}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <PdfExecutivo relatorio={relatorio} />
                    <button type="button" onClick={() => abrir(l.pessoaId)} className="text-[11px] text-white/40 hover:text-white inline-flex items-center gap-0.5" data-teste="fechar-detalhe"><ChevronUp className="w-3 h-3" /> fechar</button>
                  </div>
                </div>
                <div>
                  <p className={`${titulo} mb-1.5`}>Os 8 Hábitos de {primeiroNome(l.nome)} · {rotuloPeriodo}</p>
                  <HabitosDaPessoa habitos={habitosDaPessoa(oito, l.pessoaId)} />
                </div>
                <PainelCorporativo key={l.pessoaId} currentUser={currentUser} hojeISO={hoje} gestao={gestao} pessoaInicial={l.pessoaId} onMudou={() => setVersao((v) => v + 1)} onPessoa={trocar} onRelatorio={setRelatorio} habitos={habitosDaPessoa(oito, l.pessoaId)} periodo={periodo} embutido />
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
                  <span className="text-[11px] text-white/35">compartilhar este executivo</span>
                  <PdfExecutivo relatorio={relatorio} />
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4 text-white w-full max-w-[1900px] mx-auto" data-teste="performance-equipe" data-periodo={periodoTipo} data-so-eu={soEu ? 'sim' : 'nao'}>
      {/* ── 1. os números do time (nenhum nome) ──
          07/09 (dono, na print): "está muito feio assim, encaixado — pode
          expandir tudo, pegando até o final da tela, deixando muito bonito,
          muito fluido, só aberto pra ler bem legal". O cartão passou a usar a
          largura inteira disponível (a página já tira o padding lateral na
          Top College) e ganhou muito mais respiro por dentro. */}
      <div className="rounded-2xl border border-white/10 p-5 sm:p-7 lg:p-9" style={caixa} data-teste="oito-habitos">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={titulo}><Trophy className="w-3 h-3 inline mr-1" />X-Performance · {soEu ? 'os meus números' : 'os números do time'}</p>
          <span className="text-[11px] text-white/35">· {plural(r.pessoas, 'pessoa', 'pessoas')} · {rotuloPeriodo}{!soEu && contas > 0 ? ` · ${plural(contas, 'conta institucional fora do time', 'contas institucionais fora do time')}` : ''}</span>
          {avisoPeriodo && <span className="text-[11px] text-amber-200/90" data-teste="aviso-periodo">· {avisoPeriodo}</span>}
          <div className="ml-auto flex gap-1" role="tablist" data-teste="periodo">
            {[['hoje', 'hoje'], ['semana', 'semana'], ['mes', 'mês']].map(([id, rotulo]) => (
              <button key={id} type="button" role="tab" aria-selected={periodoTipo === id} onClick={() => escolherPeriodo(id)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${periodoTipo === id ? 'bg-white text-black' : 'border border-white/15 text-white/60 hover:text-white'}`} data-periodo={id}>{rotulo}</button>
            ))}
          </div>
        </div>
        {carregando ? <p className="mt-2 text-[12px] text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> lendo o time…</p> : time.length === 0 ? <p className="mt-2 text-[12px] text-amber-300/80">{soEu ? 'Você não está no time corporativo do painel — troque pra "Tudo" pra ver o time.' : 'Ninguém do time corporativo (executivo ao embaixador) no painel de controle ainda.'}</p> : (
          <>
            {/* os seis números, numa régua só, agora grande e espaçosa */}
            <div className="mt-5 sm:mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 rounded-2xl border border-white/10 divide-x divide-y sm:divide-y-0 divide-white/10 overflow-hidden" data-teste="oito-resumo">
              <Numero rotulo="média de hábitos" valor={`${r.mediaHabitos.toLocaleString('pt-BR')} de 8`} apoio="por pessoa" />
              <Numero rotulo="com os 8 inteiros" valor={String(r.inteiros.length)} apoio={`de ${r.pessoas}`} />
              <Numero rotulo="sem nenhum hábito" valor={String(r.zerados.length)} apoio={`de ${r.pessoas}`} alerta={r.zerados.length > 0} />
              <Numero rotulo="acordaram às 5" valor={`${r.acordaram} de ${r.pessoas}`} />
              <Numero rotulo="contatos feitos" valor={r.contatos ? String(r.contatos) : '—'} apoio={r.contatos ? 'no time' : 'nenhum ainda'} />
              <Numero rotulo="venderam ou fecharam" valor={`${r.venderam} de ${r.pessoas}`} />
            </div>

            {/* os oito Hábitos, uma linha só no desktop, também ampliados */}
            <div className="mt-5 sm:mt-6 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-px rounded-2xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.08)' }} data-teste="oito-cartoes">
              {oito.habitos.map((h) => <div key={h.n} style={{ background: '#05070F' }}><HabitoDoTime h={h} /></div>)}
            </div>
          </>
        )}
      </div>

      {/* ── 2. o detalhamento por pessoa ── */}
      <div className="rounded-xl border border-white/10 p-3 sm:p-4" style={caixa} data-teste="visao-todos">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className={titulo}><Users className="w-3 h-3 inline mr-1" />{soEu ? 'O meu detalhamento' : 'Detalhamento por pessoa'}</p>
          <span className="text-[11px] text-white/35">· a prévia na linha; clique pra abrir os 8 Hábitos, as metas, as demandas e o PDF</span>
        </div>
        {!carregando && time.length > 0 && (
          <div className="mt-2 flex items-center gap-x-4 gap-y-1 flex-wrap rounded-lg border border-white/10 px-3 py-2 text-[11.5px] text-white/60" data-teste="visao-resumo">
            <span className="text-[10px] uppercase tracking-wider text-white/35">semana {fmtDia(segunda)} a {fmtDia(domingo)}</span>
            <span>planejaram hoje <b className="text-white">{visao.planejaramHoje} de {visao.linhas.length}</b></span>
            <span>produziram na semana <b className="text-white">{visao.produziram} de {visao.linhas.length}</b></span>
            <span>demandas concluídas <b className="text-white">{visao.demandas.total ? `${visao.demandas.concluidas} de ${visao.demandas.total} · ${visao.demandas.pct}%` : '—'}</b>{visao.demandas.atrasadas ? <span className="text-red-300"> · {plural(visao.demandas.atrasadas, 'atrasada', 'atrasadas')}</span> : null}</span>
            <span className="ml-auto inline-flex items-center gap-2 tabular-nums"><span className="inline-flex items-center gap-1"><Semaforo cor="verde" tamanho="pequeno" /> {visao.verdes}</span><span className="inline-flex items-center gap-1"><Semaforo cor="amarelo" tamanho="pequeno" /> {visao.amarelos}</span><span className="inline-flex items-center gap-1"><Semaforo cor="vermelho" tamanho="pequeno" /> {visao.vermelhos}</span></span>
          </div>
        )}
        {carregando ? <p className="mt-2 text-[12px] text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> lendo a semana…</p> : visao.linhas.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-[12.5px]" data-teste="visao-tabela">
              <thead>
                <tr className="text-[10px] text-white/35 uppercase tracking-wider text-left">
                  <th className="py-1.5 pr-3 font-bold">quem</th>
                  <th className="py-1.5 pr-3 font-bold">hábitos {oito.periodo.rotulo}</th>
                  <th className="py-1.5 pr-3 font-bold">hoje</th>
                  <th className="py-1.5 pr-3 font-bold">semana</th>
                  <th className="py-1.5 pr-3 font-bold">demandas</th>
                  <th className="py-1.5 w-6" />
                </tr>
              </thead>
              <tbody>
                {linhasVisiveis.map(linhaDe)}
                {vazias.length > 0 && (
                  <tr className="border-t border-white/[0.07]" data-teste="sem-atividade" data-quantos={vazias.length} data-aberto={grupoAberto ? 'sim' : 'nao'}>
                    <td colSpan={6} className="py-2.5">
                      <div className="flex items-start gap-2 flex-wrap text-[12px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 pt-0.5">sem atividade {periodoTipo === 'hoje' ? 'hoje' : oito.periodo.rotulo} ({vazias.length})</span>
                        {!grupoAberto && (
                          <span className="text-white/60">
                            {vazias.map((l, i) => (
                              <React.Fragment key={l.pessoaId}>
                                <button type="button" onClick={() => abrirDoGrupo(l.pessoaId)} className="hover:text-white hover:underline" data-teste="sem-atividade-nome" data-pessoa={l.pessoaId}>{primeiroNome(l.nome)}</button>
                                {i < vazias.length - 1 ? ', ' : ''}
                              </React.Fragment>
                            ))}
                          </span>
                        )}
                        <button type="button" onClick={() => setMostrarVazias((v) => !v)} className="ml-auto text-[11px] text-white/40 hover:text-white inline-flex items-center gap-0.5" data-teste="sem-atividade-toggle">
                          {grupoAberto ? <><ChevronUp className="w-3 h-3" /> recolher</> : <><ChevronDown className="w-3 h-3" /> mostrar as linhas</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {/* quem está por fora do time corporativo (ex.: o dono sem nível no painel) ainda vê o próprio painel */}
        {!carregando && proprioForaDoTime && pessoaId === currentUser.id && (
          <div className="mt-3">
            <PainelCorporativo key="proprio" currentUser={currentUser} hojeISO={hoje} gestao={gestao} pessoaInicial={pessoaId} onMudou={() => setVersao((v) => v + 1)} onPessoa={trocar} periodo={periodo} />
          </div>
        )}
      </div>
    </div>
  );
}
