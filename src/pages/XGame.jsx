import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/supabaseClient';
import {
  resumoDoDia, dataISO, inicioCicloOficial, inicioDaSemana, fimCiclo, CICLO_DIAS_UTEIS, FRASES,
  VIRTUDES, podeSerVotado, votouEmTodosOsColegas, janelaVotacaoAberta, naJanelaIdeal, mvmManual, nomeExibicao,
  ofensiva, OFENSIVA_META, missoesDaSemana, VOTACAO_INICIO_MIN, VOTACAO_FIM_MIN, horaDeMin,
  tokenDoCiclo, formacaoExecutivoIdeal, EXECUTIVO_IDEAL, faixaToken, META_VENDAS_CICLO, TRAVA_SEM_ESTUDO,
  estudoFdsEmDia, TRAVA_SEM_DIAMANTE,
} from '@/lib/xgame';
import { isSalePago, isVendaMercadoria } from '@/lib/crmUnifiedCustomers';
import { DIAS_FIXO } from '@/lib/distribuicaoFixo';
import { BarraProgresso } from '@/components/licensing/CentralVendas/VerificacaoUI';
import XGameVisaoExecutiva from '@/components/licensing/CentralVendas/XGameVisaoExecutiva';

// X-GAME — o ESPAÇO DEDICADO da gamificação do Método (DIR-97, 08/09/2026).
// Até aqui esta página era órfã — ninguém no app linkava pra ela — e tinha
// ficado pra trás: mostrava Human Token e MvM, mas nunca ganhou X-Pay,
// ofensiva (fogo) nem missões da semana, que o Compromisso (CrmMetodo.jsx)
// já tinha. Pior — o retrato que ela gravava em xgame_diario nunca incluía
// xpay_ganho/xpay_perdido (o mesmo bug que o Compromisso já tinha corrigido
// no seu próprio grava-placar), então visitar esta página escreveria dado
// incompleto por cima do que o Compromisso gravou. Agora ela busca o mesmo
// participante/ciclo oficial, calcula com a MESMA função pura (resumoDoDia)
// que o Compromisso usa, e a seção do time é a MESMA XGameVisaoExecutiva
// que já existe dentro da Verificação do Progresso — nada duplicado, só o
// individual reunido com o time num espaço só. Estética X-EOS: preto + branco-gelo.
//
// 🗳️ 08/09/2026 — dono, direto: "a gente precisa botar a votação aqui,
// votar por aqui que é o mais correto." Reverte a decisão original (que
// deixava a votação só no Compromisso) — o voto grava na MESMA tabela
// (xgame_votos_mvm), então votar daqui ou de lá é exatamente a mesma coisa
// pro jogo; só o lugar onde a pessoa aperta o botão que muda.

const fmt2 = (n) => Number(n ?? 0).toFixed(2).replace('.', ',');

// 🔍 08/09/2026 — dono, direto: "eu quero ter a visualização do painel da
// pessoa como ela está visualizando... entrando no painel dele, uma página
// dentro da página. Eu quero saber agora como ele está olhando o MVM dele...
// eu estou às cegas." O Super Admin PRECISA ver exatamente esta mesma tela
// que a pessoa vê — não um resumo reconstruído à parte. Por isso o modo
// "ver como ele vê" reaproveita este MESMO componente (com `userIdForcado`
// no lugar do `currentUser` do localStorage), em vez de duplicar a tela em
// outro lugar: `modoAdmin` só desliga as AÇÕES (votar pelo colega, mexer no
// "aceito ser votado" dele, gravar o placar do dia por cima do dele) — o que
// se VÊ continua sendo idêntico ao que a pessoa vê ao abrir sozinha.
export default function XGame({ userIdForcado = null, nomeForcado = null, modoAdmin = false } = {}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [diasCiclo, setDiasCiclo] = useState([]);
  const [participante, setParticipante] = useState(null);
  const [cicloConfig, setCicloConfig] = useState(null);
  const [historicoOfensiva, setHistoricoOfensiva] = useState([]);
  const [votosDias, setVotosDias] = useState([]);
  const [agora, setAgora] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [vendasCiclo, setVendasCiclo] = useState(null);
  // 🧯 08/09/2026 — esta tela também grava xgame_diario (linha 78 abaixo);
  // sem o mesmo gate do Compromisso, ela reescreveria por cima uma MvM que
  // já tinha zerado por falta de voto — a régua da votação PRECISA valer
  // nas duas telas, senão a punição vale só numa e some na outra.
  const [colegasVotaveis, setColegasVotaveis] = useState([]);
  const [votosHoje, setVotosHoje] = useState([]);
  // 🗳️ 08/09/2026 — o ato de votar em si, agora também aqui (antes só
  // existia no Compromisso). Mesma tabela, mesmas regras.
  const [nomesColegas, setNomesColegas] = useState({});
  const [votosRecebidos, setVotosRecebidos] = useState([]);
  const [votando, setVotando] = useState('');
  const [notas, setNotas] = useState({});
  const [salvandoVoto, setSalvandoVoto] = useState(false);
  const [meuAceitaSerVotado, setMeuAceitaSerVotado] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let u = null;
    if (userIdForcado) {
      // 🔍 modo "ver como ele vê" — a identidade vem do admin, não do
      // localStorage; o nome real (e o cargo, pro gate do super_admin) é
      // conferido logo abaixo, junto com o resto dos dados dessa pessoa.
      u = { id: userIdForcado, full_name: nomeForcado, nickname: nomeForcado, role: null };
    } else {
      try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    }
    setUser(u);
    if (!u?.id) { setLoading(false); return; }
    (async () => {
      try {
        const hoje = new Date();
        const [{ data: part }, { data: cfg }, { data: tf }, { data: parts }, { data: vh }, uReal] = await Promise.all([
          supabase.from('xgame_participantes').select('*').eq('user_id', u.id).maybeSingle(),
          supabase.from('xgame_config').select('ciclo_inicio').eq('id', 'atual').maybeSingle(),
          supabase.from('metodo_tarefas').select('*').eq('user_id', u.id).eq('data', dataISO(hoje)).order('ordem'),
          supabase.from('xgame_participantes').select('user_id,aceita_ser_votado').eq('ativo', true),
          supabase.from('xgame_votos_mvm').select('votado_id,virtude,nota').eq('votante_id', u.id).eq('data', dataISO(hoje)),
          // 🔍 no modo "ver como ele vê" o localStorage não tem o cargo real
          // dela — busca pra o gate do "Aceito ser votado" (só super_admin) valer certo
          userIdForcado
            ? supabase.from('app_users').select('id,full_name,nickname,role').eq('id', userIdForcado).maybeSingle().then((r) => r.data)
            : Promise.resolve(null),
        ]);
        if (uReal) { u = { ...u, ...uReal }; setUser(u); }
        setParticipante(part || null);
        setMeuAceitaSerVotado(part?.aceita_ser_votado !== false);
        setCicloConfig(cfg?.ciclo_inicio || null);
        setTarefas(tf || []);

        // 🧯 08/09 — os mesmos colegas votáveis (sem Super Admin fechado) e os
        // mesmos votos de hoje que o Compromisso usa — a régua da votação não
        // pode divergir de tela pra tela.
        const linhas = (parts || []).filter((p) => p.user_id !== u.id);
        if (linhas.length) {
          const idsColegas = linhas.map((p) => p.user_id);
          const { data: usColegas } = await supabase.from('app_users').select('id,full_name,nickname,role').in('id', idsColegas);
          const porId = new Map((usColegas || []).map((x) => [x.id, x]));
          const votaveis = linhas.filter((p) => podeSerVotado({ role: porId.get(p.user_id)?.role, aceita_ser_votado: p.aceita_ser_votado }));
          setColegasVotaveis(votaveis.map((p) => p.user_id));
          const nomes = {}; votaveis.forEach((p) => { const uc = porId.get(p.user_id); if (uc) nomes[uc.id] = nomeExibicao(uc); });
          setNomesColegas(nomes);
        }
        setVotosHoje(vh || []);

        const ini = dataISO(inicioCicloOficial(cfg?.ciclo_inicio || null, hoje));
        const iniSemana = dataISO(inicioDaSemana(hoje));
        const [{ data: dc }, { data: hist }, { data: vd }, { data: vr }] = await Promise.all([
          supabase.from('xgame_diario').select('*').eq('user_id', u.id).eq('ciclo_inicio', ini).lt('data', dataISO(hoje)).order('data'),
          supabase.from('xgame_diario').select('data,tarefas_total,tarefas_feitas,mvm_dia,detalhes').eq('user_id', u.id).lt('data', dataISO(hoje)).order('data', { ascending: false }).limit(90),
          supabase.from('xgame_votos_mvm').select('data').eq('votante_id', u.id).gte('data', iniSemana),
          supabase.from('xgame_votos_mvm').select('virtude,nota').eq('votado_id', u.id).gte('data', ini),
        ]);
        setDiasCiclo(dc || []);
        setHistoricoOfensiva(hist || []);
        setVotosDias([...new Set((vd || []).map((v) => String(v.data).slice(0, 10)))]);
        setVotosRecebidos(vr || []);
      } catch (e) { console.error('[X-GAME] carregar', e); }
      setLoading(false);
    })();
  }, [userIdForcado, nomeForcado]);

  // 💳 vendas REAIS da loja no ciclo — mesma conta do Compromisso, precisa
  // pro Human Token oficial (F4) e pro eixo "Vendas" do Executivo Ideal.
  useEffect(() => {
    if (!user?.id) { setVendasCiclo(null); return; }
    const ini = dataISO(inicioCicloOficial(cicloConfig, new Date()));
    supabase.from('catalog_sales').select('id,status,kind,created_date')
      .or(`seller_id.eq.${user.id},licensee_id.eq.${user.id},anchor_id.eq.${user.id},owner_id.eq.${user.id}`)
      .gte('created_date', `${ini}T00:00:00`)
      .then(({ data, error }) => {
        if (error) { setVendasCiclo(null); return; }
        setVendasCiclo((data || []).filter((s) => isSalePago(s) && isVendaMercadoria(s)).length);
      });
  }, [user?.id, cicloConfig]);

  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const votouEmTodos = useMemo(() => {
    const completos = colegasVotaveis.filter((id) => votosHoje.filter((v) => v.votado_id === id).length >= VIRTUDES.length);
    return votouEmTodosOsColegas(colegasVotaveis, completos);
  }, [colegasVotaveis, votosHoje]);
  const resumo = useMemo(
    () => resumoDoDia({ tarefas, agoraMin, diasCiclo, hoje: agora, participante, cicloConfigISO: cicloConfig, votouEmTodos }),
    [tarefas, agoraMin, diasCiclo, agora, participante, cicloConfig, votouEmTodos],
  );

  // 🗳️ votar nos colegas — mesma lógica do Compromisso, mesma tabela.
  const recebido = useMemo(() => mvmManual(votosRecebidos), [votosRecebidos]);
  // 🏆 F4 — o HUMAN TOKEN OFICIAL do ciclo + o Executivo Ideal, a MESMA
  // conta do Compromisso (tokenDoCiclo/formacaoExecutivoIdeal) — dono:
  // "não é duplicar de lá pra cá, é duplicar aqui" — o painel de lá
  // continua existindo, este é a MESMA fórmula, calculada de novo aqui.
  const ciclo = useMemo(() => {
    const r = tokenDoCiclo({
      diasCiclo,
      hojeResumo: { ...resumo.contagens, mvm_dia: resumo.mvm_dia },
      mvmVotacao: recebido.media,
      perfil: participante?.perfil || 'estrategico',
      vendasReais: vendasCiclo,
    });
    const semEstudoSemana = resumo.estudo_em_dia ? r.total : Math.min(r.total, TRAVA_SEM_ESTUDO);
    // 🎓 09/09/2026 — dono: sem o estudo de fim de semana em dia, trava antes
    // do Diamante — mesmo padrão da trava de estudo de semana, um degrau acima.
    const fdsOk = estudoFdsEmDia(diasCiclo, { data: dataISO(agora), feito: resumo.estudo_fds_feito });
    const total = fdsOk ? semEstudoSemana : Math.min(semEstudoSemana, TRAVA_SEM_DIAMANTE);
    return { ...r, total, faixa: faixaToken(total), formacao: formacaoExecutivoIdeal(r.taxas) };
  }, [resumo, diasCiclo, recebido.media, participante, vendasCiclo]);
  const jaVoteiEm = (id) => votosHoje.filter((v) => v.votado_id === id).length >= VIRTUDES.length;
  const janelaAberta = janelaVotacaoAberta(agoraMin);
  // 🔍 modoAdmin é só olhar — o Super Admin vasculhando não pode votar,
  // desligar o interruptor de outra pessoa, nem gravar o placar dela por
  // cima. As três ações abaixo (e o "gravar o placar" logo adiante) saem
  // fora no primeiro passo em modoAdmin.
  const escolherColega = (id) => {
    if (modoAdmin) return;
    setVotando(id);
    const prev = {};
    votosHoje.filter((v) => v.votado_id === id).forEach((v) => { prev[String(v.virtude).toUpperCase()] = v.nota; });
    setNotas(prev);
  };
  const salvarVotos = async () => {
    if (modoAdmin) return;
    const linhas = VIRTUDES.filter((v) => notas[v] >= 1).map((v) => ({
      votante_id: user.id, votado_id: votando, data: dataISO(agora), virtude: v, nota: notas[v], updated_at: new Date().toISOString(),
    }));
    if (!votando || linhas.length !== VIRTUDES.length) { toast.error('Dê a nota de 1 a 10 nas 10 virtudes.'); return; }
    setSalvandoVoto(true);
    const { error } = await supabase.from('xgame_votos_mvm').upsert(linhas, { onConflict: 'votante_id,votado_id,data,virtude' });
    setSalvandoVoto(false);
    if (error) { toast.error('Erro ao salvar a votação — tente de novo.'); return; }
    toast.success(`Votação registrada pra ${nomesColegas[votando] || 'colega'}!`);
    setVotosHoje((prev) => [...prev.filter((v) => v.votado_id !== votando), ...linhas]);
    setVotando(''); setNotas({});
  };
  const alternarAceitaSerVotado = async () => {
    if (modoAdmin) return;
    const novo = !meuAceitaSerVotado;
    setMeuAceitaSerVotado(novo);
    const { error } = await supabase.from('xgame_participantes').update({ aceita_ser_votado: novo }).eq('user_id', user.id);
    if (error) { setMeuAceitaSerVotado(!novo); toast.error('Não deu pra salvar — tenta de novo.'); return; }
    toast.success(novo ? 'Você entrou na votação da MvM — os colegas já podem te avaliar hoje.' : 'Você saiu da votação da MvM — ninguém vota em você até você religar.');
  };

  // 🔥 Ofensiva: hoje entra na conta assim que fecha 80%+ do Master Task.
  const hojeFechou = resumo.tarefas_total > 0 && resumo.tarefas_feitas / resumo.tarefas_total >= OFENSIVA_META;
  const fogo = useMemo(() => ofensiva(historicoOfensiva, agora, hojeFechou), [historicoOfensiva, agora, hojeFechou]);

  // 🎯 Missões da semana — mesmo cálculo do Compromisso, com o histórico +
  // o dia de hoje somado na hora.
  const missoes = useMemo(() => {
    const iniSemana = dataISO(inicioDaSemana(agora));
    const votou = new Set(votosDias);
    const dias = historicoOfensiva
      .filter((d) => String(d.data).slice(0, 10) >= iniSemana)
      .map((d) => ({
        pct: Number(d.tarefas_total) > 0 ? Number(d.tarefas_feitas) / Number(d.tarefas_total) : 0,
        leitura: !!d.detalhes?.leitura_feita,
        mvm: Number(d.mvm_dia) || 0,
        votou: votou.has(String(d.data).slice(0, 10)),
      }))
      .reverse();
    if (resumo.tarefas_total > 0) {
      dias.push({
        pct: resumo.tarefas_feitas / resumo.tarefas_total,
        leitura: resumo.leitura_feita,
        mvm: resumo.mvm_dia,
        votou: votou.has(dataISO(agora)),
      });
    }
    return missoesDaSemana(dias, agora);
  }, [historicoOfensiva, votosDias, resumo, agora]);

  // Fotografia do dia: grava/atualiza o placar sem bloquear a tela. Mesmo
  // formato de `detalhes` do Compromisso — inclui xpay_ganho/xpay_perdido,
  // que o time (XGameVisaoExecutiva) lê pro X-Pay do ciclo.
  useEffect(() => {
    // 🔍 modoAdmin não grava nada por cima do placar dela — é só visita.
    if (!user?.id || loading || !tarefas.length || modoAdmin) return;
    const linha = {
      user_id: user.id,
      data: dataISO(agora),
      ciclo_inicio: dataISO(resumo.ciclo_inicio),
      tarefas_total: resumo.tarefas_total,
      tarefas_feitas: resumo.tarefas_feitas,
      mvm_dia: resumo.mvm_dia,
      aplicabilidade: resumo.aplicabilidade,
      token_dia: resumo.token_dia,
      cotacao: resumo.cotacao,
      pontos: resumo.pontos,
      detalhes: {
        leitura_feita: resumo.leitura_feita, estudo_em_dia: resumo.estudo_em_dia, dia_util: resumo.dia_util,
        estudo_fds_feito: resumo.estudo_fds_feito,
        xpay_ganho: resumo.xpay?.ganho || 0, xpay_perdido: resumo.xpay?.perdido || 0,
        ...resumo.contagens,
      },
      updated_at: new Date().toISOString(),
    };
    supabase.from('xgame_diario').upsert(linha, { onConflict: 'user_id,data' })
      .then(({ error }) => { if (error) console.error('[X-GAME] placar', error); });
  }, [user?.id, loading, resumo.pontos, resumo.tarefas_feitas, resumo.token_dia]);

  if (loading) return <div className="min-h-screen bg-[#00020C] text-[#F4F4F4] flex items-center justify-center">Carregando o X-GAME…</div>;
  if (!user?.id) return <div className="min-h-screen bg-[#00020C] text-[#F4F4F4] flex items-center justify-center">Entre na sua conta pra jogar o X-GAME.</div>;

  const fim = fimCiclo(resumo.ciclo_inicio);
  const pctDia = resumo.tarefas_total ? (resumo.tarefas_feitas / resumo.tarefas_total) * 100 : 0;
  const meuNome = user.nickname || user.full_name || 'Guerreiro(a)';

  return (
    <div className={modoAdmin ? 'bg-[#00020C] text-[#F4F4F4] rounded-2xl overflow-hidden' : 'min-h-screen bg-[#00020C] text-[#F4F4F4]'}>
      {/* 🏛️ DIR-97.1 — a tela era uma coluna estreita (max-w-3xl) num app
          que promete "executivo". Ganhou um teto (max-w-[1440px]) que
          ainda sobrava dos dois lados em monitor grande — o dono viu isso
          ao vivo: "não pode espremer isso tipo numa landing page". Sem
          teto nenhum agora: w-full, ponta a ponta, igual ao palco dos 8
          Hábitos (CrmClientesTab.jsx) que já não tem max-w nenhum. */}
      <div className="w-full px-3 sm:px-8 py-8 sm:py-10 space-y-8 sm:space-y-10">

        {/* 🔍 dono: "eu quero ter a visualização do painel da pessoa como
            ela está visualizando... uma página dentro da página." Aqui é
            EXATAMENTE a tela dela — o aviso deixa claro que é uma visita,
            não a conta do Super Admin. */}
        {modoAdmin && (
          <div className="rounded-xl border-2 border-sky-500/40 bg-sky-950/30 px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <p className="text-[12px] font-bold text-sky-300">Visualização do Super Admin — exatamente o que {nomeForcado || 'esta pessoa'} vê agora. Só olhar: votar e mexer nos interruptores continuam sendo dela.</p>
          </div>
        )}

        {/* 🧭 08/09/2026 — "o botão pra eu ir pras outras áreas não pode
            sair" (ordem do dono, olhando o preview): /XGame é uma rota
            própria, fora do painel do Top College — não herda o menu
            lateral de lá. Sem isto, chegar aqui pelo banner "Visão
            Executiva X-GAME" virava rua sem saída. Dentro do modal do
            admin (modoAdmin) esse botão não faz sentido — some. */}
        {!modoAdmin && (
          <button
            type="button"
            onClick={() => navigate('/Licensing?tab=catalogo&catalogTab=catalogo-crm')}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#C1BECA] hover:text-[#F4F4F4] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar pro Top College
          </button>
        )}

        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2B2B2B] pb-5">
          <div>
            <div className="text-[11px] tracking-[0.28em] text-[#817E8C] uppercase font-semibold">To The Top · X-EOS · Visão Executiva</div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-1">X-GAME</h1>
            <div className="text-sm text-[#C1BECA] mt-1">Boa {new Date().getHours() < 12 ? 'manhã' : new Date().getHours() < 18 ? 'tarde' : 'noite'}, {meuNome} — {FRASES.antecipacao.toLowerCase()} · dia {resumo.dia_util} de {CICLO_DIAS_UTEIS} · cotação {fmt2(resumo.cotacao)}</div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#2B2B2B] bg-[#0b0d14] px-5 py-3 self-start sm:self-auto">
            <div className="text-4xl leading-none">{resumo.faixa.medalha}</div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#817E8C]">faixa do dia</div>
              <div className="text-sm font-extrabold">{resumo.faixa.label}</div>
            </div>
          </div>
        </header>

        {/* 🔥 08/09/2026 — mesma regra explícita do Compromisso, radical: não
            votar em todo mundo até a última chance zera o dia inteiro,
            dinheiro incluído — não só a MvM. */}
        {resumo.perdeu_por_nao_votar && (
          <div className="rounded-xl border-2 border-red-500 bg-red-950/40 px-4 py-3 text-center">
            <p className="text-sm font-extrabold text-red-400">🗳️ DIA ZERADO — você não votou em todos os colegas até as {horaDeMin(VOTACAO_FIM_MIN)}</p>
            <p className="text-[11px] text-red-300 mt-0.5">Não é só a MvM: Human Token, pontos e X-Pay que você ganharia hoje também zeraram. Votar em todo mundo, todo dia, não é opcional. Amanhã dá pra recomeçar.</p>
          </div>
        )}

        {/* ⏰ 08/09/2026 — dono: "se o cara se atrasou, além de perder o
            dinheiro, isso tem que tirar pontos dele." */}
        {resumo.perdeu_por_atraso_pronto && (
          <div className="rounded-xl border-2 border-red-500 bg-red-950/40 px-4 py-3 text-center">
            <p className="text-sm font-extrabold text-red-400">⏰ DIA ZERADO — uma tarefa da gestão passou do "pronto até" sem o pronto</p>
            <p className="text-[11px] text-red-300 mt-0.5">MvM, Human Token, pontos e o X-Pay que você ganharia hoje zeraram junto com o atraso. Dá o pronto assim que puder — amanhã o dia recomeça do zero.</p>
          </div>
        )}

        {/* ══ SEU DIA — o hero, cheio de largura ══ */}
        <section data-teste="xgame-meu-dia">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#817E8C]">Seu dia</span>
            <span className="h-px flex-1 bg-[#2B2B2B]" />
          </div>

          {/* ══ 🎯 EXECUTIVO IDEAL — dono: "não é tirar de lá e jogar pra cá,
              é duplicar aqui, mas aqui tem que ser fixo, bem lá em cima. E
              bonito." Mesma fórmula do Compromisso (tokenDoCiclo +
              formacaoExecutivoIdeal), calculada de novo aqui — o painel de
              lá continua existindo, este é o mesmo painel, na Visão
              Executiva, sempre visível, sem toggle nenhum. ══ */}
          <div id="executivo-ideal" className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-950/10 p-4 sm:p-5 space-y-4 mb-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p
                  className="text-sm font-extrabold text-white cursor-help"
                  title={'"Esse painel representa o desempenho do executivo nos dias corridos do mês. Ou seja: através destas informações, é possível acompanhar se o progresso está à frente ou atrás do Executivo Ideal."'}
                >
                  🎯 Onde estou × EXECUTIVO IDEAL ⓘ
                </p>
                <p className="text-[11px] text-[#817E8C] mt-0.5">os 5 pilares que formam o Executivo Ideal, ciclo após ciclo</p>
              </div>
              <div
                className="text-right shrink-0 cursor-help"
                title={'"São os parâmetros que definem o desempenho do executivo ideal, que será considerado para formação emancipada ao longo da mentoria. Uma vez que a barra de progresso do executivo esteja maximizada em 100%, o trainee será então considerado através de votação do conselho da corporação para ter sua formação como um executivo sem limites adiantada."'}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#817E8C]">formação ⓘ</p>
                <p className="text-2xl font-black text-emerald-400 tabular-nums leading-none">{ciclo.formacao.pct}%</p>
                <p className="text-[10px] text-[#817E8C]">dos 100%</p>
              </div>
            </div>
            <BarraProgresso pct={ciclo.formacao.pct} dialeto="escuro" altura="extra" corClasse="bg-emerald-400" trilhoClasse="bg-[#2B2B2B]" />

            <div className="space-y-2.5">
              {[
                { k: 'mvm', rotulo: 'MvM (votação do grupo)', emoji: '🗳️' },
                { k: 'producao', rotulo: 'Produção', emoji: '📋' },
                { k: 'realtime', rotulo: 'Real Time (X-Pay no horário)', emoji: '⏱️' },
                { k: 'bonus', rotulo: 'Bônus / Estudo', emoji: '📚' },
                { k: 'vendas', rotulo: `Vendas da loja — automático (meta ${META_VENDAS_CICLO} no ciclo · ${ciclo.vendasFeitas} feitas)`, emoji: '🛒' },
              ].map(({ k, rotulo, emoji }) => {
                const atual = Math.round((ciclo.taxas[k] || 0) * 100);
                const alvo = Math.round(EXECUTIVO_IDEAL[k] * 100);
                const ok = atual >= alvo;
                return (
                  <div key={k} className="rounded-xl border border-[#2B2B2B] bg-[#0b0d14] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{emoji} {rotulo}</span>
                      <span className={`text-xs font-bold tabular-nums shrink-0 ${ok ? 'text-emerald-400' : 'text-[#817E8C]'}`}>
                        {atual}% <span className="text-[#817E8C] font-normal">/ alvo {alvo}%</span>{ok ? ' ✅' : ''}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <BarraProgresso
                        pct={atual} dialeto="escuro" altura="grossa"
                        corClasse={ok ? 'bg-emerald-400' : 'bg-amber-400'}
                        trilhoClasse="bg-[#2B2B2B]" limite={alvo}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {ciclo.formacao.mensagem && (
              <p className="text-[11px] font-semibold text-emerald-400">{ciclo.formacao.mensagem}</p>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card titulo="Human Token" valor={fmt2(resumo.token_dia)} sub={`teto 22,22${resumo.estudo_em_dia ? '' : ' · trava 17,77 (estude!)'}`} />
            <Card titulo="MvM do Dia" valor={fmt2(resumo.mvm_dia)} sub={resumo.frase_mvm} destaque={resumo.mvm_dia < 4} />
            <Card
              titulo="X-Pay de hoje" valor={resumo.xpay ? `R$ ${fmt2(resumo.xpay.ganho)}` : '—'}
              sub={resumo.xpay?.perdido > 0 ? `− R$ ${fmt2(resumo.xpay.perdido)} perdido` : `R$ ${fmt2(resumo.xpay?.emJogo || 0)} em jogo`}
              destaque={resumo.xpay?.perdido > 0}
              dica={`O seu fixo ÷ ${DIAS_FIXO} dias de operação, repartido pelo peso de cada tarefa. Tarefa perdida é dinheiro que sai do resultado.`}
            />
            <Card titulo="Pontos de hoje" valor={String(resumo.pontos)} sub={`${resumo.tarefas_feitas}/${resumo.tarefas_total} tarefas`} />
          </div>

          {/* ══ 🗳️ VOTAÇÃO MvM — dono: "a gente precisa botar a votação aqui,
              votar por aqui que é o mais correto." Mesma tabela do Compromisso,
              mesmas regras — votar daqui ou de lá é a mesma coisa pro jogo. ══ */}
          <div id="votacao-mvm" className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-950/10 p-4 sm:p-5 mt-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-extrabold text-white">🗳️ Votação MvM das {horaDeMin(VOTACAO_INICIO_MIN)} às {horaDeMin(VOTACAO_FIM_MIN)}</p>
                <p className="text-[11px] text-[#817E8C]">a ação mais importante do dia, junto com as vendas — 1 a 10 em cada uma das 10 Virtudes, pra cada colega</p>
              </div>
              <span className={`text-[10px] font-bold shrink-0 ${janelaAberta ? (naJanelaIdeal(agoraMin) ? 'text-emerald-400' : 'text-amber-400') : 'text-[#817E8C]'}`}>
                {janelaAberta
                  ? (naJanelaIdeal(agoraMin) ? '● JANELA ABERTA' : `● ÚLTIMA CHANCE — vote até ${horaDeMin(VOTACAO_FIM_MIN)}`)
                  : `janela fechada — abre às ${horaDeMin(VOTACAO_INICIO_MIN)}`}
              </span>
            </div>
            <p className="text-[10.5px] font-semibold text-red-400">⚠️ Não votar em TODOS os colegas até as {horaDeMin(VOTACAO_FIM_MIN)} zera o DIA INTEIRO — MvM, Human Token, pontos e X-Pay — sem exceção.</p>

            {user?.role === 'super_admin' && (
              <label className="flex items-center gap-2 rounded-lg border border-[#2B2B2B] bg-[#0b0d14] px-2.5 py-2 cursor-pointer">
                <input type="checkbox" checked={meuAceitaSerVotado} onChange={alternarAceitaSerVotado} disabled={modoAdmin} className="h-4 w-4" />
                <span className="text-[11px] text-[#C1BECA]">
                  <span className="font-semibold text-white">Aceito ser votado na MvM</span> — como Super Admin, você só aparece na lista dos colegas se ligar isto (fica desligado por padrão).
                </span>
              </label>
            )}

            {recebido.ranking.length > 0 ? (
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-white">Seu Ranking das Virtudes neste ciclo (média {fmt2(recebido.media)} · {recebido.totalVotos} votos):</p>
                {recebido.ranking.map((r, i) => (
                  <p key={r.virtude} className="text-[11px] text-[#817E8C] tabular-nums">
                    <span className="font-bold text-white">{i + 1}ª</span> {r.virtude} — <span className={`font-semibold ${r.media >= 7 ? 'text-emerald-400' : r.media < 4 ? 'text-red-400' : 'text-amber-400'}`}>{fmt2(r.media)}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#817E8C]">Você ainda não recebeu votos neste ciclo — o Ranking das Virtudes nasce da votação diária do grupo.</p>
            )}

            {colegasVotaveis.length === 0 ? (
              <p className="text-[11px] text-[#817E8C]">Nenhum outro participante ativo na X-GAME ainda — o painel do admin cadastra o time.</p>
            ) : (
              <div className="space-y-2 pt-1 border-t border-[#2B2B2B]">
                <p className="text-[11px] font-semibold text-white">Vote nos colegas de hoje:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {colegasVotaveis.map((id) => (
                    <button
                      key={id}
                      type="button"
                      disabled={!janelaAberta || modoAdmin}
                      onClick={() => escolherColega(id)}
                      className={`px-2 py-1 rounded border text-[11px] font-medium ${votando === id ? 'border-emerald-400 text-emerald-400 bg-emerald-950/40' : jaVoteiEm(id) ? 'border-emerald-500/30 text-[#817E8C]' : 'border-[#2B2B2B] text-white'} ${!janelaAberta || modoAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-400'}`}
                    >
                      {jaVoteiEm(id) ? '✅ ' : ''}{nomesColegas[id] || id.slice(0, 6)}
                    </button>
                  ))}
                </div>
                {votando && janelaAberta && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {VIRTUDES.map((v) => (
                        <label key={v} className="flex items-center justify-between gap-2 rounded border border-[#2B2B2B] bg-[#0b0d14] px-2 py-1.5">
                          <span className="text-[11px] text-[#C1BECA]">{v}</span>
                          <select
                            value={notas[v] || ''}
                            onChange={(e) => setNotas({ ...notas, [v]: Number(e.target.value) })}
                            className="text-[11px] border border-[#2B2B2B] rounded px-1 py-0.5 bg-[#0b0d14] text-white"
                          >
                            <option value="">nota</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                    <Button size="sm" onClick={salvarVotos} disabled={salvandoVoto} className="bg-emerald-600 hover:bg-emerald-500 text-white h-8">
                      {salvandoVoto ? 'Salvando...' : `Salvar votação de ${nomesColegas[votando] || 'colega'}`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-4 mt-4">
            {/* Master Task — a coluna principal, agora larga de verdade */}
            <div className="rounded-2xl border border-[#2B2B2B] bg-[#0b0d14] p-4 sm:p-5">
              <h2 className="text-xs uppercase tracking-widest text-[#817E8C] mb-3">Master Task — tempo real</h2>
              {resumo.tarefas.length === 0 && (
                <div className="text-sm text-[#C1BECA] border border-[#2B2B2B] rounded-lg p-4">
                  Nenhuma tarefa gerada pra hoje. Abra o Método e gere seu dia a partir da Rotina Perfeita.
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-2">
                {resumo.tarefas.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 border border-[#1c1f28] rounded-lg px-3 py-2">
                    <span className="w-12 text-xs text-[#817E8C] tabular-nums shrink-0">{t.hora || '—'}</span>
                    <span className={`flex-1 min-w-0 truncate text-sm ${t.feito ? 'line-through text-[#817E8C]' : ''}`}>{t.titulo}</span>
                    <span className={`text-[11px] font-bold shrink-0 ${t.estado.cor}`}>{t.estado.id === 'PERDIDO' ? 'PERDIDO' : t.estado.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar — ofensiva + progresso + missões, sempre à vista */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#2B2B2B] bg-[#0b0d14] p-4">
                <p className="text-sm font-bold">
                  🔥 {fogo.dias} {fogo.dias === 1 ? 'dia' : 'dias'} de ofensiva
                  {fogo.congelou && <span className="ml-2 text-[10px] font-semibold text-sky-400">🧊 congelador usado</span>}
                </p>
                <p className="text-[11px] text-[#817E8C] mt-1">
                  {hojeFechou ? 'hoje FECHADO ✔ — o fogo continua' : `feche ${Math.round(OFENSIVA_META * 100)}% do dia pra ${fogo.dias > 0 ? 'manter' : 'acender'} o fogo`}
                </p>
                <div className="flex justify-between text-[11px] text-[#817E8C] mt-3 mb-1">
                  <span>Progresso do dia</span>
                  <span>{Math.round(pctDia)}%</span>
                </div>
                <BarraProgresso pct={pctDia} dialeto="escuro" altura="media" corClasse="bg-[#F4F4F4]" trilhoClasse="bg-[#2B2B2B]" />
              </div>

              <div className="rounded-2xl border border-[#2B2B2B] bg-[#0b0d14] p-4" data-teste="missoes-da-semana">
                <h2 className="text-xs uppercase tracking-widest text-[#817E8C] mb-3">Missões da semana</h2>
                <div className="space-y-2.5">
                  {missoes.map((m) => (
                    <div key={m.id} data-teste="missao">
                      <p className="text-xs font-semibold flex items-center justify-between">
                        <span>{m.emoji} {m.nome} {m.ok ? '✅' : ''}</span>
                        <span className="text-[10px] text-[#817E8C] tabular-nums">{m.atual}/{m.alvo}</span>
                      </p>
                      <div className="mt-1.5"><BarraProgresso pct={(m.atual / m.alvo) * 100} dialeto="escuro" altura="fina" corClasse={m.ok ? 'bg-emerald-400' : 'bg-[#F4F4F4]'} trilhoClasse="bg-[#2B2B2B]" /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ O TIME — a mesma visão executiva da equipe que já mora dentro
            da Verificação do Progresso, agora também aqui: pulso, pódio,
            radar e a tabela inteira, sem duplicar cálculo nenhum. Painel
            largo, ocupando a página inteira. Some no modoAdmin — o Super
            Admin já vê o time inteiro em vários outros lugares; aqui ele
            entrou pra olhar UMA pessoa, não repetir a visão de todo mundo. ══ */}
        {!modoAdmin && (
          <section className="xeos-palco" data-teste="xgame-o-time">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#817E8C]">Todo mundo</span>
              <span className="h-px flex-1 bg-[#2B2B2B]" />
            </div>
            <div className="rounded-2xl border border-[#2B2B2B] bg-[#0b0d14] p-4 sm:p-6">
              <XGameVisaoExecutiva />
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-[#4c4a56] pt-4 border-t border-[#1c1f28]">
          {FRASES.reacao} · {FRASES.realtime} · até {fim.toLocaleDateString('pt-BR')}
        </footer>
      </div>
    </div>
  );
}

function Card({ titulo, valor, sub, destaque = false, dica }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${destaque ? 'border-red-500/60' : 'border-[#2B2B2B]'} bg-[#0b0d14]`} title={dica}>
      <div className="text-[11px] uppercase tracking-wider text-[#817E8C]">{titulo}</div>
      <div className="text-2xl sm:text-3xl font-extrabold tabular-nums mt-1">{valor}</div>
      <div className={`text-[11px] mt-1 ${destaque ? 'text-red-400 font-bold' : 'text-[#C1BECA]'}`}>{sub}</div>
    </div>
  );
}
