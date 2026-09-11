import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, Star, CalendarPlus, ExternalLink, UserPlus, Upload, PenLine, LayoutGrid, Link2, GitBranch, MessageCircle, Headphones, Lightbulb, Loader2, ScrollText, X } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import {
  HABITOS, ROTINA_PADRAO, periodoDe, PERIODOS, gerarTarefasDaRotina,
  progressoDia, linkGoogleAgenda,
  HORIZONTES_SONHO, agruparSonhosPorHorizonte, normalizarSonho, PLACEHOLDER_DETALHES_SONHO,
  PRINCIPIO_ROTINA, NARRATIVA_DO_DIA, guiaDaRotina,
  probabilidadeFechamento, produtoApresentacao,
  agendaDoDiaContatos, eventoGoogleDaReuniao, linhaDoTempoUnificada, plural,
  ultimoContato, proximasReunioes, RESULTADOS_CONTATO,
  idDoEventoGoogle, resumoSemanaReunioes, META_REUNIOES_SEMANA,
  reunioesEmpresaDoDia, DIAS_SEMANA,
} from '@/lib/metodo';
import { ehAtiva } from '@/lib/esteiraCaptacao';
// 🗓️ DIR-103 — a conexão com o Google mora fora do componente de propósito:
// o token vale ~1h e o `useState` daqui morria a cada remontagem, forçando
// nova janela de autorização no meio do agendamento (ver src/lib/googleAgenda.js).
import {
  tokenDoGoogle, erroDoGoogle, statusDoErro, invalidarTokenSePreciso,
  contaLembrada, esquecerConta,
} from '@/lib/googleAgenda';
// 🎮 X-GAME — o motor da gamificação por cima do Master Task (a planilha
// "X-GAME — Guia Prático do Sucesso" traduzida em função pura; nada muda no fluxo).
import {
  ordenarPorHora, horaEntre, resumoDoDia, dataISO, somarDiasISO, minutosBrasilia, inicioCicloOficial, diaCorridoDoCiclo, CICLO_DIAS_UTEIS, fmtReais, TOKEN_MAX,
  VIRTUDES, janelaVotacaoAberta, naJanelaIdeal, VOTACAO_INICIO_MIN, VOTACAO_IDEAL_FIM_MIN, VOTACAO_FIM_MIN, horaDeMin,
  mvmManual, podeSerVotado, votouEmTodosOsColegas,
  tokenDoCiclo, formacaoExecutivoIdeal, EXECUTIVO_IDEAL, META_VENDAS_CICLO,
  estudoFdsEmDia, estudoEmDia, travarTopoPorEstudo, ligaComPortoesDoCiclo, PISO_CARATER_PLATINA,
  ofensiva, OFENSIVA_META, conquistas, missoesDaSemana, inicioDaSemana, ligaDoToken, proximaLiga,
  moedaModelo,
  tipoDeValidacao, validarComprovacao,
  hashDoArquivo, validarPrint,
  ehTarefaDeGratidao, RITUAL_INICIO_MIN, RITUAL_FIM_MIN, deveAvisarRitual, nomeExibicao,
  vibrar, VIBRA_CONCLUIU, VIBRA_CONQUISTA, VIBRA_ERRO,
  pesoAutomatico, ehFimDeSemana, podeRecuperarNoFds, AVISOS_ANTES_DE_ZERAR, EIXOS_EXECUTIVO_IDEAL, proporcoesExecutivoIdeal,
} from '@/lib/xgame';
import { imagensParaComparar, decisaoAposIA } from '@/lib/xgameValidacao';
import TourGuiado from './TourGuiado';
import RadarEixos from '@/components/licensing/CentralVendas/RadarEixos';
import MoedaPizza from '@/components/licensing/CentralVendas/MoedaPizza';
import { vendasDaPessoa, filtroOrDonoDaVenda } from '@/lib/vendasDoCiclo';
import { supabase } from '@/api/supabaseClient';
import { carimboDoPronto, rotuloDoPrazo, estadoDoPronto } from '@/lib/pronto';
import { DIAS_FIXO } from '@/lib/distribuicaoFixo';
import { planoDeEntrada, ligarCartaoATarefa, fraseEntrou } from '@/lib/destinos';
import { BarraProgresso } from './VerificacaoUI';
import EntradaComDestinos from './EntradaComDestinos';
import PreviaJornadaModal from './PreviaJornadaModal';
import CrmSonhoModal from './CrmSonhoModal';
import XGameComprovarModal from './XGameComprovarModal';
import {
  rotinaEmVigor, estadoDaRotina, deveGerarSozinha, valeAPartirDe,
  incluirNaRotina, editarNaRotina, excluirDaRotina,
} from '@/lib/rotinaPessoal';
import { ferramentaDe } from '@/lib/ferramentaDaTarefa';
import { caminhoDeProva } from '@/lib/caminhoDeProva';
import { caminhoDoAudio, guardarAudio, caminhoDoVideo, guardarVideo } from '@/lib/cofreDeAudio';
import { frameEmBase64 } from '@/lib/frameEmBase64';
import { comBloco, statusDoRitual, seloDoRitual, pendenciasDoRitual, ritualRetomavel, ritualExpirado, blocosFeitos, RITUAL_MINUTOS_PARA_CONCLUIR } from '@/lib/ritualEmBlocos';
import { rastroDa, comFalha } from '@/lib/rastroDaComprovacao';
import OuvirGratidao from '@/components/common/OuvirGratidao';
import QuadroCompromisso from './QuadroCompromisso';
import { cartaoDaTarefa, LISTAS_MODELO, ESTADO_FEITO, ESTADO_ABERTO } from '@/lib/quadroCompromisso';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import XGameJornada from './XGameJornada';
import GuiaMovel, { useEhCelular } from './GuiaMovel';
import FaixaVisao from './FaixaVisao';
import XGameRitualAmanhecer from './XGameRitualAmanhecer';
import CrmNetworkQualificacaoModal from './CrmNetworkQualificacaoModal';
import CrmContatoRegistroModal from './CrmContatoRegistroModal';
import SinoNotificacoes from '@/components/common/SinoNotificacoes';
import { lerTudoDoSupabase } from '@/lib/lerTudoDoSupabase';

// DIR-46 — cor da faixa de probabilidade na lista
const COR_FAIXA = { quente: 'text-nz-verde', morno: 'text-amber-600', frio: 'text-nz-tinta-fraca' };

// 🎮 X-GAME — estado da tarefa em tempo real (só no dia de HOJE) e formato do token
const COR_ESTADO = { AGORA: 'text-amber-600', ATRASADO: 'text-orange-600', PERDIDO: 'text-red-600' };
const SELO_ESTADO = { AGORA: '⏳ AGORA', ATRASADO: '⚠ ATRASADO', PERDIDO: '✖ PERDIDO' };
const fmtToken = (n) => Number(n ?? 0).toFixed(2).replace('.', ',');

// 🏆 DIR-43 — O MÉTODO VIVO: os painéis dos hábitos 1-5 e 8 (os hábitos 6 e
// 7 são o próprio CRM: Acompanhamento = Clientes+Esteira, Verificação =
// Visão Executiva). Dados pessoais em metodo_perfil/metodo_tarefas.
// 🐛 09/09/2026 — dono: "todos zerados... eu votei em geral!" Achado: isto
// usava toISOString (fuso UTC) — no Brasil (UTC-3), a partir das 21h locais
// o UTC já virou o dia seguinte, então TODA leitura/escrita de voto e placar
// feita entre 21h e meia-noite local caía num dia ERRADO (o de amanhã), bem
// no fim da janela de votação (17h–21h30) — a hora de maior movimento. A
// pessoa votava certinho, mas a checagem "votou em todo mundo hoje" buscava
// o voto na data errada, não achava nada, e zerava o dia por engano.
// dataISO() já resolve isso com data local de verdade — reaproveita.
const hojeStr = () => dataISO();
const fmtDia = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });

// 🐛 09/09/2026 — DIR-127, dono, direto: "isso é muito sério... coloca uma
// trava pra tu não errar isso." Achado: o cron (gerarJornadaDoDia) e a
// auto-repetição do cliente (useEffect abaixo) podiam rodar pro MESMO dia
// antes de qualquer um marcar `rotina_gerada_em` — gerava a rotina INTEIRA
// em dobro (97 linhas duplicadas achadas no banco; 10 delas já com
// comprovação dupla — X-Pay contando a mesma tarefa duas vezes). A trava de
// verdade agora mora no BANCO (UNIQUE em user_id+data+hora+titulo,
// metodo_tarefas_unique_user_data_hora_titulo); aqui só troca o
// insert-um-a-um por um upsert em lote que IGNORA a duplicata em vez de
// tentar criar (ou quebrar tentando) — nunca mais 40 tarefas no lugar de 20.
// 🕐 mesma convenção do DistribuirTarefa: `ordem` é o minuto do dia, então a
// lista é cronológica por construção mesmo quando alguém ordena por `ordem`.
const ordemPelaHoraDoDia = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : 2000;
};

const criarTarefasSemDuplicar = (linhas) => supabase.from('metodo_tarefas')
  .upsert(linhas, { onConflict: 'user_id,data,hora,titulo', ignoreDuplicates: true });

const EXEMPLO_SCRIPT = `Ex.: "Oi {nome}! Lembrei de você por causa do {contexto da pessoa — FORM}.
Estou construindo um negócio de leilões e loja com preço de fábrica que está crescendo forte,
e queria te mostrar uma possibilidade — não é promessa, é projeto sério, com números abertos.
Topa uma conversa de 45 minutos essa semana? Tenho agenda {dia} às {hora}."`;

// 📜 DIR-112 (09/09/2026) — "o papel vem pra frente": o {nome} do script vira
// o primeiro nome de verdade da pessoa sendo contatada, na hora de ligar.
const personalizarScript = (texto, nomeCompleto) => {
  const primeiroNome = (nomeCompleto || '').trim().split(' ')[0] || 'essa pessoa';
  return String(texto || '').replace(/\{\s*nome\s*\}/gi, primeiroNome);
};

// `visaoTotal` = o ESCOPO dos dados (está vendo a lista de todo mundo?);
// `gestao` = as CAPACIDADES de gestão (relógio de teste, agenda da empresa) —
// o super admin as tem mesmo quando escolheu ver "só o meu" (06/09).
export default function CrmMetodo({ painel, currentUser, visaoTotal = false, gestao = null, nomePorUsuarioId = {}, clientesManuais = [], oportunidades = [], onQualificar, onRegistrarContato, onEditarRegistro, onExcluirRegistro, onNovoCliente, onNovoVendedor, onImportarContatos, onIr, onCriarOportunidade, iniciarTour = false, onTourIniciado, contatoDestacado = null, onContatoDestacadoConsumido }) {
  const uid = currentUser?.id;
  // 🔦 09/09/2026 — DIR-111.2, dono: "não posso ter a sensação que estou
  // recomeçando... já me coloca ela no meu contato e pisca." O destaque
  // dura pouco — pisca, chama atenção, some sozinho — não fica preso lá.
  //
  // 🐛 09/09/2026 — achado na auditoria: `onContatoDestacadoConsumido` é
  // recriada a cada render do pai (CrmClientesTab.jsx, um componente
  // grande com efeitos assíncronos e um setInterval de 30s rodando o
  // tempo todo) — como ela entrava nas dependências do efeito, qualquer
  // render do pai reiniciava o timer de 4s do zero, e o destaque podia
  // ficar preso por muito mais tempo que o prometido (ou pra sempre, se
  // os renders forem mais frequentes que 4s). Uma ref guarda sempre a
  // versão mais nova do callback sem entrar na dependência — só
  // `contatoDestacado` (o gatilho de verdade) reinicia o timer agora.
  const onContatoDestacadoConsumidoRef = useRef(onContatoDestacadoConsumido);
  useEffect(() => { onContatoDestacadoConsumidoRef.current = onContatoDestacadoConsumido; }, [onContatoDestacadoConsumido]);
  useEffect(() => {
    if (!contatoDestacado) return undefined;
    const t = setTimeout(() => onContatoDestacadoConsumidoRef.current?.(), 4000);
    return () => clearTimeout(t);
  }, [contatoDestacado]);
  const podeGerir = gestao ?? visaoTotal;
  // 👤 09/09/2026 — DIR-111, "quem qualificou" — achado na auditoria: este
  // helper estava copiado (corpo idêntico) dentro dos painéis 'lista' e
  // 'contato'; uma versão só, aqui em cima, pra não dessincronizar de novo.
  const nomeDoDono = (c) => (c.created_by_id && c.created_by_id !== 'anonymous' ? nomePorUsuarioId[c.created_by_id] : null);
  // 🖐️ 09/09/2026 — dono, ao vivo: "Como Funciona é um tour... a pessoa vai
  // clicando e a plataforma vai ensinando." A mesma mãozinha da Esteira de
  // Captação (TourGuiado.jsx), pedida de fora (o botão global "Como
  // Funciona") via `iniciarTour` — abre o tour de QUALQUER Hábito que já
  // esteja na tela (PASSOS_POR_PAINEL, definido embaixo), nunca um Hábito
  // diferente do que a pessoa está vendo.
  const [tourAberto, setTourAberto] = useState(false);
  useEffect(() => {
    if (iniciarTour && PASSOS_POR_PAINEL[painel]) { setTourAberto(true); onTourIniciado?.(); }
  }, [iniciarTour, painel, onTourIniciado]);
  const [perfil, setPerfil] = useState(null);
  const [dia, setDia] = useState(hojeStr());
  const [tarefas, setTarefas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  // edições locais
  const [modalSonho, setModalSonho] = useState(null); // horizonte pré-escolhido, ou null (fechado)
  const [editandoSonho, setEditandoSonho] = useState(null); // { indice, texto }
  const [script, setScript] = useState('');
  const [apresentacaoUrl, setApresentacaoUrl] = useState('');
  const [novaTarefa, setNovaTarefa] = useState({ hora: '', titulo: '', noQuadro: false, listaId: '' });
  const [listasDoQuadro, setListasDoQuadro] = useState([]); // 🔗 pra "também no quadro" da Lista
  const [guiaAberto, setGuiaAberto] = useState(null); // id da tarefa com o guia expandido
  const [confirmaRegerar, setConfirmaRegerar] = useState(false); // regerar dia já gerado (DIR-45.2)
  const [logicaAberta, setLogicaAberta] = useState(false); // a escada da narrativa
  const [buscaLista, setBuscaLista] = useState(''); // agenda: busca por nome/telefone (DIR-46)
  const [qualificando, setQualificando] = useState(null); // contato aberto no modal de qualificação
  const [registroAberto, setRegistroAberto] = useState(null); // {contato} = registrar; {contato, agendar:true} = agendar direto; {contato, editar:registro} = editar (DIR-50); {contato:null} = agendar livre
  const [confirmaExcluir, setConfirmaExcluir] = useState(null); // DIR-50: id do registro esperando o 2º clique
  const [reunioesEmpresa, setReunioesEmpresa] = useState([]); // 🏛️ DIR-52
  const [googleEventos, setGoogleEventos] = useState(null); // null = agenda Google não conectada
  const [googleConectando, setGoogleConectando] = useState(false);
  // qual conta do Google está ligada aqui — mostrada na tela de propósito:
  // ver o e-mail antes de agendar é o que evita a reunião cair na conta errada.
  const [googleConta, setGoogleConta] = useState(() => contaLembrada());

  // 🔥 DIR-103 — AQUECIMENTO SILENCIOSO. Quem já autorizou neste aparelho
  // ganha o token ANTES de precisar dele. É este pedaço que acaba com a
  // janela do Google aparecendo no meio do agendamento — que era onde a
  // pessoa clicava na conta errada.
  useEffect(() => { if (contaLembrada()) tokenDoGoogle({ interativo: false }).catch(() => {}); }, []);

  // 📜 DIR-112 (09/09/2026) — dono, ao vivo: "imagina ele com fone, começando
  // a fazer a ligação... ele clica, esse papel vem pra frente." O script vira
  // um cartão que aparece na FRENTE de tudo quando a pessoa vai contatar —
  // ela lê enquanto liga, em vez de decorar antes.
  const [chamadaAberta, setChamadaAberta] = useState(null); // {contato, wa} ou null
  const [dicaScript, setDicaScript] = useState(null); // {pontos_fortes, dica} do treinador de IA
  const [pedindoDica, setPedindoDica] = useState(false);

  useEffect(() => {
    if (!uid) return;
    plataforma.entities.MetodoPerfil.filter({ user_id: uid })
      .then((rows) => {
        const p = Array.isArray(rows) ? rows[0] : null;
        setPerfil(p || null);
        setScript(p?.script || '');
        setApresentacaoUrl(p?.apresentacao_url || '');
      })
      .catch(() => setPerfil(null));
  }, [uid]);

  // 🔁 DIR-80 — `diaLido` guarda QUAL dia já terminou de carregar. Sem isso, a
  // geração automática dispararia contra a lista vazia do primeiro render (antes
  // da resposta do banco chegar) e duplicaria o dia inteiro. É a trava de
  // idempotência começando aqui, no ponto onde ela é de verdade barata.
  const [diaLido, setDiaLido] = useState(null);
  const carregarTarefas = useCallback(() => {
    if (!uid) return;
    plataforma.entities.MetodoTarefa.filter({ user_id: uid, data: dia })
      // 🕐 09/09/2026 — A HORA MANDA. Aqui estava o inverso: ordenava por
      // `ordem` e só desempatava por `hora`. Como toda tarefa nova nascia com
      // `ordem` = fim da fila, uma tarefa marcada pras 08:00 entrava depois das
      // 22h — na Lista E na Jornada, que são a MESMA linha (ver destinos.js).
      // E lista fora de ordem cronológica faz `estadoDasTarefas` marcar como
      // PERDIDA uma tarefa que está acontecendo agora (ver ordenarPorHora).
      .then((rows) => { setTarefas(ordenarPorHora(Array.isArray(rows) ? rows : [])); setDiaLido(dia); })
      .catch(() => { setTarefas([]); setDiaLido(dia); });
  }, [uid, dia]);
  useEffect(() => { setDiaLido(null); }, [dia]);
  useEffect(() => { carregarTarefas(); }, [carregarTarefas]);

  const salvarPerfil = async (patch) => {
    setSalvando(true);
    try {
      if (perfil?.id) {
        await plataforma.entities.MetodoPerfil.update(perfil.id, patch);
        setPerfil({ ...perfil, ...patch });
      } else {
        const criado = await plataforma.entities.MetodoPerfil.create({ user_id: uid, ...patch });
        setPerfil(criado?.id ? criado : { user_id: uid, ...patch });
      }
      toast.success('Salvo!');
      return true;
    } catch (e) {
      console.error('Erro ao salvar método:', e);
      toast.error('Erro ao salvar — a migração do Método já foi colada no banco?');
      return false;
    } finally { setSalvando(false); }
  };

  // 📜 DIR-112 (09/09/2026) — só salva o TEXTO. O ponto de gamificação não
  // é mais daqui — ver `pedirDicaDoScript` logo abaixo.
  const salvarScript = () => salvarPerfil({ script });

  // 💡 o "validador" pedido pelo dono: ajuda a MELHORAR o script da própria
  // pessoa — nunca escreve por ela (ver api/functions/scriptContatoCoach.js).
  //
  // 🎯 DIR-112.1 (09/09/2026) — dono, ao vivo, depois de ver o ponto virar
  // automático por tamanho: "você só vai dar um ponto quando você conferir,
  // como se fosse uma validação... se o script estiver bom, aí você vai
  // fixar e dar esse ponto." O ponto SAIU do "escreveu 20 caracteres" e
  // passou a depender do `aprovado` que a própria IA decide neste pedido —
  // uma vez só (script_pontuado_em trava), sem mexer no motor de
  // peso/pagamento do X-GAME (dinheiro real do X-Pay pede rodada própria).
  const pedirDicaDoScript = async () => {
    if (script.trim().length < 15) return;
    setPedindoDica(true); setDicaScript(null);
    try {
      const r = await fetch('/api/functions/scriptContatoCoach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });
      const j = await r.json().catch(() => null);
      if (!j?.dica) { toast.error(j?.error || 'Não consegui conferir o script agora — tenta de novo?'); return; }
      setDicaScript({ pontos_fortes: j.pontos_fortes || '', dica: j.dica, aprovado: !!j.aprovado });
      if (j.aprovado && !perfil?.script_pontuado_em) {
        const ok = await salvarPerfil({ script, script_pontuado_em: new Date().toISOString() });
        if (ok) toast.success('🎉 Script aprovado! Isso já conta ponto pra você na hora do contato.');
      }
    } catch {
      toast.error('Deu erro ao conferir o script — tenta de novo em instantes?');
    } finally {
      setPedindoDica(false);
    }
  };

  // 🌟 DIR-44 — o quadro dos sonhos por horizonte
  const adicionarSonhos = async (itens) => {
    const ok = await salvarPerfil({ sonhos: [...sonhos, ...itens] });
    if (ok) setModalSonho(null); // falhou? modal fica aberto, nada se perde
  };
  const salvarDetalhesSonho = async (indice, texto) => {
    const ok = await salvarPerfil({
      sonhos: sonhos.map((item, j) => (j === indice ? { ...normalizarSonho(item), detalhes: String(texto || '').trim() } : item)),
    });
    if (ok) setEditandoSonho(null);
  };

  const sonhos = Array.isArray(perfil?.sonhos) ? perfil.sonhos : [];
  // 📅 DIR-80 — a rotina DELA quando ela editou; a da casa enquanto não editou.
  // (a coluna metodo_perfil.rotina existia e ninguém nunca escrevia nela)
  const rotina = useMemo(() => rotinaEmVigor(perfil, ROTINA_PADRAO), [perfil]);
  const estadoRotina = useMemo(() => estadoDaRotina(perfil), [perfil]);
  const progresso = progressoDia(tarefas);

  // ══ 🎮 X-GAME por cima do Master Task (mesma tela, zero mudança de fluxo) ══
  // MvM do Dia começa em 10 e DECAI quando a tarefa passa da hora sem marcar;
  // Human Token = MvM + constância do ciclo (teto 22,22; trava 19,99 pro
  // Platina, nunca pro Ouro, sem estudo — DIR-113); cotação cai do dia 1
  // ao 22 ("antecipação é poder").
  const ehHoje = dia === hojeStr();
  const [agoraMin, setAgoraMin] = useState(() => minutosBrasilia());
  // 🕐 RELÓGIO DE TESTE (só super admin): o jogo inteiro obedece o horário
  // simulado — estados AGORA/ATRASADO/PERDIDO, janela do ritual e da votação.
  const [horaTeste, setHoraTeste] = useState('');
  const [horaRascunho, setHoraRascunho] = useState('');
  const agoraMinJogo = useMemo(() => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(horaTeste);
    return m ? Number(m[1]) * 60 + Number(m[2]) : agoraMin;
  }, [horaTeste, agoraMin]);
  // 🧪 MODO DESENVOLVEDOR (só super admin): SIMULAÇÃO PURA — o dia ZERA,
  // roda no horário escolhido e NADA é salvo no banco. As marcações da
  // sessão de teste vivem só na memória (devMarcas); sair = tudo volta.
  const modoDev = podeGerir && !!horaTeste;
  const [devMarcas, setDevMarcas] = useState({}); // { tarefaId: { feito, comprovacao } }
  const tarefasJogo = useMemo(
    () => (modoDev
      ? tarefas.map((t) => ({ ...t, feito: !!devMarcas[t.id]?.feito, comprovacao: devMarcas[t.id]?.comprovacao || null, conferido: null }))
      : tarefas),
    [modoDev, tarefas, devMarcas]
  );
  const progressoJogo = useMemo(() => progressoDia(tarefasJogo), [tarefasJogo]);
  const [diasCiclo, setDiasCiclo] = useState([]);
  const [participante, setParticipante] = useState(null); // verbas/cargo (F1); sem cadastro = padrão da planilha
  const [cicloConfig, setCicloConfig] = useState(null); // xgame_config.ciclo_inicio (o INÍCIO X-GAME oficial)
  const [perdaoAte, setPerdaoAte] = useState(null); // xgame_config.perdao_zeragem_ate — perdão manual de um dia inteiro
  useEffect(() => {
    if (painel !== 'compromisso') return;
    const t = setInterval(() => setAgoraMin(minutosBrasilia()), 60000);
    return () => clearInterval(t);
  }, [painel]);
  useEffect(() => {
    if (painel !== 'compromisso' || !uid) { setParticipante(null); setCicloConfig(null); setPerdaoAte(null); return; }
    supabase.from('xgame_participantes').select('*').eq('user_id', uid).maybeSingle()
      .then(({ data }) => setParticipante(data || null));
    supabase.from('xgame_config').select('ciclo_inicio,perdao_zeragem_ate').eq('id', 'atual').maybeSingle()
      .then(({ data }) => { setCicloConfig(data?.ciclo_inicio || null); setPerdaoAte(data?.perdao_zeragem_ate || null); });
  }, [painel, uid]);
  useEffect(() => {
    if (painel !== 'compromisso' || !uid) { setDiasCiclo([]); return; }
    supabase.from('xgame_diario').select('data,tarefas_total,tarefas_feitas,detalhes')
      .eq('user_id', uid).eq('ciclo_inicio', dataISO(inicioCicloOficial(cicloConfig, new Date()))).lt('data', hojeStr()).order('data')
      .then(({ data, error }) => setDiasCiclo(error ? [] : (data || [])));
  }, [painel, uid, cicloConfig]);
  // 🔥 F7 — OFENSIVA: dias seguidos fechando ≥80% do dia (histórico atravessa
  // ciclos; fim de semana não quebra; 1 congelador automático por ofensiva)
  const [historicoOfensiva, setHistoricoOfensiva] = useState([]);
  useEffect(() => {
    if (painel !== 'compromisso' || !uid) { setHistoricoOfensiva([]); return; }
    supabase.from('xgame_diario').select('data,tarefas_total,tarefas_feitas,mvm_dia,detalhes')
      .eq('user_id', uid).lt('data', hojeStr()).order('data', { ascending: false }).limit(90)
      .then(({ data, error }) => setHistoricoOfensiva(error ? [] : (data || [])));
  }, [painel, uid]);
  // ⚡ F7 — XP na hora: o "+X pts" que voa quando a tarefa é marcada
  const [xpFlash, setXpFlash] = useState(null); // { id, pts, valor }
  // 💳 Vendas AUTOMÁTICAS: as vendas REAIS da loja da pessoa no ciclo pontuam
  // o componente de vendas do Human Token (a remuneração delas continua sendo
  // só a comissão da plataforma — aqui é ponto, não dinheiro). O dono da venda
  // pode estar em 4 colunas (legado — mesmo OR do CrmClientesTab).
  const [vendasCiclo, setVendasCiclo] = useState(null);
  // 🟢 09/09/2026 — DIR-110/110.1, dono: "o parceiro de compra... ele pode
  // fechar pela plataforma ou pode fazer depósito por fora." Venda de alto
  // valor na plataforma soma via catalog_sales; a "por fora" soma pela
  // esteira de captação (captacao_oportunidades.aporte_externo, DIR-40).
  useEffect(() => {
    if (painel !== 'compromisso' || !uid) { setVendasCiclo(null); return; }
    const ini = dataISO(inicioCicloOficial(cicloConfig, new Date()));
    Promise.all([
      supabase.from('catalog_sales').select('id,status,kind,created_date,total_amount')
        .or(filtroOrDonoDaVenda(uid))
        .gte('created_date', `${ini}T00:00:00`),
      supabase.from('captacao_oportunidades').select('estagio,aporte_externo,fechado_em')
        .eq('responsavel_id', uid)
        .gte('fechado_em', `${ini}T00:00:00`),
    ]).then(([{ data: sales, error: e1 }, { data: oportunidades, error: e2 }]) => {
      if (e1 || e2) { setVendasCiclo(null); return; }
      // 💰 09/09/2026 — a fórmula saiu daqui pro src/lib/vendasDoCiclo.js. Ela
      // não mudou: é a MESMA conta, agora num lugar só, porque a Visão
      // Executiva do time precisa dela também (achado da auditoria noturna — o
      // ranking via uma fonte de vendas diferente da que a pessoa via no
      // próprio painel). Fórmula duplicada é como as duas telas se separaram.
      setVendasCiclo(vendasDaPessoa({ sales, oportunidades }));
    });
  }, [painel, uid, cicloConfig]);
  // 🗳️ F3 — MvM MANUAL: colegas do jogo, meus votos de hoje e o que recebi no ciclo
  // (declarado ANTES do useMemo do xgame de propósito — a nota do dia agora
  // depende de ter votado em todos os colegas, ver "não pode ser votado" abaixo)
  const [colegas, setColegas] = useState([]); // participantes votáveis ativos (sem eu, sem super_admin fechado)
  const [nomesColegas, setNomesColegas] = useState({});
  const [votando, setVotando] = useState(''); // user_id do colega escolhido
  const [notas, setNotas] = useState({});     // { VIRTUDE: nota }
  const [votosDadosHoje, setVotosDadosHoje] = useState([]); // meus votos de hoje
  const [votosRecebidos, setVotosRecebidos] = useState([]); // recebidos no ciclo
  const [votacaoAberta, setVotacaoAberta] = useState(false); // bloco expandido
  // 🎓 08/09/2026 — dono: "Super Admin não pode ser votado a não ser que ele
  // esteja participando por dentro de uma mentoria... salvo se ele mesmo
  // permitir ser votado na MvM." Só o próprio super_admin vê e mexe nisto.
  const [meuAceitaSerVotado, setMeuAceitaSerVotado] = useState(true);
  const recebido = useMemo(() => mvmManual(votosRecebidos), [votosRecebidos]);
  const janelaAberta = janelaVotacaoAberta(agoraMinJogo);
  const jaVoteiEm = (id) => votosDadosHoje.filter((v) => v.votado_id === id).length >= VIRTUDES.length;
  // 🧯 08/09/2026 — dono: "a falta de voto dos integrantes uns nos outros
  // zera o dia — isso precisa ser explícito, é uma das coisas principais da
  // gamificação." Precisa fechar TODOS os colegas votáveis do dia — voto
  // parcial não conta (mesma régua de `jaVoteiEm`, colega por colega).
  const votouEmTodosHoje = useMemo(
    () => votouEmTodosOsColegas(colegas, colegas.filter((id) => jaVoteiEm(id))),
    [colegas, votosDadosHoje],
  );
  const xgame = useMemo(() => {
    if (painel !== 'compromisso' || tarefasJogo.length === 0) return null;
    return resumoDoDia({
      tarefas: tarefasJogo,
      agoraMin: ehHoje ? agoraMinJogo : 24 * 60,
      diasCiclo,
      hoje: ehHoje ? new Date() : new Date(`${dia}T12:00:00`),
      participante,
      cicloConfigISO: cicloConfig,
      // só julga o dia de HOJE que está sendo jogado agora — um dia passado
      // (histórico) já está fechado nos próprios registros, não se recalcula
      votouEmTodos: ehHoje ? votouEmTodosHoje : null,
      // 🕊️ 09/09/2026 — perdão de um dia excepcional inteiro, só vale se o
      // dia sendo jogado agora É o perdoado — histórico não se reescreve.
      perdoado: ehHoje && !!perdaoAte && hojeStr() <= perdaoAte,
    });
  }, [painel, tarefasJogo, agoraMinJogo, diasCiclo, dia, ehHoje, participante, cicloConfig, votouEmTodosHoje, perdaoAte]);
  // 🩹 08/09/2026 — `xgame` já é recalculado pro `dia` que está sendo visto
  // (não só hoje: veja o useMemo acima), então o estado de uma tarefa de um
  // dia passado também sai certo daqui — precisa pra recuperação de fim de
  // semana saber se a tarefa está mesmo PERDIDA.
  const estadoDaTarefa = (t) => (xgame ? xgame.tarefas.find((x) => x.id === t.id)?.estado : null);
  // 🏆 F4 — o HUMAN TOKEN OFICIAL do ciclo: 5 componentes (MvM da votação +
  // Produção + Real Time + Bônus + Vendas) somados sobre os 22 dias úteis,
  // com a trava 19,99 (só pra Platina — DIR-113) quando a leitura do ciclo
  // está em atraso.
  const ciclo = useMemo(() => {
    if (!xgame) return null;
    const r = tokenDoCiclo({
      diasCiclo,
      hojeResumo: { ...xgame.contagens, mvm_dia: xgame.mvm_dia },
      mvmVotacao: recebido.media,
      perfil: participante?.perfil || 'estrategico',
      vendasReais: vendasCiclo,
    });
    // 🎓 09/09/2026 — DIR-113, dono revendo o próprio pedido: a falta de
    // estudo (semana OU fim de semana) trava só o TOPO (Platina), nunca o
    // OURO — mesma função usada no X-Game, no ranking e no Painel Corporativo.
    const fdsOk = estudoFdsEmDia(diasCiclo, { data: hojeStr(), feito: xgame.estudo_fds_feito });
    const total = travarTopoPorEstudo(r.total, { estudoSemanaOk: xgame.estudo_em_dia, estudoFdsOk: fdsOk });
    // 🎖️ DIR-115 — portões de caráter (MvM) e meta de vendas: só decidem
    // QUAL liga o total pode valer, nunca o número exibido.
    const liga = ligaComPortoesDoCiclo(total, { mvmVotacao: recebido.media, vendasFeitas: r.vendasFeitas });
    return { ...r, total, liga, estudoEmDiaCompleto: xgame.estudo_em_dia && fdsOk, formacao: formacaoExecutivoIdeal(r.taxas) };
  }, [xgame, diasCiclo, recebido.media, participante, vendasCiclo]);
  const hojeFechou = !!(ehHoje && xgame && xgame.tarefas_total > 0
    && xgame.tarefas_feitas / xgame.tarefas_total >= OFENSIVA_META);
  const fogo = useMemo(() => ofensiva(historicoOfensiva, new Date(), hojeFechou), [historicoOfensiva, hojeFechou]);
  useEffect(() => {
    if (painel !== 'compromisso' || !uid) return;
    // 🎓 08/09/2026 — dono: Super Admin só entra na lista votável se ELE
    // MESMO abrir (`aceita_ser_votado`, ver podeSerVotado em lib/xgame.js) —
    // por isso a lista de colegas cruza com o `role` de cada um, e não só
    // com `xgame_participantes.ativo`.
    supabase.from('xgame_participantes').select('user_id,aceita_ser_votado').eq('ativo', true)
      .then(async ({ data }) => {
        const linhas = (data || []).filter((p) => p.user_id !== uid);
        const mine = (data || []).find((p) => p.user_id === uid);
        if (mine) setMeuAceitaSerVotado(mine.aceita_ser_votado !== false);
        if (!linhas.length) { setColegas([]); return; }
        const ids = linhas.map((p) => p.user_id);
        const { data: us } = await supabase.from('app_users').select('id,full_name,nickname,role').in('id', ids);
        const porId = new Map((us || []).map((u) => [u.id, u]));
        const votaveis = linhas.filter((p) => podeSerVotado({ role: porId.get(p.user_id)?.role, aceita_ser_votado: p.aceita_ser_votado }));
        setColegas(votaveis.map((p) => p.user_id));
        const m = {}; votaveis.forEach((p) => { const u = porId.get(p.user_id); if (u) m[u.id] = nomeExibicao(u); });
        setNomesColegas(m);
      });
    const ini = dataISO(inicioCicloOficial(cicloConfig, new Date()));
    supabase.from('xgame_votos_mvm').select('virtude,nota').eq('votado_id', uid).gte('data', ini)
      .then(({ data }) => setVotosRecebidos(data || []));
    supabase.from('xgame_votos_mvm').select('votado_id,virtude,nota').eq('votante_id', uid).eq('data', hojeStr())
      .then(({ data }) => setVotosDadosHoje(data || []));
  }, [painel, uid, cicloConfig]);
  const escolherColega = (id) => {
    setVotando(id);
    const prev = {};
    votosDadosHoje.filter((v) => v.votado_id === id).forEach((v) => { prev[String(v.virtude).toUpperCase()] = v.nota; });
    setNotas(prev);
  };
  const salvarVotos = async () => {
    const linhas = VIRTUDES.filter((v) => notas[v] >= 1).map((v) => ({
      votante_id: uid, votado_id: votando, data: hojeStr(), virtude: v, nota: notas[v], updated_at: new Date().toISOString(),
    }));
    if (!votando || linhas.length !== VIRTUDES.length) { toast.error('Dê a nota de 1 a 10 nas 10 virtudes.'); return; }
    setSalvando(true);
    const { error } = await supabase.from('xgame_votos_mvm').upsert(linhas, { onConflict: 'votante_id,votado_id,data,virtude' });
    setSalvando(false);
    if (error) { toast.error('Erro ao salvar a votação — tente de novo.'); return; }
    toast.success(`Votação registrada pra ${nomesColegas[votando] || 'colega'}!`);
    setVotosDadosHoje((prev) => [...prev.filter((v) => v.votado_id !== votando), ...linhas]);
    setVotando('');
    setNotas({});
  };
  // 🎓 08/09/2026 — só o próprio super_admin liga/desliga isto (ver a régua
  // `podeSerVotado`) — ninguém mais decide por ele se ele entra na MvM.
  const alternarAceitaSerVotado = async () => {
    const novo = !meuAceitaSerVotado;
    setMeuAceitaSerVotado(novo); // otimista — a tela não trava esperando o banco
    const { error } = await supabase.from('xgame_participantes').update({ aceita_ser_votado: novo }).eq('user_id', uid);
    if (error) { setMeuAceitaSerVotado(!novo); toast.error('Não deu pra salvar — tenta de novo.'); return; }
    toast.success(novo ? 'Você entrou na votação da MvM — os colegas já podem te avaliar hoje.' : 'Você saiu da votação da MvM — ninguém vota em você até você religar.');
  };
  // 🗳️ em quantos dias do ciclo eu votei (pra conquista e missão da votação)
  const [votosDias, setVotosDias] = useState([]);
  useEffect(() => {
    if (painel !== 'compromisso' || !uid) { setVotosDias([]); return; }
    const ini = dataISO(inicioCicloOficial(cicloConfig, new Date()));
    supabase.from('xgame_votos_mvm').select('data').eq('votante_id', uid).gte('data', ini)
      .then(({ data }) => setVotosDias([...new Set((data || []).map((v) => String(v.data).slice(0, 10)))]));
  }, [painel, uid, cicloConfig, votosDadosHoje.length]);
  // 🏅 F8 — conquistas e missões da semana, tudo derivado do que já gravamos
  const diaPerfeitoHoje = !!(ehHoje && xgame && xgame.tarefas_total > 0 && xgame.tarefas_feitas >= xgame.tarefas_total);
  const medalhas = useMemo(() => {
    if (!xgame) return [];
    return conquistas({
      historico: historicoOfensiva,
      fogo,
      vendasCiclo: vendasCiclo || 0,
      tokenCiclo: ciclo?.total || 0,
      formacaoPct: ciclo?.formacao?.pct || 0,
      votosDias: votosDias.length,
      estudoOk: xgame.estudo_em_dia,
      diaPerfeitoHoje,
    });
  }, [xgame, historicoOfensiva, fogo, vendasCiclo, ciclo, votosDias, diaPerfeitoHoje]);
  const missoes = useMemo(() => {
    if (!xgame) return [];
    const iniSemana = dataISO(inicioDaSemana(new Date()));
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
    if (ehHoje && xgame.tarefas_total > 0) {
      dias.push({
        pct: xgame.tarefas_feitas / xgame.tarefas_total,
        leitura: xgame.leitura_feita,
        mvm: xgame.mvm_dia,
        votou: votou.has(hojeStr()),
      });
    }
    return missoesDaSemana(dias, new Date());
  }, [xgame, historicoOfensiva, votosDias, ehHoje]);
  const [medalhasAbertas, setMedalhasAbertas] = useState(false);
  // 🏆 F5 — RANKING H-TOKEN da equipe no ciclo (filtros da planilha:
  // Moeda / MvM / Remuneração / Nome). Lê o placar de todo mundo e agrega.
  const [rankingAberto, setRankingAberto] = useState(false);
  const [rankingLinhas, setRankingLinhas] = useState([]);
  const [ordemRanking, setOrdemRanking] = useState('token');
  useEffect(() => {
    if (!rankingAberto || painel !== 'compromisso') return;
    const ini = dataISO(inicioCicloOficial(cicloConfig, new Date()));
    // 🗳️ 08/09/2026 — dono: "o MVM é só votação... tem gente que nem foi
    // votada com MVM alto." Esta coluna usava a MÉDIA do mvm_dia AUTOMÁTICO
    // (real time disfarçado de MVM) — agora vem só da votação de verdade.
    // 🏆 09/09/2026 — achado maior: o TOKEN deste ranking vinha da média de
    // token_dia (mvm_dia automático + aplicabilidade) — um cálculo PARALELO
    // que nunca levou voto em conta. Agora usa a MESMA fórmula com peso de
    // voto (tokenDoCiclo) do painel pessoal — por isso precisa do perfil.
    Promise.all([
      supabase.from('xgame_diario').select('user_id,data,pontos,detalhes').eq('ciclo_inicio', ini),
      // 📄 TODOS os votos do ciclo, não os 1.000 primeiros — ver lerTudoDoSupabase.
      lerTudoDoSupabase(() => supabase.from('xgame_votos_mvm').select('id,votado_id,virtude,nota').gte('data', ini)).then((data) => ({ data })),
      supabase.from('xgame_participantes').select('user_id,perfil'),
    ]).then(async ([{ data }, { data: votos }, { data: participantes }]) => {
        const votosPor = {};
        (votos || []).forEach((v) => { (votosPor[v.votado_id] ||= []).push(v); });
        const perfilPor = {};
        (participantes || []).forEach((p) => { perfilPor[p.user_id] = p.perfil; });
        const por = {};
        (data || []).forEach((d) => {
          const r = por[d.user_id] || (por[d.user_id] = { user_id: d.user_id, dias: 0, pontos: 0, xpay: 0, diasDatados: [] });
          r.dias += 1;
          r.pontos += Number(d.pontos) || 0;
          r.diasDatados.push({ data: d.data, detalhes: d.detalhes || {} });
          r.xpay += (Number(d.detalhes?.xpay_ganho) || 0) + (Number(d.detalhes?.xpay_recuperado) || 0);
        });
        Object.keys(votosPor).forEach((uid) => {
          if (!por[uid]) por[uid] = { user_id: uid, dias: 0, pontos: 0, xpay: 0, diasDatados: [] };
        });
        const linhas = Object.values(por).map((r) => {
          const votosRecebidos = votosPor[r.user_id];
          const mvmDoVoto = votosRecebidos ? mvmManual(votosRecebidos).media : null;
          const { total: tokenBruto, vendasFeitas } = tokenDoCiclo({
            diasCiclo: r.diasDatados,
            mvmVotacao: mvmDoVoto,
            perfil: perfilPor[r.user_id],
          });
          // 🎓 09/09/2026 — DIR-113: mesma trava do painel pessoal — falta de
          // estudo (semana OU fim de semana) trava só o TOPO (Platina), nunca
          // o Ouro. Antes só checava o fim de semana; agora checa os dois,
          // igual ao painel individual.
          const token = travarTopoPorEstudo(tokenBruto, {
            estudoSemanaOk: estudoEmDia(r.diasDatados),
            estudoFdsOk: estudoFdsEmDia(r.diasDatados),
          });
          return { ...r, token, mvm: mvmDoVoto, vendasFeitas };
        });
        const ids = linhas.map((l) => l.user_id);
        if (ids.length) {
          const { data: us } = await supabase.from('app_users').select('id,full_name,nickname').in('id', ids);
          const m = {}; (us || []).forEach((u) => { m[u.id] = nomeExibicao(u); });
          linhas.forEach((l) => { l.nome = m[l.user_id] || l.user_id.slice(0, 6); });
        }
        setRankingLinhas(linhas);
      });
  }, [rankingAberto, painel, cicloConfig]);
  const rankingOrdenado = useMemo(() => {
    const l = [...rankingLinhas];
    if (ordemRanking === 'nome') l.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    else l.sort((a, b) => (b[ordemRanking] || 0) - (a[ordemRanking] || 0));
    return l;
  }, [rankingLinhas, ordemRanking]);
  // 🛠️ O admin da gamificação (participantes, verbas, tarefas, ciclo e
  // conferência dupla) mora no painel Admin do Licensing — só super admin
  // (componente XGameAdmin). Aqui fica só o jogo do jogador.
  // a fotografia do dia no placar (xgame_diario) — recalculável, nunca trava a tela
  useEffect(() => {
    if (!xgame || !uid || !ehHoje || modoDev) return; // 🧪 modo dev nunca grava placar
    supabase.from('xgame_diario').upsert({
      user_id: uid, data: hojeStr(), ciclo_inicio: dataISO(xgame.ciclo_inicio),
      tarefas_total: xgame.tarefas_total, tarefas_feitas: xgame.tarefas_feitas,
      mvm_dia: xgame.mvm_dia, aplicabilidade: xgame.aplicabilidade, token_dia: xgame.token_dia,
      cotacao: xgame.cotacao, pontos: xgame.pontos,
      // 🐛 xpay_ganho/xpay_perdido eram LIDOS no ranking da equipe e nunca
      // gravados aqui: a coluna X-Pay do ranking vinha zerada pra todo
      // mundo desde sempre. Agora entram no retrato do dia.
      detalhes: {
        leitura_feita: xgame.leitura_feita, estudo_em_dia: xgame.estudo_em_dia, dia_util: xgame.dia_util,
        estudo_fds_feito: xgame.estudo_fds_feito,
        xpay_ganho: xgame.xpay?.ganho || 0, xpay_perdido: xgame.xpay?.perdido || 0,
        ...xgame.contagens,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,data' }).then(({ error }) => { if (error) console.warn('[X-GAME] placar:', error.message); });
     
  }, [uid, ehHoje, xgame?.pontos, xgame?.tarefas_feitas, xgame?.token_dia]);

  const mudarDia = (delta) => {
    setDia(somarDiasISO(dia, delta));
  };

  // 🔒 DIR-80 — os dias que ESTA sessão já gerou (na mão ou sozinha).
  // A trava "só em dia vazio" não basta sozinha: entre o fim da criação e a
  // releitura do banco existe uma janela em que `tarefas` ainda está vazia. Se
  // o efeito rodar nessa janela, ele gera o dia DE NOVO — foi exatamente isso
  // que a prova pegou (40 tarefas no lugar de 20). Marcar o dia é o que fecha
  // a janela, e vale mesmo que a releitura demore ou falhe.
  const diasGerados = useRef(new Set());

  const gerarDia = async () => {
    setSalvando(true);
    try {
      diasGerados.current.add(dia); // o automático não repete o que a mão acabou de fazer
      const linhas = gerarTarefasDaRotina(rotina, uid, dia, pesoAutomatico);
      await criarTarefasSemDuplicar(linhas);
      // 🔁 DIR-80 — gerar uma vez LIGA a repetição. "Só se a pessoa pedir pra
      // parar" — então o liga é aqui, e o desliga é um botão dela.
      // 🌅 DIR-81.1 — `rotina_gerada_em` sempre grava, ligada ou não: é contra
      // ISSO que o cron gerarJornadaDoDia confere antes de gerar de novo — não
      // contra a tabela de tarefas, que uma reunião avulsa também escreve.
      await salvarPerfil({ ...(estadoRotina.automatica ? {} : { rotina_automatica: true, rotina_automatica_desde: dia }), rotina_gerada_em: dia });
      toast.success(`Dia gerado com ${linhas.length} tarefas da sua rotina — a partir de agora ela se repete todo dia.`);
      carregarTarefas();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar o dia — a migração do Método já foi colada no banco?');
    } finally { setSalvando(false); }
  };

  // 🔁 DIR-80 — A ROTINA SE REPETE SOZINHA.
  // "Foi gerada uma vez, ela tem que ficar todo dia; só se a pessoa pedir pra
  // parar." A regra de QUANDO gerar mora em rotinaPessoal.deveGerarSozinha —
  // aqui só se obedece. As travas que ela impõe:
  //   • só em dia VAZIO (abrir a tela duas vezes não duplica);
  //   • nunca pra trás, e nunca antes do dia em que ela ligou;
  //   • e o `gerandoAuto` impede duas execuções no mesmo instante.
  const gerandoAuto = useRef(false);
  useEffect(() => {
    if (!uid || diaLido !== dia || gerandoAuto.current) return;
    if (diasGerados.current.has(dia)) return;
    if (!deveGerarSozinha({ perfil, dia, hojeISO: hojeStr(), tarefasDoDia: tarefas })) return;
    gerandoAuto.current = true;
    diasGerados.current.add(dia);
    (async () => {
      try {
        const linhas = gerarTarefasDaRotina(rotina, uid, dia, pesoAutomatico);
        await criarTarefasSemDuplicar(linhas);
        // DIR-81.1 — grava direto (sem salvarPerfil) pra não estourar o toast
        // "Salvo!" por cima do aviso de baixo, que é o que importa aqui.
        if (perfil?.id) await plataforma.entities.MetodoPerfil.update(perfil.id, { rotina_gerada_em: dia });
        toast.success(`Seu dia já nasceu com as ${linhas.length} tarefas da sua rotina.`);
        carregarTarefas();
      } catch (e) { console.error(e); }
      finally { gerandoAuto.current = false; }
    })();
  }, [uid, dia, diaLido, tarefas, perfil, rotina, pesoAutomatico, carregarTarefas]);

  // DIR-45.2 — dia gerado com a rotina antiga continua salvo no banco; este
  // botão apaga as tarefas do DIA ESCOLHIDO e recria com a Rotina Perfeita.
  const regerarDia = async () => {
    setSalvando(true);
    try {
      for (const t of tarefas) await plataforma.entities.MetodoTarefa.delete(t.id);
      const linhas = gerarTarefasDaRotina(rotina, uid, dia, pesoAutomatico);
      await criarTarefasSemDuplicar(linhas);
      if (perfil?.id) await plataforma.entities.MetodoPerfil.update(perfil.id, { rotina_gerada_em: dia });
      toast.success(`Dia regenerado com as ${linhas.length} tarefas da Rotina Perfeita!`);
      setConfirmaRegerar(false);
      carregarTarefas();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao regenerar o dia — tente de novo');
    } finally { setSalvando(false); }
  };

  // 🤝 F12 — TUDO CONECTADO: as reuniões agendadas no Contato & Convite entram
  // SOZINHAS na jornada do dia (peso 6, prova por foto/print) — antecipação.
  const reunioesDoDia = useMemo(
    () => (painel === 'compromisso' ? agendaDoDiaContatos(clientesManuais, dia).agendados : []),
    [painel, clientesManuais, dia]
  );
  const sincronizouReunioes = useRef('');
  useEffect(() => {
    if (painel !== 'compromisso' || !uid || tarefas.length === 0 || reunioesDoDia.length === 0) return;
    const chave = `${dia}:${reunioesDoDia.length}`;
    if (sincronizouReunioes.current === chave) return;
    sincronizouReunioes.current = chave;
    const novas = reunioesDoDia.filter(({ registro }) => {
      const hora = String(registro.quando || '').slice(11, 16);
      return hora && !tarefas.some((t) => t.hora === hora && /^reuni/i.test(t.titulo || ''));
    });
    if (!novas.length) return;
    Promise.all(novas.map(({ cliente, registro }, i) => plataforma.entities.MetodoTarefa.create({
      user_id: uid, data: dia, hora: String(registro.quando).slice(11, 16),
      titulo: `Reunião — ${cliente.full_name || 'contato'}`,
      detalhe: 'agendada no Contato & Convite — antecipação é poder',
      feito: false, ordem: 900 + i, categoria: 'producao', peso: 6, validacao: 'foto',
    }))).then(() => {
      toast.success(`🤝 ${novas.length === 1 ? 'Reunião do Contato & Convite entrou' : `${novas.length} reuniões do Contato & Convite entraram`} na sua jornada!`);
      carregarTarefas();
    }).catch(() => {});
  }, [painel, uid, dia, tarefas, reunioesDoDia, carregarTarefas]);
  // o link do Google Agenda da reunião sincronizada (abre direto do momento)
  const linkAgendaDe = (t) => {
    if (!/^Reunião — /.test(t?.titulo || '')) return null;
    const ag = reunioesDoDia.find(({ registro }) => String(registro.quando || '').slice(11, 16) === t.hora);
    if (!ag) return null;
    return {
      href: linkGoogleAgenda({
        titulo: ag.registro.titulo_reuniao || `Reunião — ${ag.cliente.full_name || 'contato'} (Leilão NoZap)`,
        inicio: ag.registro.quando, duracaoMin: ag.registro.duracao_min || 60,
        detalhes: ag.registro.obs || 'Apresentação de sucesso — Leilão NoZap',
      }),
      rotulo: 'abrir no Google Agenda',
    };
  };

  // 🗺️ F11 — JORNADA (padrão) × lista; o placar completo fica recolhido na jornada
  const [visao, setVisao] = useState('jornada');
  // 📌 08/09/2026 — dono: "vamos deixar a opção de a pessoa deixar fixo ou
  // recolhendo, porque tem gente que vai querer deixar fixo." O aberto/
  // fechado do "Como estou" persiste (localStorage) — quem deixa aberto,
  // abre aberto da próxima vez; quem fecha, fecha.
  const [painelAberto, setPainelAberto] = useState(() => {
    try { return localStorage.getItem('xgame_placar_aberto') === '1'; } catch { return false; }
  });
  const alternarPainel = () => {
    setPainelAberto((prev) => {
      const novo = !prev;
      try { localStorage.setItem('xgame_placar_aberto', novo ? '1' : '0'); } catch { /* sem storage, só não persiste */ }
      return novo;
    });
  };
  // 📱 no celular o placar completo NÃO abre sozinho na visão "lista" — só pelo
  // botão. Era o bloco mais denso da tela nascendo aberto (ordem do dono:
  // "muito texto explicando"). No desktop segue como sempre foi.
  const celular = useEhCelular();
  const mostrarPainel = (visao === 'lista' && !celular) || painelAberto;
  // 🌅 F11 — o Ritual do Amanhecer (a tarefa de gratidão abre experiência, não formulário)
  const [ritualId, setRitualId] = useState(null);
  // 📣 DIR-134 — o aviso "como funciona o ritual", dos 10min antes da
  // abertura até o fim da janela, pra quem ainda não fez hoje. Fechar vale
  // só pra essa sessão de tela — reaparece se recarregar ou amanhã, de
  // propósito: "não pode ter certeza que ela viu" (mesmo princípio do sino).
  const [avisoRitualFechado, setAvisoRitualFechado] = useState(false);
  const tarefaRitualHoje = useMemo(() => tarefas.find((x) => ehTarefaDeGratidao(x.titulo)), [tarefas]);
  const mostrarAvisoRitual = ehHoje && !avisoRitualFechado
    && deveAvisarRitual({ agoraMin: agoraMinJogo, ritualFeitoHoje: !!tarefaRitualHoje?.feito });
  // 🧾 10/09/2026 — AS FALHAS PRECISAM ATRAVESSAR AS TENTATIVAS.
  //
  // Quando a IA está fora do ar, `avaliarComIA` volta cedo e NÃO grava
  // comprovação nenhuma: a tentativa some sem deixar marca. Quando o envio da
  // imagem falha, idem. Guardando num ref por tarefa, a falha da 1ª tentativa
  // ainda está lá pra entrar na comprovação que a 3ª tentativa finalmente
  // gravar — que é exatamente a história que o laudo precisa contar.
  //
  // Ref, e não estado: isto não desenha nada, e re-renderizar a lista inteira
  // a cada falha técnica seria pior que o problema.
  const falhasPorTarefa = useRef({});
  const anotarFalhaDaTarefa = useCallback((tarefaId, o_que, erro) => {
    if (!tarefaId) return;
    falhasPorTarefa.current[tarefaId] = comFalha(falhasPorTarefa.current[tarefaId], { o_que, erro });
  }, []);
  /** Some com o rastro depois que ele já foi gravado na comprovação. */
  const limparFalhasDaTarefa = useCallback((tarefaId) => { delete falhasPorTarefa.current[tarefaId]; }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // 🧱 UM BLOCO DO RITUAL, GRAVADO NA HORA — 10/09/2026
  // ═══════════════════════════════════════════════════════════════════════
  // Luiz, no áudio: "vamos dividir em três". O que isso significa aqui embaixo
  // é que cada bloco escreve no banco quando termina, em vez de tudo ir junto
  // no fim. Em 09 e 10/09, sete de dez tentativas terminaram em ZERO porque o
  // veredito só existia no fim — e a Iara perdeu por 4 minutos depois de
  // entregar gratidão, vídeo e ação.
  //
  // 🟢 A IA NUNCA TRAVA O AVANÇO. Ela é chamada DEPOIS que o bloco já está
  // gravado, e o que ela responder entra numa segunda escrita. Decisão do
  // dono ("salva e a IA julga depois"), e ela tem uma razão dura: hoje a IA
  // passou três horas fora do ar. Print bloqueante + IA fora = ninguém passa
  // do bloco 1 às cinco da manhã.
  const salvarBlocoDoRitual = async (t, bloco, dados, { abertoEm } = {}) => {
    // 🧪 MODO DEV — SIMULAÇÃO PURA, IGUAL AO RESTO DO JOGO.
    //
    // 🔴 Sem esta guarda, testar o ritual com o relógio de teste (a ÚNICA
    // forma de abrir a tela fora das 04:40–05:30) gravaria de verdade: linha
    // nova em `metodo_tarefas`, print no bucket, vídeo no cofre e uma chamada
    // de IA por bloco. `concluirRitual` já simulava; o gravador de bloco
    // nasceu sem — e é ele que escreve agora, três vezes por ritual.
    //
    // O corpo simulado carrega os MESMOS campos do real (inclusive
    // `video_path`), pra quem está testando ver o selo e as pendências de
    // verdade em vez de um caminho falso que nunca reprova.
    if (modoDev) {
      const baseDev = devMarcas[t.id]?.comprovacao
        || { tipo: 'ritual', dev: true, aberto_em: abertoEm || new Date().toISOString(), aberto_dia: hojeStr() };
      const corpoDev = bloco === 'acordei'
        ? { print_url: 'dev://print-do-bom-dia', hash: 'dev' }
        : bloco === 'gratidao'
          ? { texto: dados.texto || '', entrada: dados.audioGratidao ? 'audio' : 'texto', audio_seg: dados.audioGratidaoSeg || 0, ...(dados.audioGratidao ? { audio_path: 'dev://voz' } : {}) }
          : { ...(dados.videoBlob ? { video_path: 'dev://video' } : {}), video_seg: dados.gravSeg || 0, acao: dados.acao || '' };
      const novaDev = comBloco(baseDev, bloco, corpoDev);
      novaDev.status = 'ritual_em_andamento';
      novaDev.valido = false;
      novaDev.dev = true;
      setDevMarcas((prev) => ({ ...prev, [t.id]: { feito: false, comprovacao: novaDev } }));
      return novaDev;
    }
    const anotarFalha = (o_que) => (erro) => anotarFalhaDaTarefa(t.id, o_que, erro);
    const base = {
      ...(t.comprovacao?.tipo === 'ritual' ? t.comprovacao : {}),
      aberto_em: t.comprovacao?.aberto_em || abertoEm || new Date().toISOString(),
      // 🗓️ o DIA em Brasília, gravado à parte: `aberto_em` é UTC, e fatiar
      // os 10 primeiros caracteres dele daria a data de Londres.
      aberto_dia: t.comprovacao?.aberto_dia || hojeStr(),
    };

    let corpo = {};
    if (bloco === 'acordei') {
      // o print sobe pelo MESMO caminho de toda comprovação do método
      const up = await plataforma.integrations.Core.UploadFile({ file: dados.file }).catch((e) => { anotarFalha('print')(e?.message || 'upload falhou'); return null; });
      if (!up?.file_url) throw new Error('print não subiu');
      corpo = { print_url: up.file_url, hash: dados.hash || '' };
    } else if (bloco === 'gratidao') {
      const voz = dados.audioGratidao
        ? await guardarAudio({ blob: dados.audioGratidao, caminho: caminhoDoAudio({ pasta: 'gratidao', uid, dia: hojeStr(), tarefaId: t.id, mime: dados.audioGratidao.type }), actorId: uid, aoFalhar: anotarFalha('audio') })
        : null;
      corpo = {
        texto: dados.texto || '',
        ...(dados.audioGratidao ? { entrada: 'audio', audio_seg: dados.audioGratidaoSeg || 0 } : { entrada: 'texto' }),
        ...(voz ? { audio_path: voz } : {}),
        ...(dados.transcricaoGratidao ? { transcricao: dados.transcricaoGratidao } : {}),
        meta_motivos: dados.metaMotivosHoje || 0,
      };
    } else if (bloco === 'visualizacao') {
      const videoPath = dados.videoBlob
        ? await guardarVideo({ blob: dados.videoBlob, caminho: caminhoDoVideo({ pasta: 'rituais', uid, dia: hojeStr(), tarefaId: t.id, mime: dados.videoBlob.type }), actorId: uid, aoFalhar: anotarFalha('video') })
        : null;
      const vozAcao = dados.audioAcao
        ? await guardarAudio({ blob: dados.audioAcao, caminho: caminhoDoAudio({ pasta: 'acao', uid, dia: hojeStr(), tarefaId: t.id, mime: dados.audioAcao.type }), actorId: uid, aoFalhar: anotarFalha('audio') })
        : null;
      // 🔴 guardar pode falhar, mas não pode falhar CALADO — foi o 413 de
      // hoje de manhã, em que cinco pessoas regravaram achando culpa própria.
      if (dados.videoBlob && !videoPath) toast.error('A visualização foi registrada, mas não consegui guardar a gravação. Não precisa refazer — já avisei o time.', { duration: 7000 });
      corpo = {
        ...(videoPath ? { video_path: videoPath } : {}),
        video_seg: dados.gravSeg || 0,
        acao: dados.acao || '',
        ...(vozAcao ? { audio_acao_path: vozAcao } : {}),
        ...(dados.audioAcao ? { entrada_acao: 'audio' } : {}),
      };
    }

    const nova = comBloco(base, bloco, corpo);
    // status intermediário: o ritual EXISTE e está em andamento. Não é
    // aprovada (não terminou) nem reprovada (não errou) — e `valido: false`
    // impede que um ritual pela metade conte como comprovação boa.
    nova.status = 'ritual_em_andamento';
    nova.valido = false;
    // 🧾 O RASTRO TAMBÉM AQUI — e não é detalhe.
    //
    // Cada bloco gravado é uma comprovação escrita no banco. Sem `tentativas`,
    // `temRastro()` devolve false e o laudo trata a linha como "anterior a
    // 10/09, antes do rastro existir" — sobre um registro criado HOJE. Quem
    // parar no bloco 2 e nunca concluir deixaria exatamente esse fantasma:
    // silêncio virando atestado de bom uso, que é a mentira confiante que o
    // rastro existe pra impedir.
    Object.assign(nova, rastroDa({ anterior: t.comprovacao, falhas: falhasPorTarefa.current[t.id] || [] }));
    nova.quando = new Date().toISOString();
    await plataforma.entities.MetodoTarefa.update(t.id, { comprovacao: nova });
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, comprovacao: nova } : x)));

    // 🤖 a IA olha DEPOIS, sem segurar ninguém. O que ela responder entra
    // numa segunda escrita, em cima do que já está gravado.
    julgarBlocoComIA(t.id, bloco, { ...dados, printUrl: corpo.print_url });
    return nova;
  };

  // 🤖 o julgamento assíncrono: nunca lança, nunca trava, e quando responde
  // grava por cima do que estiver no banco NAQUELE momento (a pessoa pode já
  // ter salvado o bloco seguinte enquanto a IA pensava).
  const julgarBlocoComIA = async (tarefaId, bloco, dados) => {
    try {
      // 📸 o print do bom dia já ESTÁ numa URL (subiu junto com o bloco) — a IA
      // busca de lá. O frame da visualização, não: ele nunca vira arquivo, vai
      // inline e morre com a chamada (ver frameEmBase64.js). São dois caminhos
      // porque são dois tipos de imagem com dois níveis de intimidade.
      let corpoDaImagem = null;
      if (bloco === 'acordei' && dados.printUrl) corpoDaImagem = { image_url: dados.printUrl };
      else if (bloco === 'visualizacao' && dados.frameBlob) {
        const b64 = await frameEmBase64(dados.frameBlob);
        if (b64) corpoDaImagem = { image_b64: b64 };
      }
      if (!corpoDaImagem) return;
      const alvo = tarefas.find((x) => x.id === tarefaId);
      const r = await plataforma.functions.xgameValidarPrint({
        ...corpoDaImagem,
        tipo: bloco === 'acordei' ? 'instagram' : 'ritual',
        titulo: alvo?.titulo || 'Ritual do Amanhecer',
        hora: alvo?.hora, data: hojeStr(),
      });
      if (!r || !['aprovada', 'reprovada', 'duvida'].includes(r.veredito)) return;
      setTarefas((prev) => prev.map((x) => {
        if (x.id !== tarefaId) return x;
        const atual = x.comprovacao || {};
        const marcada = comBloco(atual, bloco, { ...(atual.blocos?.[bloco] || {}), veredito_ia: r });
        plataforma.entities.MetodoTarefa.update(tarefaId, { comprovacao: marcada }).catch(() => {});
        return { ...x, comprovacao: marcada };
      }));
    } catch { /* IA fora não pode travar o ritual — o bloco já está gravado */ }
  };

  const concluirRitual = async (t, { gratidao, acao, videoBlob, frameBlob, gravSeg, audioGratidao, audioGratidaoSeg, transcricaoGratidao, audioAcao, tempoTelaS }) => {
    setRitualId(null);
    // 🧾 10/09/2026 — O RASTRO. Falha técnica durante a entrega vira registro,
    // não console.error. Sem isto, quem abre o laudo depois vê "reprovada" e
    // conclui mal uso — foi exatamente o que aconteceria com a Iara hoje, cuja
    // manhã tinha onze envios de vídeo voltando 413 sem deixar marca nenhuma.
    const falhasDaEntrega = () => falhasPorTarefa.current[t.id] || [];
    const anotarFalha = (o_que) => (erro) => anotarFalhaDaTarefa(t.id, o_que, erro);
    // 🧪 MODO DEV: o ritual roda inteiro, mas nada sobe nem grava
    if (modoDev) {
      // 🧪 o fechamento simulado calcula o selo pelos MESMOS blocos que a
      // sessão de teste montou. Antes era `aprovada_ritual` fixo — quem
      // testasse pulando o vídeo veria "aprovado" e nunca descobriria que a
      // tela de pendências existe, que é justo o que se quer ver no teste.
      const bloquinhos = devMarcas[t.id]?.comprovacao || {};
      const statusDev = statusDoRitual(bloquinhos);
      setDevMarcas((prev) => ({
        ...prev,
        [t.id]: {
          feito: statusDev === 'aprovada_ritual',
          comprovacao: {
            ...bloquinhos, tipo: 'ritual', dev: true, gratidao, acao, entrega: gratidao,
            valido: statusDev === 'aprovada_ritual', status: statusDev,
            ...(pendenciasDoRitual(bloquinhos).length ? { pendencias: pendenciasDoRitual(bloquinhos) } : {}),
            quando: new Date().toISOString(),
          },
        },
      }));
      toast.success(`🧪 modo dev: ritual simulado (${seloDoRitual(bloquinhos)}) — nada foi salvo`);
      return;
    }
    const agoraM = agoraMinJogo; // obedece o relógio de teste do super admin
    // 🕐 09/09/2026 — dono, ao vivo: "não tem como ela fazer depois de cinco
    // e quinze... ela perde o ritual." A entrada já é bloqueada em
    // alternarFeito, mas isso cobre quem abriu ANTES do prazo e só terminou
    // depois — com 2min de visualização + gratidão, dá pra passar do corte
    // quem começa em cima da hora.
    // 🕐 10/09/2026 — O PRAZO DEIXOU DE SER O RELÓGIO DA PAREDE.
    //
    // Era um corte seco às 05:30, igual pra todo mundo. Quem abria 05:25 tinha
    // cinco minutos; quem abria 04:40 tinha cinquenta. Em 10/09 a Iara
    // entregou 05:34:12 — gratidão, vídeo e ação feitos — e perdeu tudo por
    // 4 minutos e 12 segundos. No dia anterior, a Elenice, por 2min25s.
    //
    // Agora são DUAS réguas (ver ritualEmBlocos.js): a JANELA protege o
    // acordar cedo e continua barrando quem ABRE fora dela (alternarFeito);
    // o CRONÔMETRO de 30 minutos protege quem abriu na hora e demorou.
    //
    // E mesmo estourando, os blocos já entregues NÃO se perdem: o que estava
    // gravado continua gravado, e o registro fica parcial em vez de zero.
    if (ritualExpirado({ abertoEm: t.comprovacao?.aberto_em })) {
      const jaEntregue = t.comprovacao?.tipo === 'ritual' ? t.comprovacao : {};
      const comprovacaoPerdida = {
        ...jaEntregue,
        tipo: 'ritual', gratidao, acao, entrega: gratidao,
        quando: new Date().toISOString(), valido: false,
        status: blocosFeitos(jaEntregue).length ? 'ritual_parcial' : 'reprovada',
        veredito_ia: { veredito: 'reprovada', confianca: 100, o_que_viu: '', motivo: `Passou dos ${RITUAL_MINUTOS_PARA_CONCLUIR} minutos do ritual.` },
  ...rastroDa({ anterior: t.comprovacao, tempoTelaS, falhas: falhasDaEntrega() }),
      };
      try {
        await plataforma.entities.MetodoTarefa.update(t.id, { comprovacao: comprovacaoPerdida });
        setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, comprovacao: comprovacaoPerdida } : x)));
      } catch { /* o toast abaixo já avisa, mesmo se o registro falhar */ }
      toast.error(`Acabaram os ${RITUAL_MINUTOS_PARA_CONCLUIR} minutos. O que você já entregou ficou salvo — amanhã tem de novo.`);
      return;
    }
    const naJanela = agoraM >= RITUAL_INICIO_MIN; // o corte de cima já voltou acima

    // ═══════════════════════════════════════════════════════════════════
    // 🧱 O FECHAMENTO LÊ OS BLOCOS — NÃO SOBE NADA DE NOVO.
    // ═══════════════════════════════════════════════════════════════════
    // Vídeo, áudio e print já foram guardados quando cada bloco terminou
    // (salvarBlocoDoRitual). Subir tudo outra vez aqui duplicaria arquivo no
    // cofre e faria a pessoa esperar duas vezes pela mesma coisa.
    //
    // O que este trecho faz é só CARIMBAR: pega o que está gravado, calcula o
    // selo e escreve os campos de topo que o resto do app já lê há semanas
    // (`entrega` no Diário de Bolso, `video_path` no laudo, `gratidao` no
    // relatório). Os blocos são a verdade; o topo é a vitrine dela.
    const gravado = t.comprovacao?.tipo === 'ritual' ? t.comprovacao : {};
    const bl = gravado.blocos || {};
    const videoPath = bl.visualizacao?.video_path || '';
    const gratidaoTexto = bl.gratidao?.texto || gratidao || '';
    const transcricao = bl.gratidao?.transcricao || transcricaoGratidao || '';
    const acaoFinal = bl.visualizacao?.acao || acao || '';
    const houveAudio = bl.gratidao?.entrada === 'audio' || !!audioGratidao;
    const selo = seloDoRitual(gravado);
    const pendentes = pendenciasDoRitual(gravado);
    const statusFinal = statusDoRitual(gravado);
    const aprovadoDireto = naJanela && selo === 'brilhante';

    const comprovacao = {
      ...gravado,
      // ⚠️ `entrega` é o que o Diário de Bolso lê (diarioDeBolso.js: textoEFonte).
      // Com o áudio valendo sozinho, `gratidao` pode vir VAZIO — e aí o diário
      // mostraria a gratidão em branco. A ordem: o que ela escreveu, senão o
      // que ela falou (transcrito), senão uma frase honesta com o botão de
      // ouvir do lado. O que não pode é o dia dela virar uma linha vazia.
      tipo: 'ritual', gratidao: gratidaoTexto, acao: acaoFinal,
      entrega: gratidaoTexto || transcricao || (houveAudio ? '🎙️ gratidão gravada em áudio' : ''),
      ...(videoPath ? { video_path: videoPath, video_seg: bl.visualizacao?.video_seg || gravSeg || 0 } : {}),
      ...(bl.acordei?.print_url ? { print_url: bl.acordei.print_url, hash: bl.acordei.hash || '' } : {}),
      // 🎙️ como o texto entrou — decisão do dono de 09/09: áudio conta como
      // "as suas palavras", COM a origem registrada. Não é desconfiança: é
      // deixar a gestão enxergar o que aconteceu sem ter que adivinhar.
      ...(houveAudio ? { entrada_gratidao: 'audio', audio_gratidao_seg: bl.gratidao?.audio_seg || audioGratidaoSeg || 0 } : {}),
      // 🎙️ DIR-101.1 — a transcrição existe pro REGISTRO, não pra pessoa.
      ...(transcricao ? { gratidao_transcricao: transcricao } : {}),
      ...(bl.visualizacao?.entrada_acao ? { entrada_acao: bl.visualizacao.entrada_acao } : {}),
      ...(bl.gratidao?.audio_path ? { audio_gratidao_path: bl.gratidao.audio_path } : {}),
      ...(bl.visualizacao?.audio_acao_path ? { audio_acao_path: bl.visualizacao.audio_acao_path } : {}),
      tempo_tela_s: tempoTelaS || 0,
      ...rastroDa({ anterior: t.comprovacao, tempoTelaS, falhas: falhasDaEntrega() }),
      quando: new Date().toISOString(),
      // 🔴 `valido` NÃO pode ser sempre true. Um ritual parcial (dois blocos
      // de três, ou um bloco reprovado pela IA) é registro honesto, não
      // comprovação boa — e o que lê `valido` decide dinheiro e pontos.
      valido: statusFinal === 'aprovada_ritual',
      status: statusFinal,
      // 🧾 o que faltou fica GRAVADO, não só na tela: Luiz, 10/09 — "se ele
      // fez alguma coisa errada, a plataforma precisa sinalizar". Um toast
      // que some não sinaliza nada uma hora depois.
      ...(pendentes.length ? { pendencias: pendentes } : {}),
      veredito_ia: {
        veredito: statusFinal === 'aprovada_ritual' ? 'aprovada' : 'reprovada', confianca: 100,
        o_que_viu: `Ritual do Amanhecer — blocos entregues: ${blocosFeitos(gravado).join(', ') || 'nenhum'}${videoPath ? ` (visualização de ${bl.visualizacao?.video_seg || 0}s)` : ''}; ${tempoTelaS || 0}s de tela`,
        motivo: pendentes.map((x) => x.o_que).join(' · '),
      },
    };
    try {
      await plataforma.entities.MetodoTarefa.update(t.id, { feito: comprovacao.valido, comprovacao });
      limparFalhasDaTarefa(t.id); // já está gravado na comprovação — não repete na próxima
      setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, feito: comprovacao.valido, comprovacao } : x)));
      if (ehHoje && xgame && comprovacao.valido) {
        const pts = Math.round(15 * (xgame.cotacao || 1));
        setXpFlash({ id: t.id, pts, valor: xgame.valores?.[t.id] || 0 });
        setTimeout(() => setXpFlash((f) => (f?.id === t.id ? null : f)), 1600);
      }
      // 📳 o ritual do amanhecer é conquista: a vibração é mais longa
      vibrar(VIBRA_CONQUISTA);
      if (selo === 'parcial') toast('🌅 Ritual registrado pela metade — o que faltou está anotado na tarefa.', { icon: '⚠️', duration: 7000 });
      else toast.success(aprovadoDireto ? '🌅 BRILHANTE! O dia começou do jeito certo.' : '🌅 Ritual completo! (dica: grave o vídeo pra ganhar o selo BRILHANTE)');
    } catch { toast.error('Erro ao salvar'); carregarTarefas(); }
  };

  // ✅ F10 → DIR-84 — comprovação em MODAL (leve): tarefa com validação não
  // conclui sem provar, e a IA agora é "o maior validador" — cruza a imagem
  // com a tarefa e com o HISTÓRICO da pessoa antes de decidir. `comprovando`
  // carrega, além do básico, o estado de uma eventual pergunta pendente da
  // IA: { id, tipo, erro, enviando, pergunta, _printUrl, _hash, _dados }.
  const [comprovando, setComprovando] = useState(null);
  const [comprovacoesRecentes, setComprovacoesRecentes] = useState([]); // [comprovacao,...] da pessoa
  useEffect(() => {
    if (!comprovando || comprovando.tipo === 'aprendizado' || !uid) return;
    supabase.from('metodo_tarefas').select('comprovacao').eq('user_id', uid).not('comprovacao', 'is', null).limit(300)
      .then(({ data }) => setComprovacoesRecentes((data || []).map((r) => r.comprovacao).filter(Boolean)));
  }, [comprovando?.id, uid]);
  // prints já usados (anti-reuso EXATO, por hash) — a comparação VISUAL
  // (reciclagem reprocessada) é responsabilidade da IA, ver imagensParaComparar abaixo
  const hashesUsados = useMemo(() => new Set(comprovacoesRecentes.map((c) => c?.hash).filter(Boolean)), [comprovacoesRecentes]);

  // 🤖 chama a IA (1ª olhada OU 2ª, já com a justificativa da pessoa) e
  // aplica a régua de decisão (lib/xgameValidacao.decisaoAposIA) — nunca cai
  // pro gestor na primeira dúvida se a IA sabe o que perguntar.
  const avaliarComIA = async (t, { printUrl, hash, tipo, dadosOriginais, justificativa = '', tentativa = 1, entradaResumo = null, audioResumoPath = null }) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t.hora || ''));
    const iniMin = m ? Number(m[1]) * 60 + Number(m[2]) : null;
    const agoraM = agoraMinJogo; // obedece o relógio de teste do super admin
    const foraDaJanela = ehHoje && iniMin !== null && agoraM > iniMin + 120;
    const imagensAnteriores = tentativa === 1
      ? imagensParaComparar(comprovacoesRecentes.filter((c) => c?.tipo === tipo && c.print_url !== printUrl))
      : [];
    // 🚫 DIR-84.1 — sem resposta da IA = IA FORA (não "dúvida"): a régua
    // bloqueia em vez de deixar contar. Só um veredito REAL muda isso.
    let ia = { veredito: 'duvida', ia_indisponivel: true, motivo: 'a IA de validação não respondeu' };
    try {
      const r = await plataforma.functions.xgameValidarPrint({
        image_url: printUrl, tipo, titulo: t.titulo, hora: t.hora, data: hojeStr(),
        ...(tipo === 'aprendizado' ? { resumo: (dadosOriginais.texto || '').trim() } : {}),
        ...(imagensAnteriores.length ? { imagens_anteriores: imagensAnteriores } : {}),
        ...(justificativa ? { justificativa, tentativa: 2 } : {}),
      });
      if (r && ['aprovada', 'reprovada', 'duvida'].includes(r.veredito)) ia = r;
    } catch { /* fica como ia_indisponivel → régua bloqueia */ }

    const decisao = decisaoAposIA(ia, { foraDaJanela, tentativa });

    if (decisao.acao === 'ia_fora') {
      const det = ia?.details ? ` (${ia.details.status || 'erro'}${ia.details.model ? ` · ${ia.details.model}` : ''})` : '';
      // 🧾 esta tentativa NÃO grava comprovação — some sem deixar marca. A
      // falha fica no ref e entra na comprovação que a próxima tentativa
      // gravar: é o que separa "a pessoa não entregou" de "a IA estava fora".
      anotarFalhaDaTarefa(t.id, 'ia', `IA fora do ar${det}`);
      setComprovando({ ...comprovando, enviando: false, pergunta: null,
        erro: `🤖 A IA de validação está fora do ar agora${det} — sua foto NÃO foi descartada, tenta de novo em 1 minuto. Sem a IA conferir, a tarefa não conclui.` });
      return;
    }
    if (decisao.acao === 'pedir_justificativa') {
      // 🗣️ a pessoa se explica ANTES de qualquer humano ser acionado —
      // guarda o que já foi upado pra reenviar sem pedir a imagem de novo.
      setComprovando({
        ...comprovando, enviando: false, erro: '',
        pergunta: decisao.pergunta, _printUrl: printUrl, _hash: hash, _tipo: tipo, _dados: dadosOriginais,
      });
      return;
    }
    if (decisao.acao === 'reprovar') {
      setComprovando({ ...comprovando, enviando: false, erro: `🤖 A IA reprovou: ${decisao.motivo}`, pergunta: null });
      return;
    }
    // 🌊 DIR-89 — chegou até aqui só existindo 'aprovar': 'ia_fora',
    // 'pedir_justificativa' e 'reprovar' já retornaram lá em cima. Intervenção
    // humana zero, de vez — nenhuma comprovação nasce mais "em análise".
    const comprovacao = {
      tipo, print_url: printUrl, hash,
      ...(tipo === 'instagram' ? { link: (dadosOriginais.texto || '').trim() || null } : {}),
      ...(tipo === 'aprendizado' ? { resumo: (dadosOriginais.texto || '').trim() } : {}),
      // 🎙️ DIR-101 — origem do resumo e a voz guardada. Só aparecem quando
      // houve fala: quem digitou continua com exatamente o mesmo registro.
      ...(entradaResumo ? { entrada_resumo: entradaResumo } : {}),
      ...(audioResumoPath ? { audio_resumo_path: audioResumoPath } : {}),
      entrega: tipo === 'aprendizado' ? (dadosOriginais.texto || '').trim() : printUrl,
      ...rastroDa({ anterior: t.comprovacao, iaIndisponivel: !!ia?.ia_indisponivel, falhas: falhasPorTarefa.current[t.id] || [] }),
      quando: new Date().toISOString(), valido: true,
      status: 'aprovada_ia',
      veredito_ia: { veredito: ia.veredito, confianca: ia.confianca ?? 0, o_que_viu: ia.o_que_viu || '', motivo: ia.motivo || '' },
      ...(justificativa ? { justificativa_pessoa: justificativa } : {}),
      ...(foraDaJanela ? { fora_da_janela: true } : {}),
    };
    toast.success(`📸 Aprovada pela IA ✔${ia.o_que_viu ? ` — ${ia.o_que_viu}` : ''}`);

    setComprovando(null);
    try {
      await plataforma.entities.MetodoTarefa.update(t.id, { feito: true, comprovacao });
      limparFalhasDaTarefa(t.id); // já está gravado na comprovação — não repete na próxima
      setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, feito: true, comprovacao } : x)));
      if (ehHoje && xgame) {
        const est = estadoDaTarefa(t);
        const noHorario = !est || est.id === 'AGORA' || est.id === 'FUTURO';
        const pts = Math.round((10 + (noHorario ? 5 : 0)) * (xgame.cotacao || 1));
        setXpFlash({ id: t.id, pts, valor: xgame.valores?.[t.id] || 0 });
        setTimeout(() => setXpFlash((f) => (f?.id === t.id ? null : f)), 1600);
      }
      vibrar(VIBRA_CONCLUIU);
      toast.success('Comprovada e concluída! ✔');
    } catch { toast.error('Erro ao salvar'); carregarTarefas(); }
  };

  // dados = { file, texto } (primeira vez) OU { justificativa } (a pessoa
  // respondendo a pergunta da IA) vindos do modal.
  const concluirComComprovacao = async (t, dados) => {
    const tipo = comprovando.tipo;
    // 🧪 MODO DEV: valida o fluxo na tela, mas nada sobe nem grava
    if (modoDev) {
      if (tipo === 'aprendizado') {
        const v = validarComprovacao(tipo, dados.texto);
        if (!v.valido) { setComprovando({ ...comprovando, erro: v.motivo }); return; }
      } else if (!dados.file) {
        setComprovando({ ...comprovando, erro: 'anexe uma imagem pra simular a comprovação' });
        return;
      }
      vibrar(VIBRA_CONCLUIU);
      setDevMarcas((prev) => ({ ...prev, [t.id]: { feito: true, comprovacao: { tipo, valido: true, status: 'aprovada_ia', dev: true, entrega: '(simulada no modo dev)', quando: new Date().toISOString() } } }));
      setComprovando(null);
      toast.success('🧪 modo dev: comprovação simulada — nada foi salvo');
      return;
    }

    // 🔁 SEGUNDA RODADA: a pessoa está respondendo a pergunta da IA — reusa
    // a imagem já enviada, não sobe de novo.
    if (comprovando.pergunta && dados.justificativa) {
      setComprovando({ ...comprovando, enviando: true, erro: '' });
      await avaliarComIA(t, {
        printUrl: comprovando._printUrl, hash: comprovando._hash, tipo: comprovando._tipo,
        dadosOriginais: comprovando._dados, justificativa: dados.justificativa.trim(), tentativa: 2,
      });
      return;
    }

    // 📚 estudo exige o RESUMO DIGITADO primeiro (mínimo de verdade, sem colar)
    if (tipo === 'aprendizado') {
      const v = validarComprovacao(tipo, dados.texto);
      if (!v.valido) { setComprovando({ ...comprovando, erro: v.motivo }); return; }
    }
    // 📸 a IMAGEM é a prova em TODOS os tipos: valida + impressão digital antes de subir
    const hash = dados.file ? await hashDoArquivo(dados.file) : '';
    const vp = validarPrint(dados.file, hashesUsados, hash);
    if (!vp.valido) { setComprovando({ ...comprovando, erro: vp.motivo }); return; }
    setComprovando({ ...comprovando, enviando: true, erro: '' });
    let printUrl = '';
    try {
      const ext = (dados.file.name || 'print.png').split('.').pop().replace(/[^a-zA-Z0-9]/g, '') || 'png';
      const up = await plataforma.integrations.Core.UploadFile({
        file: dados.file,
        path: caminhoDeProva({ pasta: 'prints', uid, dia: hojeStr(), tarefaId: t.id, ext }),
      });
      printUrl = up?.file_url || up?.url || '';
    } catch (e) {
      // 🗣️ o `catch` era vazio: engolia a mensagem do Storage e todo mundo via a
      // mesma frase genérica. Sem o motivo real, ninguém consegue diagnosticar.
      const motivo = e?.message ? ` (${e.message})` : '';
      anotarFalhaDaTarefa(t.id, 'print', e?.message || 'envio da imagem falhou');
      setComprovando({ ...comprovando, enviando: false, erro: `Erro ao enviar a imagem — tente de novo.${motivo}` });
      return;
    }
    // 🎙️ DIR-101 — a voz do resumo também vira acervo, no cofre PRIVADO.
    // Best-effort e DEPOIS do print: o print é a prova e não pode esperar o
    // áudio; se o cofre piscar, a comprovação segue com o texto, que é o que
    // vale nota.
    let vozResumo = null;
    if (dados.audioResumo) {
      vozResumo = await guardarAudio({
        blob: dados.audioResumo,
        caminho: caminhoDoAudio({ pasta: 'resumos', uid, dia: hojeStr(), tarefaId: t.id, mime: dados.audioResumo.type }),
        actorId: uid,
      });
    }
    await avaliarComIA(t, {
      printUrl, hash, tipo, dadosOriginais: dados, tentativa: 1,
      // como o texto entrou — decisão do dono: áudio conta como "suas
      // palavras", COM a origem registrada.
      ...(dados.audioResumo ? { entradaResumo: 'audio' } : {}),
      ...(vozResumo ? { audioResumoPath: vozResumo } : {}),
    });
  };

  // 🖐️ ARRASTAR PARA REORGANIZAR — dono, 09/09/2026: "as tarefas podem também
  // agora conter um botão de arrastar para que possamos reorganizá-las
  // arrastando para cima ou para baixo de forma fluida".
  //
  // 🔴 ARRASTAR REMARCA A HORA, e isso é decisão, não efeito colateral. Soltar
  // sem mexer na hora recriaria o bug do #312: a lista fica fora de ordem
  // cronológica e `estadoDasTarefas` passa a marcar como PERDIDA uma tarefa que
  // está acontecendo agora — mexendo em X-Pay e na zeragem do dia. Aqui a
  // tarefa recebe a hora do lugar onde foi solta, e a lista continua sempre em
  // ordem de relógio.
  //
  // ⚠️ SEM CONTA DE ÍNDICE GLOBAL, de propósito. O arrasto cruza períodos
  // (manhã → tarde), e casar índice local do grupo com índice global da lista é
  // justamente o tipo de conta que gerou o bug de hoje. Aqui a tela só olha
  // QUEM FICOU ACIMA e QUEM FICOU ABAIXO no período de destino e pergunta a
  // hora pra `horaEntre` — duas entradas, nenhum índice pra errar.
  const aoSoltarTarefa = async ({ source, destination, draggableId }) => {
    if (!destination) return; // soltou fora
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const movida = tarefasJogo.find((t) => t.id === draggableId);
    if (!movida?.hora) return; // sem hora fica fora da Jornada de propósito
    const doDestino = tarefasJogo.filter((t) => periodoDe(t.hora) === destination.droppableId && t.id !== draggableId);
    const acima = doDestino[destination.index - 1] || null;
    const abaixo = doDestino[destination.index] || null;
    const nova = horaEntre(acima?.hora || null, abaixo?.hora || null);
    if (!nova || nova === movida.hora) return; // nada a gravar
    // ⚠️ Quando não coube minuto entre as vizinhas, `horaEntre` devolve a hora
    // da de cima. Aí quem decide a posição é `ordem` (ordenarPorHora desempata
    // por ela), então a movida precisa vir logo DEPOIS da de cima.
    const ordem = (nova === acima?.hora) ? Number(acima.ordem ?? 0) + 1 : ordemPelaHoraDoDia(nova);
    const antes = tarefas;
    setTarefas((prev) => ordenarPorHora(prev.map((x) => (x.id === movida.id ? { ...x, hora: nova, ordem } : x))));
    const { error } = await supabase.from('metodo_tarefas').update({ hora: nova, ordem }).eq('id', movida.id);
    if (error) {
      // 🔴 Sem isto a tela mostrava a tarefa no lugar novo e o banco ficava com
      // o antigo — a pessoa recarrega e "voltou sozinha". Volta e avisa.
      setTarefas(antes);
      toast.error('Não deu pra mover a tarefa. Tente de novo.');
      return;
    }
    toast.success(`Movida para as ${nova}`);
  };

  const alternarFeito = async (t) => {
    // 🧪 MODO DEV: os fluxos abrem normal, mas a marcação fica só na memória
    if (modoDev) {
      if (!t.feito) {
        if (ehTarefaDeGratidao(t.titulo)) { setRitualId(t.id); return; }
        const tipoDev = tipoDeValidacao(t);
        if (tipoDev) { setComprovando({ id: t.id, tipo: tipoDev, erro: '', enviando: false }); return; }
      }
      vibrar(t.feito ? VIBRA_ERRO : VIBRA_CONCLUIU);
      setDevMarcas((prev) => ({ ...prev, [t.id]: { feito: !t.feito, comprovacao: null } }));
      return;
    }
    // 🔓 08/09/2026 — dono: "se ele perder as tarefas do dia, pode recompensar
    // no fim de semana, comprovando que fez, pra manter o fixo — sem lesar,
    // sem se ferrar." Livre (sem teto de quantidade), só limitado ao fim de
    // semana DO MESMO CICLO em que a tarefa foi perdida — fora disso o dia
    // passado fica trancado (é histórico, não dá pra reescrever qualquer hora).
    const recuperandoNoFds = !t.feito && !ehHoje && xgame
      && podeRecuperarNoFds({
        estadoId: estadoDaTarefa(t)?.id, dataTarefaISO: dia, cicloInicioISO: dataISO(xgame.ciclo_inicio), hoje: new Date(),
      });
    if (!t.feito && !ehHoje && !recuperandoNoFds) {
      toast.error(ehFimDeSemana(new Date())
        ? 'Essa tarefa não pode mais ser recuperada — está fora do ciclo atual.'
        : 'Dia passado é histórico. Você pode recuperar tarefas PERDIDAS no fim de semana deste ciclo, comprovando que fez — sem perder o fixo.');
      return;
    }
    // 🌅 F11 — gratidão abre o RITUAL DO AMANHECER, não formulário
    if (!t.feito && ehTarefaDeGratidao(t.titulo) && !t.comprovacao?.valido) {
      // 🕐 09/09/2026 — dono, ao vivo: "não tem como ela fazer depois de
      // cinco e quinze. Se ela não fizer até cinco e quinze ela perde o
      // ritual." Passou do prazo: nem abre a experiência — fazer o ritual
      // inteiro só pra descobrir no fim que não conta seria pior.
      if (ehHoje && agoraMinJogo > RITUAL_FIM_MIN) {
        toast.error(`Ritual perdido — o prazo era até ${horaDeMin(RITUAL_FIM_MIN)}. Amanhã tem de novo.`);
        return;
      }
      setRitualId(t.id);
      return;
    }
    // ✅ F10 — tem validação e está marcando como feita? primeiro comprova
    if (!t.feito) {
      const tipo = tipoDeValidacao(t);
      if (tipo && !t.comprovacao?.valido) {
        setComprovando({ id: t.id, tipo, erro: '', enviando: false });
        return;
      }
    }
    // ⚡ marcou FEITO hoje? mostra o XP na hora (10 pts, +5 no horário, × cotação)
    if (!t.feito && ehHoje && xgame) {
      const est = estadoDaTarefa(t);
      const noHorario = !est || est.id === 'AGORA' || est.id === 'FUTURO';
      const pts = Math.round((10 + (noHorario ? 5 : 0)) * (xgame.cotacao || 1));
      setXpFlash({ id: t.id, pts, valor: xgame.valores?.[t.id] || 0 });
      setTimeout(() => setXpFlash((f) => (f?.id === t.id ? null : f)), 1600);
    }
    // 📳 o telefone responde na hora — antes mesmo do banco confirmar
    vibrar(t.feito ? VIBRA_ERRO : VIBRA_CONCLUIU);
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, feito: !t.feito } : x)));
    // ⏰ o carimbo do pronto: quando deu, e limpa a devolução (se a tarefa tinha voltado)
    try { await plataforma.entities.MetodoTarefa.update(t.id, carimboDoPronto(!t.feito)); }
    catch { toast.error('Erro ao salvar'); carregarTarefas(); }
    // 💰 08/09/2026 — recuperou uma PERDIDA no fim de semana: o X-Pay dela
    // volta pro jogador, SOMADO ao que já estava gravado — sem tocar em
    // xpay_ganho/mvm_dia/token_dia do dia (o Real Time daquele dia continua
    // honesto; só o dinheiro é que não se perde. "sem lesar, sem se ferrar")
    if (recuperandoNoFds && uid) {
      const valorRecuperado = Number(xgame.valores?.[t.id]) || 0;
      if (valorRecuperado > 0) {
        try {
          const { data: linhaExistente } = await supabase.from('xgame_diario')
            .select('detalhes').eq('user_id', uid).eq('data', dia).maybeSingle();
          const detalhesAntigos = linhaExistente?.detalhes || {};
          await supabase.from('xgame_diario').upsert({
            user_id: uid, data: dia,
            detalhes: { ...detalhesAntigos, xpay_recuperado: Math.round((Number(detalhesAntigos.xpay_recuperado || 0) + valorRecuperado) * 100) / 100 },
          }, { onConflict: 'user_id,data' });
          toast.success(`💪 Recuperada! ${fmtReais(valorRecuperado)} voltou pro seu X-Pay.`);
        } catch { /* recuperação de dinheiro não pode travar a tarefa marcada */ }
      }
    }
    // 🔗 DIR-76 — A VOLTA. Se esta tarefa nasceu de um card do quadro, o card
    // acompanha: feita → Feito (com carimbo); desmarcada → volta pra mesa. Sem
    // isto a pessoa faz o trabalho no dia e ainda tem que ir marcar no quadro —
    // e é aí que o dado morre. Falha aqui não pode derrubar o marcar da tarefa:
    // é só o espelho, então engole o erro em silêncio.
    try {
      await supabase.from('metodo_quadro')
        .update(!t.feito ? { coluna: ESTADO_FEITO, feito_em: new Date().toISOString() } : { coluna: ESTADO_ABERTO, feito_em: null })
        .eq('virou_tarefa_id', t.id);
    } catch { /* espelho — a tarefa já está salva */ }
  };

  // 🗂️ DIR-76 — dia → quadro. A tarefa que não vai sair hoje é GUARDADA numa
  // lista em vez de virar PERDIDO pra sempre; some do dia (e o X-Pay dos que
  // ficaram se reparte entre eles, que é o correto: ela foi adiada, não perdida).
  const guardarNoQuadro = async (t) => {
    if (!uid || t.feito) return;
    let lista = null;
    const { data: listas } = await supabase.from('metodo_quadro_listas').select('*').eq('user_id', uid).order('ordem', { ascending: true }).limit(1);
    if (Array.isArray(listas) && listas[0]) lista = listas[0];
    else {
      // sem lista ainda: nasce a primeira do modelo, pra ter onde guardar
      const { data } = await supabase.from('metodo_quadro_listas').insert({ user_id: uid, nome: LISTAS_MODELO[0].nome, cor: LISTAS_MODELO[0].cor, ordem: 0 }).select().single();
      lista = data || null;
    }
    const linha = cartaoDaTarefa(t, { userId: uid, listaId: lista?.id });
    if (!linha) { toast.error('Não deu pra guardar — sem lista no quadro'); return; }
    const { error } = await supabase.from('metodo_quadro').insert(linha);
    if (error) { toast.error('Não deu pra guardar no quadro'); return; }
    setTarefas((prev) => prev.filter((x) => x.id !== t.id));
    try { await plataforma.entities.MetodoTarefa.delete(t.id); }
    catch { carregarTarefas(); }
    toast.success(`"${t.titulo}" guardada em ${lista?.nome || 'no quadro'} — volta pro dia quando você quiser.`);
  };

  // 🔗 06/09 — a entrada da Lista com os três destinos: o dia é certo; a hora
  // põe na Jornada; "também no quadro" cria o card ligado (lib/destinos.js).
  const addTarefa = async () => {
    if (!novaTarefa.titulo.trim() || !uid) return;
    let listaId = novaTarefa.listaId || listasDoQuadro[0]?.id || null;
    let listaNome = listasDoQuadro.find((l) => l.id === listaId)?.nome || null;
    if (novaTarefa.noQuadro && !listaId) {
      // sem lista ainda: nasce a primeira do modelo, pra ter onde pôr
      const { data } = await supabase.from('metodo_quadro_listas').insert({ user_id: uid, nome: LISTAS_MODELO[0].nome, cor: LISTAS_MODELO[0].cor, ordem: 0 }).select().single();
      if (data) { listaId = data.id; listaNome = data.nome; setListasDoQuadro([data]); }
    }
    const plano = planoDeEntrada({ origem: 'lista', titulo: novaTarefa.titulo, hora: novaTarefa.hora || null, noQuadro: novaTarefa.noQuadro, listaId, userId: uid, dataISO: dia, ordemTarefa: tarefas.length });
    if (!plano.tarefa) { toast.error('Não deu pra adicionar'); return; }
    try {
      const criada = await plataforma.entities.MetodoTarefa.create(plano.tarefa);
      if (plano.cartao) {
        const { error } = await supabase.from('metodo_quadro').insert(ligarCartaoATarefa(plano.cartao, criada?.id || 'sem-id'));
        if (error) toast.error('Entrou no dia, mas não deu pra pôr no quadro');
      } else if (novaTarefa.noQuadro) toast.error('Entrou no dia, mas o quadro está sem lista');
      toast.success(fraseEntrou(plano, { listaNome }));
      setNovaTarefa({ hora: '', titulo: '', noQuadro: false, listaId: novaTarefa.listaId });
      carregarTarefas();
    } catch { toast.error('Erro ao adicionar'); }
  };
  useEffect(() => {
    if (visao !== 'lista' || !uid) return;
    supabase.from('metodo_quadro_listas').select('id,nome,cor,ordem').eq('user_id', uid).order('ordem', { ascending: true })
      .then(({ data }) => setListasDoQuadro(Array.isArray(data) ? data : []))
      .catch(() => setListasDoQuadro([]));
  }, [visao, uid]);

  // ✏️ DIR-80 — editar a tarefa DE HOJE (não a rotina: são coisas diferentes,
  // e a tela diz qual é qual no título de cada botão)
  // 📅 DIR-80 — o painel da ROTINA DELA (diferente de editar a tarefa de hoje)
  const [rotinaAberta, setRotinaAberta] = useState(false);
  const [editandoRotina, setEditandoRotina] = useState(null);
  const [rascunho, setRascunho] = useState({ hora: '', titulo: '' });
  const [novoDaRotina, setNovoDaRotina] = useState({ hora: '', titulo: '' });
  const gravarRotina = async (nova) => {
    const ok = await salvarPerfil({ rotina: nova });
    if (ok) toast.success(`Rotina salva — vale a partir de ${valeAPartirDe(hojeStr())?.split('-').reverse().slice(0, 2).join('/') || 'amanhã'}.`);
    else toast.error('Erro ao salvar a rotina');
    return ok;
  };

  const [editandoId, setEditandoId] = useState(null);
  const [edicao, setEdicao] = useState({ hora: '', titulo: '' });
  const [previaEdicaoAberta, setPreviaEdicaoAberta] = useState(false);
  // 🔴 10/09/2026 — DAR HORA A UMA TAREFA TEM QUE MOVER ELA DE LUGAR.
  //
  // Antes, isto trocava a hora com um `.map()` — que preserva a POSIÇÃO — e
  // não mexia na `ordem`. No vídeo do dono: a tarefa recebeu 09:15 e continuou
  // desenhada DEPOIS da de 10:30, no fim da manhã. Só voltava pro lugar
  // recarregando a página, porque é no carregamento que a lista passa por
  // `ordenarPorHora`. Daí a impressão de "sou obrigado a arrastar".
  //
  // Duas coisas, e as duas importam:
  //   • reordenar a lista na hora — o `.map()` sozinho não move nada;
  //   • gravar a `ordem` nova. Sem isso a tarefa carrega pra sempre a `ordem`
  //     que ganhou quando nasceu sem hora, e todo empate de horário é
  //     desempatado pelo número errado — inclusive depois de arrastar.
  const salvarEdicao = async (t) => {
    const titulo = String(edicao.titulo || '').trim();
    if (!titulo) { toast.error('O título não pode ficar vazio — pra tirar, use a lixeira.'); return; }
    const hora = edicao.hora || '';
    const ordem = ordemPelaHoraDoDia(hora);
    setTarefas((prev) => ordenarPorHora(prev.map((x) => (x.id === t.id ? { ...x, titulo, hora, ordem } : x))));
    setEditandoId(null);
    try { await plataforma.entities.MetodoTarefa.update(t.id, { titulo, hora, ordem }); }
    catch { toast.error('Erro ao salvar a edição'); carregarTarefas(); }
  };
  // 🔮 DIR-91 — mudou a hora? mostra a prévia da Jornada antes de gravar.
  const tentarSalvarEdicao = (t) => {
    if (String(edicao.hora || '').trim()) { setPreviaEdicaoAberta(true); return; }
    salvarEdicao(t);
  };

  const removerTarefa = async (t) => {
    setTarefas((prev) => prev.filter((x) => x.id !== t.id));
    try { await plataforma.entities.MetodoTarefa.delete(t.id); }
    catch { toast.error('Erro ao apagar'); carregarTarefas(); }
  };

  // 🎤 Hábito 5 — reuniões da esteira nos próximos 7 dias
  const reunioes = useMemo(() => {
    const agora = new Date();
    const fim = new Date(agora.getTime() + 7 * 86400000);
    return oportunidades
      .filter((o) => ehAtiva(o) && o.reuniao_em && new Date(o.reuniao_em) >= new Date(agora.getTime() - 86400000) && new Date(o.reuniao_em) <= fim)
      .sort((a, b) => new Date(a.reuniao_em) - new Date(b.reuniao_em));
  }, [oportunidades]);
  const reunioesHoje = reunioes.filter((o) => String(o.reuniao_em).slice(0, 10) === hojeStr()).length;

  // DIR-46 — agenda qualificada: busca + ordenação por probabilidade de
  // fechamento (não qualificados por último, em ordem alfabética).
  const listaOrdenada = useMemo(() => {
    const termo = buscaLista.trim().toLowerCase();
    const filtrados = clientesManuais.filter((c) => !termo
      || String(c.full_name || '').toLowerCase().includes(termo)
      || String(c.phone || '').toLowerCase().includes(termo)
      || String(c.email || '').toLowerCase().includes(termo));
    return [...filtrados].sort((a, b) => {
      const pa = probabilidadeFechamento(a.qualificacao_network)?.pct ?? -1;
      const pb = probabilidadeFechamento(b.qualificacao_network)?.pct ?? -1;
      return pb - pa || String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR');
    });
  }, [clientesManuais, buscaLista]);
  // 🖐️ 09/09/2026 — achado no tour: o botão "Qualificar" só existe pra quem
  // ainda não tem nota, e todo mundo nesse estado tinha o MESMO data-teste —
  // o alvo do tour não era necessariamente o primeiro da lista visível.
  // Aqui é a pessoa CERTA: a primeira sem qualificação, na mesma ordem que
  // a tela mostra.
  const primeiroNaoQualificadoId = useMemo(
    () => listaOrdenada.find((c) => !c.qualificacao_network)?.id || null,
    [listaOrdenada],
  );

  const salvarQualificacao = async (contato, quali) => {
    setSalvando(true);
    const ok = await onQualificar?.(contato, quali);
    setSalvando(false);
    if (ok) setQualificando(null); // falhou? modal fica aberto, notas não se perdem
  };

  // 📜 DIR-47/50 — registrar o desfecho (novo) ou salvar a edição (existente)
  const salvarRegistroContato = async (contato, registro) => {
    setSalvando(true);
    const ok = registroAberto?.editar
      ? await onEditarRegistro?.(contato, { ...registroAberto.editar, ...registro })
      : await onRegistrarContato?.(contato, registro);
    setSalvando(false);
    if (ok) setRegistroAberto(null);
  };

  // 🗓️ DIR-47/48/103 — a Google Agenda da PRÓPRIA pessoa (leitura + criação
  // de evento; mesmo GOOGLE_CLIENT_ID do login). O token nunca vai pro
  // servidor; quem cuida dele é o `src/lib/googleAgenda.js`.
  const conectarGoogleAgenda = async () => {
    setGoogleConectando(true);
    try {
      const token = await tokenDoGoogle();
      const ini = new Date(); ini.setHours(0, 0, 0, 0);
      const fim = new Date(ini.getTime() + 86400000);
      const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(ini.toISOString())}&timeMax=${encodeURIComponent(fim.toISOString())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw erroDoGoogle(resp);
      const j = await resp.json();
      setGoogleEventos((j.items || []).map((e) => ({ id: e.id, titulo: e.summary || '(sem título)', inicio: e.start?.dateTime || e.start?.date || '' })));
      setGoogleConta(contaLembrada());
      toast.success('Google Agenda conectada — eventos de hoje na tela');
    } catch (e) {
      console.warn('Google Agenda:', e);
      invalidarTokenSePreciso(statusDoErro(e));
      toast.error(`Não deu pra conectar a Google Agenda: ${e.message}`);
    } finally { setGoogleConectando(false); }
  };

  // "Trocar conta": esquecer o e-mail lembrado é o ÚNICO jeito de o Google
  // voltar a perguntar. Sem este botão, lembrar a conta viraria prisão pra
  // quem realmente tem duas agendas.
  const trocarContaGoogle = async () => {
    esquecerConta();
    setGoogleConta(null);
    setGoogleEventos(null);
    await conectarGoogleAgenda();
  };

  // DIR-48 — cria o evento DE VERDADE na agenda da própria pessoa. Falhou?
  // Devolve null e o agendamento segue com o link de template (nunca trava).
  const criarEventoNoGoogle = async (registro, cliente) => {
    try {
      const corpo = eventoGoogleDaReuniao({
        titulo: registro.titulo_reuniao || `Reunião — ${cliente?.full_name || 'contato'} (Leilão NoZap)`,
        inicio: registro.quando,
        duracaoMin: registro.duracao_min || 60,
        detalhes: registro.obs || 'Apresentação de sucesso — Leilão NoZap',
        local: registro.local || '',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      });
      if (!corpo) return null;
      const token = await tokenDoGoogle();
      const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (!resp.ok) throw erroDoGoogle(resp);
      const j = await resp.json();
      if (j?.id) registro.google_event_id = j.id; // DIR-50: o id permite editar/apagar depois
      toast.success('Evento criado na sua Google Agenda!');
      return j?.htmlLink || null;
    } catch (e) {
      console.warn('Criar evento Google:', e);
      // 🔴 DIR-103 — antes isto era `setGoogleToken(null)` em QUALQUER erro: um
      // 500 do Google ou a internet oscilando jogava fora um token bom e
      // obrigava nova janela de autorização — e é na janela que a pessoa erra
      // a conta. Agora só 401/403 (a autorização acabou de verdade) derruba.
      invalidarTokenSePreciso(statusDoErro(e));
      toast.info(`Não deu pra criar no Google agora (${e.message}) — o agendamento foi salvo e o botão Google Agenda continua na agenda do dia.`);
      return null;
    }
  };

  // ✏️ DIR-50 — edita o evento JÁ CRIADO na agenda da pessoa (PATCH). Sem id
  // (registro antigo sem link)? Cria um novo. Falhou? Devolve o link antigo e
  // avisa honesto — a edição no método nunca trava por causa do Google.
  const atualizarEventoNoGoogle = (registroOriginal) => async (registro, cliente) => {
    const eventId = idDoEventoGoogle(registroOriginal);
    if (!eventId) return criarEventoNoGoogle(registro, cliente);
    try {
      const corpo = eventoGoogleDaReuniao({
        titulo: registro.titulo_reuniao || `Reunião — ${cliente?.full_name || 'contato'} (Leilão NoZap)`,
        inicio: registro.quando,
        duracaoMin: registro.duracao_min || 60,
        detalhes: registro.obs || 'Apresentação de sucesso — Leilão NoZap',
        local: registro.local || '',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      });
      if (!corpo) return registroOriginal.google_event_link || null;
      const token = await tokenDoGoogle();
      const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (!resp.ok) throw erroDoGoogle(resp);
      const j = await resp.json();
      registro.google_event_id = j?.id || eventId;
      toast.success('Evento atualizado na sua Google Agenda!');
      return j?.htmlLink || registroOriginal.google_event_link || null;
    } catch (e) {
      console.warn('Atualizar evento Google:', e);
      invalidarTokenSePreciso(statusDoErro(e));
      toast.info(`A reunião foi atualizada no método, mas o Google não deixou mexer no evento agora (${e.message}) — ajuste por lá pelo link.`);
      return registroOriginal.google_event_link || null;
    }
  };

  // 🗑️ DIR-50 — apaga o evento na Google Agenda (DELETE). Falhou? A exclusão
  // no método segue, com aviso honesto pra apagar por lá.
  const apagarEventoNoGoogle = async (registro) => {
    const eventId = idDoEventoGoogle(registro);
    if (!eventId) return true;
    try {
      const token = await tokenDoGoogle();
      const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok && resp.status !== 404 && resp.status !== 410) throw erroDoGoogle(resp);
      toast.success('Evento apagado da sua Google Agenda.');
      return true;
    } catch (e) {
      console.warn('Apagar evento Google:', e);
      invalidarTokenSePreciso(statusDoErro(e));
      toast.info(`Excluída do método — mas o Google não deixou apagar o evento agora (${e.message}). Apague por lá pelo link, se ainda existir.`);
      return false;
    }
  };

  // 🗑️ DIR-50 — excluir com 2 cliques (o segundo confirma), Google junto
  const excluirRegistro = async (cliente, registro) => {
    if (confirmaExcluir !== registro.id) { setConfirmaExcluir(registro.id); return; }
    setConfirmaExcluir(null);
    setSalvando(true);
    await apagarEventoNoGoogle(registro);
    await onExcluirRegistro?.(cliente, registro.id);
    setSalvando(false);
  };

  // 🏛️ DIR-52 — reuniões fixas do negócio (tabela própria; leitura pra todos)
  useEffect(() => {
    if (painel !== 'contato') return;
    plataforma.entities.ReuniaoEmpresa.filter({})
      .then((rows) => setReunioesEmpresa(Array.isArray(rows) ? rows : []))
      .catch(() => setReunioesEmpresa([])); // tabela ainda sem migração → lista vazia, sem quebrar
  }, [painel]);

  // 🏛️ DIR-73 — a agenda escolhida no agendador cai NO MESMO LUGAR que o
  // bloco 🏛️ da gestão já gravava. Uma verdade só: se amanhã a reunião da
  // empresa mudar de tabela, muda num lugar e as duas portas acompanham.
  const salvarAgendaEmpresa = async (linha) => {
    if (!linha) return;
    setSalvando(true);
    try {
      const criada = await plataforma.entities.ReuniaoEmpresa.create(linha);
      setReunioesEmpresa((prev) => [...prev, criada?.id ? criada : linha]);
      setRegistroAberto(null);
      toast.success(`${linha.titulo} marcada — entra na agenda de quem pode ver!`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar — a migração da DIR-52 (reunioes_empresa) já foi colada no banco?');
    } finally { setSalvando(false); }
  };

  const habito = HABITOS.find((h) => h.id === painel);

  return (
    /* 🌊 SEM CARTÃO (ordem do dono: "não quero essas linhas, quero tudo
       borda infinita"). Isto aqui era um <Card>, e o Card traz borda,
       canto arredondado, fundo e sombra por padrão — era ELE o retângulo
       que sobrava em volta do painel, mesmo depois de eu limpar os blocos
       de dentro. Agora é uma seção lisa: só o ar do padding. */
    <div className="pt-4 sm:pt-6 pb-2 space-y-4">
        {habito && (
          <div>
            {/* 🏛️ DIR-56 — o nome do Hábito já vem grande na faixa do brandbook,
                logo acima; aqui fica só o ensinamento, com escala de leitura e
                o traço da Top College sustentando à esquerda. */}
            <p
              className="text-base sm:text-lg leading-relaxed text-nz-tinta pl-4 border-l-2"
              style={{ borderImage: 'linear-gradient(180deg, var(--topcollege-azul), var(--topcollege-magenta)) 1' }}
            >
              {habito.texto}
            </p>
          </div>
        )}

        {/* ══ 🌟 HÁBITO 1 — QUADRO DOS SONHOS (DIR-44: curto/médio/longo, com imagem) ══ */}
        {painel === 'sonho' && (() => {
          const grupos = agruparSonhosPorHorizonte(sonhos);
          return (
            <div className="space-y-4">
              <GuiaMovel titulo="Como montar o seu quadro" className="border-t border-nz-borda/40 pt-4 text-xs text-nz-tinta-fraca">
                🖼️ <strong>Monte o seu quadro.</strong> O sonho tem três prazos — ⚡ curto (1 a 2 anos), 🎯 médio (2 a 4) e 🏆 longo (5 pra frente).
                Coloque quantas imagens quiser em cada um (busque pelo nome sem sair daqui, ou envie do aparelho) e escreva os
                <strong> detalhes exatos</strong> embaixo de cada imagem — se for um carro: ano, cor, banco de couro, roda. Sonho detalhado vira meta.
              </GuiaMovel>

              {HORIZONTES_SONHO.map((hz, i) => {
                const doHorizonte = grupos[hz.id];
                return (
                  // 🖐️ 09/09/2026 — achado no tour: os 3 horizontes tinham o
                  // MESMO data-teste, e `querySelector` sempre pega o
                  // primeiro — a mãozinha do Hábito 1 sempre mirava no card
                  // de curto prazo, não importa a intenção. Marcado só no
                  // primeiro (i === 0), que é exatamente o card que o passo
                  // do tour aponta.
                  <div key={hz.id} className="rounded-2xl border-2 border-nz-verde/25 bg-nz-verde-fundo/30 p-3 sm:p-4" data-teste={i === 0 ? 'sonho-horizonte' : undefined}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-sm font-bold text-nz-tinta">
                        {hz.emoji} {hz.label}
                        <span className="text-nz-tinta-fraca font-normal"> · {hz.faixa}{doHorizonte.length > 0 ? ` · ${doHorizonte.length} sonho${doHorizonte.length === 1 ? '' : 's'}` : ''}</span>
                      </p>
                      <Button size="sm" onClick={() => setModalSonho(hz.id)} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 shrink-0" data-teste={i === 0 ? 'sonho-adicionar' : undefined}>
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                      </Button>
                    </div>

                    {doHorizonte.length === 0 ? (
                      <p className="text-xs text-nz-tinta-fraca text-center py-5 border border-dashed border-nz-verde/30 rounded-xl">
                        Nenhum sonho aqui ainda — adicione a imagem do que você quer.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {doHorizonte.map(({ sonho: s, indice }) => (
                          <div key={s.id || `i${indice}`} className="rounded-xl border border-nz-borda bg-white overflow-hidden flex flex-col shadow-sm">
                            {s.imagem_url && (
                              <img
                                src={s.imagem_url}
                                alt={s.titulo}
                                loading="lazy"
                                className="w-full aspect-[4/3] object-cover bg-nz-cinza-fundo"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            <div className="p-3 flex-1 flex flex-col gap-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold text-nz-tinta">🌟 {s.titulo}</p>
                                <button
                                  type="button"
                                  title="Remover do quadro"
                                  onClick={() => salvarPerfil({ sonhos: sonhos.filter((_, j) => j !== indice) })}
                                  className="text-nz-tinta-fraca hover:text-red-600 shrink-0"
                                ><Trash2 className="w-4 h-4" /></button>
                              </div>

                              {editandoSonho?.indice === indice ? (
                                <div className="space-y-1.5">
                                  <Textarea
                                    value={editandoSonho.texto}
                                    onChange={(e) => setEditandoSonho({ indice, texto: e.target.value })}
                                    rows={3}
                                    placeholder={PLACEHOLDER_DETALHES_SONHO}
                                    className="bg-white border-nz-borda text-nz-tinta text-xs"
                                  />
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Button size="sm" disabled={salvando} onClick={() => salvarDetalhesSonho(indice, editandoSonho.texto)} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-xs">
                                      <Save className="w-3.5 h-3.5 mr-1" /> Salvar
                                    </Button>
                                    <button type="button" onClick={() => setEditandoSonho(null)} className="text-xs text-nz-tinta-fraca hover:text-nz-tinta">cancelar</button>
                                  </div>
                                </div>
                              ) : s.detalhes ? (
                                <p
                                  className="text-xs text-nz-tinta-fraca whitespace-pre-line cursor-pointer"
                                  title="Toque pra editar os detalhes"
                                  onClick={() => setEditandoSonho({ indice, texto: s.detalhes })}
                                >{s.detalhes}</p>
                              ) : (
                                <button type="button" onClick={() => setEditandoSonho({ indice, texto: '' })} className="text-xs text-nz-verde hover:text-nz-verde-claro text-left font-medium">
                                  ＋ escreva os detalhes do seu sonho
                                </button>
                              )}
                              {!editandoSonho && s.prazo && !s.detalhes && <p className="text-[11px] text-nz-tinta-fraca">alvo: {s.prazo}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <CrmSonhoModal
                aberto={modalSonho !== null}
                horizonteInicial={modalSonho || 'curto'}
                onFechar={() => setModalSonho(null)}
                onAdicionar={adicionarSonhos}
              />
            </div>
          );
        })()}

        {/* ══ ✅ HÁBITO 2 — MASTER TASK + ROTINA PERFEITA (DIR-45) ══ */}
        {painel === 'compromisso' && (
          <div className="space-y-3">
            {/* 🌅 F11 — o Ritual do Amanhecer (a gratidão vira experiência) */}
            {ritualId && (() => {
              const t = tarefas.find((x) => x.id === ritualId);
              if (!t) return null;
              return (
                <XGameRitualAmanhecer
                  nome={(currentUser?.full_name || currentUser?.nickname || '').split(' ')[0]}
                  sonhos={sonhos.map(normalizarSonho)}
                  diaCorridoCiclo={diaCorridoDoCiclo(new Date(), inicioCicloOficial(cicloConfig, new Date()))}
                  /* 🧱 reabrir cai no bloco que falta, não no começo — mas só
                     se for o ritual de HOJE (ritualRetomavel confere o dia em
                     Brasília). O de ontem nunca ressuscita no de hoje. */
                  comprovacaoAtual={(() => {
                    const c = modoDev ? devMarcas[t.id]?.comprovacao : t.comprovacao;
                    return ritualRetomavel(c, hojeStr()) ? c : null;
                  })()}
                  onBloco={(bloco, dados, ctx) => salvarBlocoDoRitual(t, bloco, dados, ctx)}
                  onFechar={() => setRitualId(null)}
                  onConcluir={(dados) => concluirRitual(t, dados)}
                />
              );
            })()}

            {/* ✅ F10.3 — o MODAL de comprovação (leve): câmera de verdade + preview */}
            {comprovando && (() => {
              const t = tarefas.find((x) => x.id === comprovando.id);
              if (!t) return null;
              return (
                <XGameComprovarModal
                  tarefa={t}
                  tipo={comprovando.tipo}
                  enviando={!!comprovando.enviando}
                  erro={comprovando.erro}
                  pergunta={comprovando.pergunta}
                  onFechar={() => setComprovando(null)}
                  onComprovar={(dados) => concluirComComprovacao(t, dados)}
                />
              );
            })()}
            <GuiaMovel titulo="Como funciona a Rotina Perfeita" className="border-t border-nz-borda/40 pt-4 text-xs text-nz-tinta-fraca space-y-1.5">
              <p>
                📣 <strong>A Rotina Perfeita não é agenda de posts</strong> — é a sua rotina real virando narrativa nas redes:{' '}
                <strong className="text-nz-tinta">{PRINCIPIO_ROTINA.percepcoes.join(' → ')}</strong>.
              </p>
              <p className="italic">"{PRINCIPIO_ROTINA.regra}" — {PRINCIPIO_ROTINA.texto}</p>
              <button type="button" onClick={() => setLogicaAberta(!logicaAberta)} className="font-semibold text-nz-verde hover:text-nz-verde-claro">
                {logicaAberta ? '▾ esconder a lógica do dia' : '▸ ver a lógica do dia (a história que a rotina conta)'}
              </button>
              {logicaAberta && (
                <div className="pt-1 space-y-0.5">
                  <p className="text-[11px]">Você não termina o dia tendo feito dez propagandas — termina tendo contado UMA história:</p>
                  {NARRATIVA_DO_DIA.map((n) => (
                    <p key={n.hora} className="text-[11px]"><span className="font-bold text-nz-tinta">{n.hora}</span> — {n.frase}</p>
                  ))}
                  <p className="text-[11px] italic pt-1">Quando chegar a hora de apresentar a Leilão NoZap, a audiência já viu o mais importante: <strong>a pessoa vivendo aquilo que fala.</strong></p>
                </div>
              )}
            </GuiaMovel>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => mudarDia(-1)}><ChevronLeft className="w-5 h-5 text-nz-tinta" /></Button>
                <p className="text-sm font-bold text-nz-tinta capitalize min-w-[180px] text-center">{fmtDia(dia)}{dia === hojeStr() ? ' · HOJE' : ''}</p>
                <Button variant="ghost" size="icon" onClick={() => mudarDia(1)}><ChevronRight className="w-5 h-5 text-nz-tinta" /></Button>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-nz-tinta" title={'PROGRESSO DO DIA — "Apresenta o desempenho do executivo baseado no dia atual, com os resultados da gamificação — isso permite projeção de crescimento do executivo e perspectiva de futuro ao longo do mês corrente. É possível extrapolar os valores de 100%, o que permite compensar a falta em alguns fatores com a entrega em outros."'}>{progressoJogo.feitas}/{progressoJogo.total} feitas · {progressoJogo.pct.toFixed(0)}% ⓘ</p>
                {/* 🔔 DIR-130 — o sino: mora aqui porque é a tela que a pessoa abre
                    todo dia (o Compromisso); ver src/lib/notificacoesXgame.js */}
                <SinoNotificacoes currentUser={currentUser} />
              </div>
            </div>
            <BarraProgresso pct={progressoJogo.pct} dialeto="claro" altura="media" trilhoClasse="bg-nz-cinza-fundo" />

            {/* 📣 DIR-134 (09/09/2026) — dono: "algumas pessoas reclamaram,
                falaram que não conseguiram [fazer o ritual]... vê se a gente
                cria um aviso antes de começar o ritual, dez minutos pra
                quando ela abrir, explicar como funciona." Aparece ANTES de
                ela clicar em qualquer coisa — não depois de errar. */}
            {mostrarAvisoRitual && (
              <div className="rounded-xl border border-amber-400/50 bg-amber-50 p-3 sm:p-4 text-nz-tinta" data-teste="aviso-ritual-explicador">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl shrink-0" aria-hidden="true">🌅</span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-extrabold">
                      {agoraMinJogo < RITUAL_INICIO_MIN
                        ? `O Ritual do Amanhecer abre daqui a pouco, às ${horaDeMin(RITUAL_INICIO_MIN)}.`
                        : `O Ritual do Amanhecer está aberto até ${horaDeMin(RITUAL_FIM_MIN)}.`}
                    </p>
                    <p className="text-[12px] text-nz-tinta-fraca leading-relaxed">
                      Como funciona: <strong>1)</strong> fala (ou escreve) a sua gratidão — pega o caderno antes de abrir.{' '}
                      <strong>2)</strong> grava um vídeo curto se visualizando com o Quadro dos Sonhos — precisa ser{' '}
                      <strong>em casa</strong>, com calma (carro, academia e escritório não valem). <strong>3)</strong> escreve a ação do dia.
                      Sem o vídeo o ritual conclui igual, só não ganha o selo brilhante. Depois de{' '}
                      <strong>{horaDeMin(RITUAL_FIM_MIN)}</strong> não dá mais pra fazer — o dia fica perdido, sem segunda chance.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAvisoRitualFechado(true)}
                      className="text-[11px] font-bold text-nz-verde hover:text-nz-verde-claro"
                      data-teste="aviso-ritual-fechar"
                    >entendi</button>
                  </div>
                </div>
              </div>
            )}

            {/* ══ 🗺️ F11 — JORNADA (padrão, limpa) × 📋 LISTA (pra quem clicar) ══
                A faixa inteira (seletor, placar e o relógio de teste temporário)
                mora em FaixaVisao — bonita, funcional e com prova em navegador. */}
            {(tarefas.length > 0 || visao === 'quadro') && (
              <FaixaVisao
                visao={visao}
                onVisao={setVisao}
                placarAberto={painelAberto}
                onPlacar={alternarPainel}
                mostrarPlacar={visao === 'jornada' || visao === 'quadro' || celular}
                teste={podeGerir ? {
                  hora: horaTeste,
                  rascunho: horaRascunho,
                  onRascunho: setHoraRascunho,
                  entrar: () => { setDevMarcas({}); setHoraTeste(horaRascunho); },
                  sair: () => { setHoraTeste(''); setHoraRascunho(''); setDevMarcas({}); },
                } : null}
              />
            )}

            {/* ══ 🔥 F7 — OFENSIVA (o streak) + 💎 DIA PERFEITO ══ */}
            {xgame && ehHoje && (
              <div className="flex items-center justify-between gap-2 flex-wrap border-t border-nz-borda/40 pt-3">
                <p className="text-sm font-bold text-nz-tinta">
                  🔥 {fogo.dias} {fogo.dias === 1 ? 'dia' : 'dias'} de ofensiva
                  {fogo.congelou && <span className="ml-2 text-[10px] font-semibold text-sky-600">🧊 congelador usado</span>}
                </p>
                <p className="text-[11px] text-nz-tinta-fraca">
                  {hojeFechou
                    ? 'hoje FECHADO ✔ — o fogo continua'
                    : `feche ${Math.round(OFENSIVA_META * 100)}% do dia pra ${fogo.dias > 0 ? 'manter o fogo' : 'acender o fogo'}`}
                  {!fogo.congelou && ' · 1 congelador automático por ofensiva'}
                </p>
              </div>
            )}
            {xgame && ehHoje && progressoJogo.pct >= 100 && (
              <div className="py-2 text-center animate-pulse">
                <p className="text-sm font-bold text-nz-verde">🎊 💎 DIA PERFEITO — BRILHANTE! PARABÉNS! 🎊</p>
              </div>
            )}

            {/* 🔥 08/09/2026 — dono: "não vou, perde o dinheiro, perde a MvM,
                perde tudo do dia... precisa ser radical." Não é um detalhe
                dentro do bloco de votação (que pode estar recolhido) — é um
                alerta do tamanho real do problema, no topo do placar: o dia
                inteiro, dinheiro incluído, não só a MvM. */}
            {xgame && ehHoje && xgame.perdeu_por_nao_votar && mostrarPainel && (
              <div className="rounded-lg border-2 border-red-500 bg-red-50 px-3 py-2.5 text-center">
                <p className="text-sm font-extrabold text-red-700">🗳️ DIA ZERADO — você não votou em todos os colegas até as {horaDeMin(VOTACAO_FIM_MIN)}</p>
                <p className="text-[11px] text-red-600 mt-0.5">Não é só a MvM: hoje o Human Token, os pontos e o X-Pay que você ganharia também zeraram. Votar em todo mundo, todo dia, não é opcional. Amanhã dá pra recomeçar.</p>
              </div>
            )}

            {/* ⏰ 08/09/2026 — dono: "se o cara se atrasou [na Fila do Pronto],
                além de ele perder o dinheiro, isso tem que tirar pontos dele."
                A mensagem pro cara, na hora, do mesmo jeito grave do não-votar. */}
            {xgame && ehHoje && xgame.perdeu_por_atraso_pronto && mostrarPainel && (
              <div className="rounded-lg border-2 border-red-500 bg-red-50 px-3 py-2.5 text-center">
                <p className="text-sm font-extrabold text-red-700">⏰ DIA ZERADO — uma tarefa da gestão passou do "pronto até" sem você dar o pronto</p>
                <p className="text-[11px] text-red-600 mt-0.5">MvM, Human Token, pontos e o X-Pay que você ganharia hoje zeraram junto com o atraso. Dá o pronto assim que puder — amanhã o dia recomeça do zero.</p>
              </div>
            )}

            {/* 🟡 09/09/2026 — DIR-105: 1º-3º atraso é só aviso/treino (perde
                pontos, resto do dia intacto) — só o 4º em diante vira o zero
                radical acima. */}
            {xgame && ehHoje && xgame.em_aviso_pronto && mostrarPainel && (
              <div className="rounded-lg border-2 border-amber-500 bg-amber-50 px-3 py-2.5 text-center">
                <p className="text-sm font-extrabold text-amber-700">⚠️ AVISO {xgame.avisos_pronto + 1} DE {AVISOS_ANTES_DE_ZERAR} — uma tarefa da gestão passou do "pronto até" sem você dar o pronto</p>
                <p className="text-[11px] text-amber-700/90 mt-0.5">
                  Você perdeu pontos hoje por isso, mas MvM, Human Token e X-Pay continuam de pé. {xgame.avisos_pronto + 1 >= AVISOS_ANTES_DE_ZERAR
                    ? 'Da próxima vez o dia INTEIRO zera — sem exceção.'
                    : `Da próxima vez o aviso sobe pra ${xgame.avisos_pronto + 2} de ${AVISOS_ANTES_DE_ZERAR}. No ${AVISOS_ANTES_DE_ZERAR + 1}º, zera tudo.`}
                </p>
              </div>
            )}

            {/* ══ 🎮 X-GAME — o placar do dia por cima do Master Task ══ */}
            {xgame && mostrarPainel && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-nz-borda/40 pt-4" data-teste="placar-do-dia">
                <div className="rounded-xl border border-nz-borda bg-white p-3" title={`"O Human Token é a moeda da metodologia X-EOS que foi desenvolvida para a humanidade. Ela valida o desempenho e aplicabilidade do ser humano. Cada integrante do nosso Método é uma moeda. E essa moeda tem uma cotação diária que é gerada através do MvM + Produtividade." — Soma 5 componentes no ciclo: MvM da votação do grupo + Produção + Real Time + Bônus/Estudo + Vendas REAIS da sua loja, contadas automático (meta ${META_VENDAS_CICLO} no ciclo — reunião conta uma fração, venda de alto valor satura na hora). "Recrutamos caráter e treinamos habilidade": o MvM é PORTÃO, não só peso — abaixo de 7 trava tudo em Bronze, abaixo de 8 barra a Platina. Ligas: 🥉 bronze até 6,65 · 🥈 prata até 12,21 · 🥇 ouro até 17,77 · 🏆 platina de 17,78 pra cima (só abre batendo os dois portões: caráter e 100% da meta de vendas). Ouro dá pra chegar sem estudar em casa (produção/MvM/vendas bastam) — só a Platina exige leitura de semana + estudo de fim de semana em dia.`}>
                  <p className="text-[10px] font-semibold text-nz-tinta-fraca uppercase tracking-wide">Human Token ⓘ</p>
                  <p className="text-xl font-bold text-nz-tinta tabular-nums">{ciclo ? ciclo.liga.emoji : xgame.faixa.medalha} {fmtToken(ciclo ? ciclo.total : xgame.token_dia)}</p>
                  <p className="text-[10px] text-nz-tinta-fraca">{!ciclo || ciclo.estudoEmDiaCompleto ? `${ciclo ? ciclo.liga.label : xgame.faixa.label} do ciclo · teto 22,22` : 'trava 19,99 pra Platina — estudo em atraso no ciclo'}</p>
                </div>
                {/* 🩹 09/09/2026 — DIR-113.2, dono, revendo o placar: "se o
                    MVM dele é sete, vai aparecer sete, não sete ponto
                    setenta e cinco e nove em cima" — o número GRANDE virava
                    o automático (mvm_dia), com o de verdade (a votação, o
                    único que entra na moeda) escondido no rodapé pequeno.
                    Trocado: o número grande agora É o oficial. */}
                <div className="rounded-xl border border-nz-borda bg-white p-3" title={`Só a VOTAÇÃO DO CICLO (as notas que você recebe dos colegas, 1 a 10 nas 10 Virtudes, das ${horaDeMin(VOTACAO_INICIO_MIN)} às ${horaDeMin(VOTACAO_FIM_MIN)}) entra no Human Token — é este número. O "automático" (o dia começa em 10 e cada tarefa que passa da hora sem marcar desconta) é só uma estimativa de humor do dia — NÃO conta pra moeda.`}>
                  <p className="text-[10px] font-semibold text-nz-tinta-fraca uppercase tracking-wide">MvM (oficial) ⓘ</p>
                  <p className="text-xl font-bold text-nz-tinta tabular-nums">{recebido.media !== null ? fmtToken(recebido.media) : '—'}</p>
                  <p className={`text-[10px] font-semibold ${recebido.media !== null && recebido.media < 4 ? 'text-red-600' : 'text-nz-tinta-fraca'}`}>
                    {recebido.media !== null ? `${xgame.frase_mvm} · o que conta na moeda` : 'ainda sem voto recebido neste ciclo'}
                  </p>
                </div>
                <div className="rounded-xl border border-nz-borda bg-white p-3" title={'COTAÇÃO — no dia 1 do ciclo o ponto vale 1,00 e cai 0,01 por dia útil até 0,80 no dia 22. Fazer antes vale mais: ANTECIPAÇÃO É PODER.'}>
                  <p className="text-[10px] font-semibold text-nz-tinta-fraca uppercase tracking-wide">Cotação do dia ⓘ</p>
                  <p className="text-xl font-bold text-nz-tinta tabular-nums">{fmtToken(xgame.cotacao)}</p>
                  <p className="text-[10px] text-nz-tinta-fraca">dia {xgame.dia_util} de {CICLO_DIAS_UTEIS} · antecipação é poder</p>
                </div>
                <div className="rounded-xl border border-nz-borda bg-white p-3" title={`X-PAY — o valor do seu dia em R$: o seu fixo ÷ ${DIAS_FIXO} dias de operação = ${fmtReais(xgame.xpay.valorDia)} por dia; dentro do dia o PESO de cada tarefa reparte esse valor (a soma das tarefas é sempre o dia inteiro). O dia completo é a Rotina Perfeita (peso ${xgame.xpay.pesoReferencia}); com menos peso que isso, paga proporcional. Venda NÃO paga aqui — a venda da sua loja já remunera pelas comissões da plataforma. Tarefa PERDIDA é dinheiro que sai do seu resultado.`}>
                  <p className="text-[10px] font-semibold text-nz-tinta-fraca uppercase tracking-wide">💰 X-Pay {ehHoje ? 'de hoje' : 'do dia'} ⓘ</p>
                  <p className="text-xl font-bold text-nz-verde tabular-nums">{fmtReais(xgame.xpay.ganho)}</p>
                  <p className="text-[10px] text-nz-tinta-fraca">
                    {xgame.pontos} pts · {xgame.xpay.perdido > 0 ? <span className="text-red-600 font-semibold">− {fmtReais(xgame.xpay.perdido)} perdido</span> : `${fmtReais(xgame.xpay.emJogo)} em jogo`}
                  </p>
                  {/* 💰 06/09/2026 — o dia vale o fixo ÷ 22; com menos tarefas que o mínimo, paga proporcional */}
                  {xgame.xpay.pesoFalta > 0 && (
                    <p className="text-[10px] text-amber-600 font-semibold" data-teste="xpay-faltam">
                      dia vale {fmtReais(xgame.xpay.valorDia)} · peso {xgame.xpay.somaPesos} de {xgame.xpay.pesoReferencia}: falta {xgame.xpay.pesoFalta} pro dia completo
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 🪙 DIR-113 (09/09/2026) — dono, ao vivo, olhando o placar:
                "tem que aparecer a produtividade, quanto pesou na moeda...
                se possível deixar até o desenho da moeda, fatia de pizza, o
                que cada um está pesando... e vai botando a cor de acordo com
                cada fatia, bronze, prata, até o topo." O anel é o Human
                Token (0 a 22,22) dividido pelos MESMOS 5 componentes que
                `ciclo` já calcula — nenhuma conta nova, só o desenho que
                faltava. As marcas no anel são as ligas oficiais (LIGAS,
                xgame.js): bronze → prata → ouro → platina.
                🗳️ e a correção do dono na mesma mensagem: "o MvM só é a
                média do valor mental, a média da votação, só isso" — é
                exatamente o que `ciclo.componentes.mvm` já vale (ver
                tokenDoCiclo em xgame.js: peso × régua de 10 = a média
                crua), então a fatia do MvM aqui é essa média, sem distorcer.
                🏆 DIR-115 (09/09/2026) — repesagem, dono: "recrutamos
                caráter e treinamos habilidade" é o jargão que decidiu os
                pesos novos — por isso ele aparece escrito aqui, junto do
                desenho que ele explica. */}
            {xgame && ciclo && mostrarPainel && (
              <div className="rounded-2xl border-2 border-nz-borda bg-white p-4 sm:p-5 space-y-3" data-teste="moeda-pizza">
                <div>
                  <p className="text-sm font-extrabold text-nz-tinta">🪙 Seu Human Token — de onde vem cada ponto dele</p>
                  <p className="text-[11px] text-nz-tinta-fraca mt-0.5">cada fatia é o quanto aquilo pesou de verdade no seu Human Token deste ciclo, até o teto de {fmtToken(TOKEN_MAX)}</p>
                  <p className="text-[11px] font-semibold text-nz-verde mt-1">"Recrutamos caráter e treinamos habilidade" — por isso o MvM é portão, não só peso: abaixo de 7 trava tudo em Bronze; abaixo de 8, sem Platina.</p>
                </div>
                <MoedaPizza componentes={ciclo.componentes} total={ciclo.total} max={TOKEN_MAX} liga={ciclo.liga} />
              </div>
            )}

            {/* 🪙 09/09/2026 — dono: "a moeda tem que estar ali, pra ele se
                inspirar nela cheia, e entender como ela fica cheia, junto com
                a dele que está sendo preenchida." A moeda-modelo (`moedaModelo`,
                xgame.js) ao lado da moeda real de cima — mesmo desenho, sempre
                no teto, pra servir de referência de "como ela fica cheia". */}
            {xgame && ciclo && mostrarPainel && (
              <div className="rounded-2xl border-2 border-dashed border-nz-ouro-claro bg-nz-ouro-fundo p-4 sm:p-5 space-y-3" data-teste="moeda-pizza-modelo">
                <div>
                  <p className="text-sm font-extrabold text-nz-tinta">🏆 O Modelo — pra onde você está indo</p>
                  <p className="text-[11px] text-nz-tinta-fraca mt-0.5">a mesma moeda, cheia — a referência de como ela fica quando cada fatia bate no teto</p>
                </div>
                <MoedaPizza componentes={moedaModelo('estrategico')} total={TOKEN_MAX} max={TOKEN_MAX} liga={ligaDoToken(TOKEN_MAX)} />
              </div>
            )}

            {/* ══ 🎯 F4 — ONDE ESTOU × EXECUTIVO IDEAL (os 5 componentes do ciclo) ══
                🎨 08/09/2026 — dono, olhando o preview: "não está legal ainda,
                não está visual, não está comunicando, precisa comunicar."
                Sai da lista fina, sem card, texto de 10px — vira o painel de
                verdade que a análise técnica desenhou: card próprio (a mesma
                borda verde de destaque que o Quadro dos Sonhos já usa),
                número grande da formação como âncora visual, os 2 tooltips
                oficiais da planilha ("Onde Estou" e "Executivo Ideal", ditados
                pelo dono ao pé da letra), ícone + card + barra grossa por
                eixo. Reaparece nas 3 visões (Jornada/Lista/Quadro) porque o
                "meu placar" agora também abre no Quadro (FaixaVisao acima). */}
            {xgame && ciclo && mostrarPainel && (
              <div className="rounded-2xl border-2 border-nz-verde/25 bg-nz-verde-fundo/20 p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p
                      className="text-sm font-extrabold text-nz-tinta cursor-help"
                      title={'"Esse painel representa o desempenho do executivo nos dias corridos do mês. Ou seja: através destas informações, é possível acompanhar se o progresso está à frente ou atrás do Executivo Ideal."'}
                    >
                      🎯 Onde estou × EXECUTIVO IDEAL ⓘ
                    </p>
                    <p className="text-[11px] text-nz-tinta-fraca mt-0.5">os 5 pilares que formam o Executivo Ideal, ciclo após ciclo</p>
                  </div>
                  <div
                    className="text-right shrink-0 cursor-help"
                    title={'"São os parâmetros que definem o desempenho do executivo ideal, que será considerado para formação emancipada ao longo da mentoria. Uma vez que a barra de progresso do executivo esteja maximizada em 100%, o trainee será então considerado através de votação do conselho da corporação para ter sua formação como um executivo sem limites adiantada."'}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-nz-tinta-fraca">formação ⓘ</p>
                    <p className="text-2xl font-black text-nz-verde tabular-nums leading-none">{ciclo.formacao.pct}%</p>
                    <p className="text-[10px] text-nz-tinta-fraca">dos 100%</p>
                  </div>
                </div>
                <BarraProgresso pct={ciclo.formacao.pct} dialeto="claro" altura="extra" corClasse="bg-nz-verde" trilhoClasse="bg-white border border-nz-verde/20" />

                {/* 🎡 09/09/2026 — DIR-109.1, dono: "a roda da vida... se a
                    roda dele rodar, a vida dele anda." O alvo vira um
                    pentágono PERFEITO (proporção do alvo, não % bruto) —
                    a roda só fica redonda quando os 5 eixos estão em dia. */}
                <RadarEixos
                  dialeto="claro"
                  eixos={(() => {
                    const prop = proporcoesExecutivoIdeal(ciclo.taxas);
                    return EIXOS_EXECUTIVO_IDEAL.map(({ k, rotuloCurto, emoji }) => ({ k, rotuloCurto, emoji, atual: Math.round(prop[k] * 100), alvo: 100 }));
                  })()}
                />
                <p className="text-center text-[10.5px] text-nz-tinta-fraca -mt-2">
                  🎡 a <strong className="text-nz-tinta">roda da vida</strong> do Executivo Ideal — quanto mais redonda, mais a carreira anda
                </p>

                <div className="space-y-2.5">
                  {[
                    { k: 'mvm', rotulo: 'MvM (votação do grupo)', emoji: '🗳️' },
                    { k: 'producao', rotulo: 'Produção', emoji: '📋' },
                    { k: 'realtime', rotulo: 'Real Time (X-Pay no horário)', emoji: '⏱️' },
                    { k: 'bonus', rotulo: 'Bônus / Estudo', emoji: '📚' },
                    {
                      k: 'vendas',
                      // 🟢 09/09/2026 — DIR-110: mostra o quebra-cabeça
                      // (venda direta + reunião como princípio da venda).
                      rotulo: `Vendas — automático (meta ${META_VENDAS_CICLO} no ciclo · ${fmtToken(ciclo.vendasDiretas)} vendida${ciclo.vendasDiretas === 1 ? '' : 's'}${ciclo.reuniaoEquivalente > 0 ? ` + ${fmtToken(ciclo.reuniaoEquivalente)} de reunião` : ''} = ${fmtToken(ciclo.vendasFeitas)})`,
                      emoji: '🛒',
                    },
                  ].map(({ k, rotulo, emoji }) => {
                    const atual = Math.round((ciclo.taxas[k] || 0) * 100);
                    const alvo = Math.round(EXECUTIVO_IDEAL[k] * 100);
                    const ok = atual >= alvo;
                    return (
                      <div key={k} className="rounded-xl border border-nz-borda bg-white p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-nz-tinta">{emoji} {rotulo}</span>
                          <span className={`text-xs font-bold tabular-nums shrink-0 ${ok ? 'text-nz-verde' : 'text-nz-tinta-fraca'}`}>
                            {atual}% <span className="text-nz-tinta-fraca font-normal">/ alvo {alvo}%</span>{ok ? ' ✅' : ''}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <BarraProgresso
                            pct={atual} dialeto="claro" altura="grossa"
                            corClasse={ok ? 'bg-nz-verde' : 'bg-amber-500'}
                            trilhoClasse="bg-nz-cinza-fundo" limite={alvo}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {ciclo.formacao.mensagem && (
                  <p className="text-[11px] font-semibold text-nz-verde">{ciclo.formacao.mensagem}</p>
                )}
                {/* o guia — como funciona o jogo e a formação em 3 meses */}
                <details className="text-[11px] text-nz-tinta-fraca border-t border-nz-verde/15 pt-2">
                  <summary className="cursor-pointer font-semibold text-nz-tinta hover:text-nz-verde">ℹ️ O guia: como me formo EXECUTIVO IDEAL em 3 meses?</summary>
                  <div className="pt-1.5 space-y-1">
                    <p>• <strong className="text-nz-tinta">O alvo</strong>: manter, ciclo após ciclo, MvM ≥ 80% (nota ≥ 8 na votação do grupo), Produção ≥ 90%, Real Time ≥ 90% (fazer no horário), Bônus/Estudo ≥ 80% e 100% da meta de vendas ({META_VENDAS_CICLO} no ciclo — as vendas REAIS da sua loja contam automático; elas pontuam aqui e remuneram pela comissão da plataforma).</p>
                    <p>• <strong className="text-nz-tinta">A formação</strong> dura 90 dias (3 meses ≈ 4 ciclos de 22 dias úteis). Aos 33% você está a 2 meses da votação extraordinária; aos 66%, a 1 mês; aos 88%, EM BREVE.</p>
                    <p>• <strong className="text-nz-tinta">A moeda</strong> é o Human Token (0 a 22,22): 🥉 bronze até 6,65 · 🥈 prata até 12,21 · 🥇 ouro até 17,77 · 🏆 platina de 17,78 pra cima. "Recrutamos caráter e treinamos habilidade": o MvM é PORTÃO, não só peso — abaixo de 7 trava tudo em Bronze; abaixo de 8, sem Platina. A Platina só abre batendo os dois portões (caráter e 100% da meta de vendas); Ouro dá pra chegar sem estudar em casa (produção/MvM/vendas bastam) — só a Platina exige leitura de semana + estudo de fim de semana em dia.</p>
                    <p>• <strong className="text-nz-tinta">A votação do MvM</strong> é a ação mais importante do dia, junto com as vendas: das {horaDeMin(VOTACAO_INICIO_MIN)} às {horaDeMin(VOTACAO_IDEAL_FIM_MIN)} é a janela ideal, até {horaDeMin(VOTACAO_FIM_MIN)} ainda dá (última chance, sem desconto) — dê a nota de 1 a 10 nas 10 Virtudes pra cada colega da sua egrégora. Não votar em todos até {horaDeMin(VOTACAO_FIM_MIN)} zera o dia inteiro, dinheiro incluído.</p>
                    <p>• <strong className="text-nz-tinta">O dinheiro</strong> (X-Pay) vem das verbas que o admin definiu pra você, divididas pelas tarefas do dia — tarefa perdida é dinheiro perdido, e cada dia que passa a cotação cai: ANTECIPAÇÃO É PODER.</p>
                  </div>
                </details>
              </div>
            )}

            {/* ══ 🏅 F8 — MISSÕES DA SEMANA + CONQUISTAS ══ */}
            {xgame && missoes.length > 0 && mostrarPainel && (
              <div className="border-t border-nz-borda/40 pt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-semibold text-nz-tinta">🎯 Missões da semana</p>
                  <button type="button" onClick={() => setMedalhasAbertas(!medalhasAbertas)} className="text-[11px] font-bold text-nz-tinta-fraca hover:text-nz-verde">
                    {medalhasAbertas ? '▾' : '▸'} 🏅 minhas medalhas ({medalhas.filter((m) => m.ok).length}/{medalhas.length})
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {missoes.map((m) => (
                    <div key={m.id} className={`rounded-lg border px-2 py-1.5 ${m.ok ? 'border-nz-verde/50 bg-nz-verde-fundo/40' : 'border-nz-borda bg-white'}`}>
                      <p className="text-[11px] font-semibold text-nz-tinta">{m.emoji} {m.nome} {m.ok ? '✅' : ''}</p>
                      <div className="mt-1">
                        <BarraProgresso
                          pct={(m.atual / m.alvo) * 100} dialeto="claro" altura="padrao"
                          corClasse={m.ok ? 'bg-nz-verde' : 'bg-amber-500'}
                          trilhoClasse="bg-nz-borda/60"
                        />
                      </div>
                      <p className="text-[10px] text-nz-tinta-fraca tabular-nums mt-0.5">{m.atual} de {m.alvo}</p>
                    </div>
                  ))}
                </div>
                {medalhasAbertas && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-nz-borda">
                    {medalhas.map((m) => (
                      <div key={m.id} title={m.regra} className={`rounded-lg border px-2 py-1.5 text-center ${m.ok ? 'border-nz-verde/50 bg-nz-verde-fundo/40' : 'border-nz-borda bg-white opacity-50 grayscale'}`}>
                        <p className="text-base leading-none">{m.emoji}</p>
                        <p className="text-[10px] font-semibold text-nz-tinta mt-0.5">{m.nome}</p>
                        <p className="text-[9px] text-nz-tinta-fraca">{m.ok ? 'conquistada!' : m.regra}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ 🗳️ F3 — VOTAÇÃO MvM (17h–21h30, radical se não fechar em todos) + RANKING DAS VIRTUDES ══ */}
            {xgame && ehHoje && mostrarPainel && (
              <div className="border-t border-nz-borda/40 pt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button type="button" onClick={() => setVotacaoAberta(!votacaoAberta)} className="font-semibold text-nz-tinta hover:text-nz-verde" data-teste="votacao-mvm-toggle">
                    {votacaoAberta ? '▾' : '▸'} 🗳️ Votação MvM das {horaDeMin(VOTACAO_INICIO_MIN)} às {horaDeMin(VOTACAO_FIM_MIN)} · Ranking das Virtudes
                  </button>
                  <span className={`text-[10px] font-bold ${janelaAberta ? (naJanelaIdeal(agoraMinJogo) ? 'text-nz-verde' : 'text-amber-600') : 'text-nz-tinta-fraca'}`}>
                    {janelaAberta
                      ? (naJanelaIdeal(agoraMinJogo) ? '● JANELA ABERTA' : `● ÚLTIMA CHANCE — vote até ${horaDeMin(VOTACAO_FIM_MIN)}`)
                      : `janela fechada — abre às ${horaDeMin(VOTACAO_INICIO_MIN)}`}
                  </span>
                </div>
                {/* 🔥 08/09 — fica de pé mesmo com o bloco recolhido: é a
                    regra principal da gamificação, não um detalhe pra achar.
                    Radical de verdade: não é só a MvM, é o dia inteiro. */}
                <p className="text-[10.5px] font-semibold text-red-600">
                  ⚠️ Não votar em TODOS os colegas até as {horaDeMin(VOTACAO_FIM_MIN)} zera o DIA INTEIRO — MvM, Human Token, pontos e X-Pay — sem exceção.
                </p>

                {/* 🎓 08/09 — só o super_admin vê isto: o interruptor pra
                    entrar ou sair de ser votável na MvM (dono: "não é
                    viável expor tanto o principal... salvo se ele permitir"). */}
                {currentUser?.role === 'super_admin' && (
                  <label className="flex items-center gap-2 rounded-lg border border-nz-borda bg-nz-cinza-fundo px-2.5 py-2 cursor-pointer">
                    <input type="checkbox" checked={meuAceitaSerVotado} onChange={alternarAceitaSerVotado} className="h-4 w-4" />
                    <span className="text-[11px] text-nz-tinta">
                      <span className="font-semibold">Aceito ser votado na MvM</span> — como Super Admin, você só aparece na lista dos colegas se ligar isto (fica desligado por padrão).
                    </span>
                  </label>
                )}

                {votacaoAberta && (
                  <>
                    {/* meu Ranking das Virtudes (o que recebi no ciclo) */}
                    {recebido.ranking.length > 0 ? (
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-nz-tinta">Seu Ranking das Virtudes neste ciclo (média {fmtToken(recebido.media)} · {recebido.totalVotos} votos):</p>
                        {recebido.ranking.map((r, i) => (
                          <p key={r.virtude} className="text-[11px] text-nz-tinta-fraca tabular-nums">
                            <span className="font-bold text-nz-tinta">{i + 1}ª</span> {r.virtude} — <span className={`font-semibold ${r.media >= 7 ? 'text-nz-verde' : r.media < 4 ? 'text-red-600' : 'text-amber-600'}`}>{fmtToken(r.media)}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-nz-tinta-fraca">Você ainda não recebeu votos neste ciclo — o Ranking das Virtudes nasce da votação diária do grupo.</p>
                    )}

                    {/* votar nos colegas */}
                    {colegas.length === 0 ? (
                      <p className="text-[11px] text-nz-tinta-fraca">Nenhum outro participante ativo na X-GAME ainda — o painel do admin cadastra o time.</p>
                    ) : (
                      <div className="space-y-2 pt-1 border-t border-nz-borda">
                        <p className="text-[11px] font-semibold text-nz-tinta">Vote nos colegas de hoje (1 a 10 em cada virtude):</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {colegas.map((id) => (
                            <button
                              key={id}
                              type="button"
                              disabled={!janelaAberta}
                              onClick={() => escolherColega(id)}
                              className={`px-2 py-1 rounded border text-[11px] font-medium ${votando === id ? 'border-nz-verde text-nz-verde bg-nz-verde-fundo/50' : jaVoteiEm(id) ? 'border-nz-verde/40 text-nz-tinta-fraca' : 'border-nz-borda text-nz-tinta'} ${!janelaAberta ? 'opacity-50 cursor-not-allowed' : 'hover:border-nz-verde'}`}
                            >
                              {jaVoteiEm(id) ? '✅ ' : ''}{nomesColegas[id] || id.slice(0, 6)}
                            </button>
                          ))}
                        </div>
                        {votando && janelaAberta && (
                          <div className="space-y-1.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {VIRTUDES.map((v) => (
                                <label key={v} className="flex items-center justify-between gap-2 rounded border border-nz-borda bg-white px-2 py-1.5">
                                  <span className="text-[11px] text-nz-tinta">{v}</span>
                                  <select
                                    value={notas[v] || ''}
                                    onChange={(e) => setNotas({ ...notas, [v]: Number(e.target.value) })}
                                    className="text-[11px] border border-nz-borda rounded px-1 py-0.5 bg-white text-nz-tinta"
                                  >
                                    <option value="">nota</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                                  </select>
                                </label>
                              ))}
                            </div>
                            <Button size="sm" onClick={salvarVotos} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8">
                              {salvando ? 'Salvando...' : `Salvar votação de ${nomesColegas[votando] || 'colega'}`}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ══ 🏆 F5 — RANKING H-TOKEN DA EQUIPE (filtros da planilha) ══ */}
            {xgame && mostrarPainel && (
              <div className="border-t border-nz-borda/40 pt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button type="button" onClick={() => setRankingAberto(!rankingAberto)} className="font-semibold text-nz-tinta hover:text-nz-verde">
                    {rankingAberto ? '▾' : '▸'} 🏆 Ranking H-TOKEN da equipe
                  </button>
                  {rankingAberto && (
                    <div className="flex gap-1 flex-wrap">
                      {[['token', 'Moeda'], ['mvm', 'MvM'], ['xpay', 'Remuneração'], ['nome', 'Nome']].map(([k, rotulo]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setOrdemRanking(k)}
                          className={`px-2 py-0.5 rounded border text-[10px] font-medium ${ordemRanking === k ? 'border-nz-verde text-nz-verde bg-nz-verde-fundo/50' : 'border-nz-borda text-nz-tinta-fraca hover:border-nz-verde'}`}
                        >{rotulo}</button>
                      ))}
                    </div>
                  )}
                </div>
                {rankingAberto && (rankingOrdenado.length === 0 ? (
                  <p className="text-[11px] text-nz-tinta-fraca">Ninguém pontuou neste ciclo ainda — o placar nasce quando o time joga o dia.</p>
                ) : (
                  <div className="space-y-1">
                    {rankingOrdenado.map((l, i) => {
                      // 🏆 F9 — ordenando por Moeda, o ranking vira a tabela das LIGAS
                      // 🎖️ DIR-115 — os portões de caráter/vendas valem também
                      // no ranking do time, senão alguém sem o piso de MvM ou
                      // sem bater a meta apareceria classificado como Platina.
                      const liga = ligaComPortoesDoCiclo(l.token, { mvmVotacao: l.mvm, vendasFeitas: l.vendasFeitas });
                      const ligaAnterior = i > 0
                        ? ligaComPortoesDoCiclo(rankingOrdenado[i - 1].token, { mvmVotacao: rankingOrdenado[i - 1].mvm, vendasFeitas: rankingOrdenado[i - 1].vendasFeitas })
                        : null;
                      const cabecalho = ordemRanking === 'token' && liga.id !== ligaAnterior?.id;
                      return (
                        <React.Fragment key={l.user_id}>
                          {cabecalho && (
                            <p className="pt-1 text-[10px] font-bold text-nz-tinta-fraca uppercase tracking-wide">
                              {liga.emoji} {liga.label} <span className="font-normal normal-case">· token {fmtToken(liga.min)}+</span>
                            </p>
                          )}
                          <div className={`flex items-center justify-between gap-2 rounded border px-2 py-1.5 ${l.user_id === uid ? 'border-nz-verde/60 bg-nz-verde-fundo/30' : 'border-nz-borda bg-white'}`}>
                            <span className="text-[11px] font-medium text-nz-tinta truncate">
                              <span className="font-bold">{i + 1}º</span> {liga.emoji} {l.nome}{l.user_id === uid ? ' (você)' : ''}
                            </span>
                            <span className="text-[11px] tabular-nums text-nz-tinta-fraca whitespace-nowrap">
                              {fmtToken(l.token)} · MvM {l.mvm === null ? '—' : fmtToken(l.mvm)} · <span className="text-nz-verde font-semibold">{fmtReais(l.xpay)}</span> · {l.pontos} pts
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    {ciclo && (() => {
                      // 🎖️ DIR-115 — o token pode já valer Platina e a LIGA
                      // ainda travar em Ouro: os portões de caráter/vendas
                      // seguram a promoção mesmo com pontuação de sobra.
                      // "Falta pontuação" e "falta abrir o portão" são avisos
                      // diferentes — misturar os dois esconde o que resolve.
                      const ligaPelaPontuacao = ligaDoToken(ciclo.total);
                      const travadoPorPortao = ciclo.liga.id !== ligaPelaPontuacao.id;
                      if (travadoPorPortao) {
                        const semCarater = recebido.media !== null && recebido.media !== undefined && recebido.media < PISO_CARATER_PLATINA;
                        const semVendas = (Number(ciclo.vendasFeitas) || 0) < META_VENDAS_CICLO;
                        return (
                          <p className="text-[11px] font-semibold text-amber-600 pt-1">
                            🔒 Sua pontuação já é de {ligaPelaPontuacao.emoji} {ligaPelaPontuacao.label}, mas a Platina tem portão: {[
                              semCarater ? `MvM da votação ≥ ${fmtToken(PISO_CARATER_PLATINA)} (você está em ${recebido.media === null ? '—' : fmtToken(recebido.media)})` : null,
                              semVendas ? `bater os ${META_VENDAS_CICLO} de meta de vendas do ciclo (você está em ${fmtToken(ciclo.vendasFeitas)})` : null,
                            ].filter(Boolean).join(' e ')} — "recrutamos caráter e treinamos habilidade": sem os dois, o topo não abre.
                          </p>
                        );
                      }
                      const promo = proximaLiga(ciclo.total);
                      return promo && promo.falta > 0 ? (
                        <p className="text-[11px] font-semibold text-nz-tinta pt-1">
                          ↑ Faltam <span className="text-nz-verde tabular-nums">{fmtToken(promo.falta)}</span> de token pra você subir pra {promo.liga.emoji} {promo.liga.label} — feche os dias, faça no horário e busque nota alta na votação!
                        </p>
                      ) : ciclo.liga.id === 'platina' ? (
                        <p className="text-[11px] font-semibold text-nz-verde pt-1">🏆 Você está na elite — LIGA PLATINA, o território do Executivo Ideal. Segura o trono!</p>
                      ) : null;
                    })()}
                  </div>
                ))}
              </div>
            )}


            {/* 🗂️ DIR-75 — o nosso quadro é uma VISÃO do dia, e vem antes do
                "dia vazio": a mesa da organização existe mesmo num dia sem
                Master Task gerada. */}
            {visao === 'quadro' ? (
              <QuadroCompromisso
                currentUser={currentUser}
                hojeISO={dia}
                onIr={onIr}
                tarefasDoDia={tarefas}
                onTarefaCriada={(t) => setTarefas((prev) => [...prev, t])}
              />
            ) : tarefas.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-nz-tinta-fraca">Dia sem Master Task ainda. "O compromisso é uma decisão diária."</p>
                <Button onClick={gerarDia} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white">
                  ⚡ {salvando ? 'Gerando...' : 'Gerar Minha Rotina Perfeita (Rotina do Método)'}
                </Button>
                <p className="text-[11px] text-nz-tinta-fraca">Cria as {rotina.length} tarefas da {estadoRotina.propria ? 'SUA rotina' : 'Rotina Perfeita'} — e a partir daí ela se repete todo dia, sozinha.</p>
                <button type="button" onClick={() => setVisao('quadro')} className="text-[11px] font-semibold text-nz-verde hover:text-nz-verde-claro">🗂️ ou abrir o nosso quadro →</button>
              </div>
            ) : visao === 'jornada' ? (
              /* 🗺️ F11 — a JORNADA DO DIA: o caminho, não a lista */
              <XGameJornada
                tarefas={xgame ? xgame.tarefas : tarefasJogo}
                nome={(currentUser?.full_name || currentUser?.nickname || '').split(' ')[0]}
                pct={progressoJogo.pct}
                fogo={ehHoje ? fogo : null}
                onTarefa={(t) => { if (!t.feito) alternarFeito(t); }}
                acaoExtra={linkAgendaDe}
                agoraMin={ehHoje ? agoraMinJogo : null}
              />
            ) : (
              /* 🖐️ 09/09/2026 — ARRASTAR PARA REORGANIZAR. Um Droppable por
                 período, todos do mesmo `type`, pra dar pra mover da manhã pra
                 tarde. A hora é remarcada no soltar (ver aoSoltarTarefa). */
              <DragDropContext onDragEnd={aoSoltarTarefa}>
              {PERIODOS.map((p) => {
                const doPeriodo = tarefasJogo.filter((t) => periodoDe(t.hora) === p.id);
                if (doPeriodo.length === 0) return null;
                return (
                  <div key={p.id}>
                    <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">{p.label}</p>
                    <Droppable droppableId={p.id} type="tarefa">
                    {(areaSoltar) => (
                    <div className="space-y-1.5" ref={areaSoltar.innerRef} {...areaSoltar.droppableProps}>
                      {doPeriodo.map((t, iNoPeriodo) => {
                        const guia = guiaDaRotina(t.titulo);
                        return (
                          <Draggable key={t.id} draggableId={String(t.id)} index={iNoPeriodo} isDragDisabled={!t.hora}>
                          {(arrasto, estadoArrasto) => (
                          <div
                            ref={arrasto.innerRef}
                            {...arrasto.draggableProps}
                            style={arrasto.draggableProps.style}
                            className={`border-b border-nz-borda/35 py-3 ${t.feito ? 'opacity-70' : ''} ${estadoArrasto.isDragging ? 'rounded-lg bg-nz-verde-fundo shadow-lg ring-1 ring-nz-verde/40' : ''}`}
                          >
                            {/* 📱 DIR-80 — DOIS ANDARES NO CELULAR.
                                Antes título e ações dividiam a MESMA linha: no
                                celular sobrava uma coluna estreita pro título,
                                que se esticava em seis linhas, a faixa de ações
                                passava POR CIMA do texto e a lixeira saía da
                                tela. Agora o título ocupa a largura toda e as
                                ações descem pro andar de baixo.
                                O `sm:contents` é o pulo do gato: no desktop o
                                contêiner das ações some (display:contents) e os
                                filhos voltam a ser itens diretos da linha —
                                exatamente como era. Zero mudança no desktop. */}
                            <div className="flex flex-wrap items-start gap-x-2.5 gap-y-1.5 sm:flex-nowrap sm:items-center">
                              {/* 🖐️ o punho. Só ele arrasta: com a linha inteira
                                  arrastável, rolar a lista no celular vira arrasto
                                  sem querer, e marcar a tarefa fica sofrido.
                                  Tarefa SEM hora não arrasta (não está na Jornada). */}
                              <span
                                {...(t.hora ? arrasto.dragHandleProps : {})}
                                aria-label={t.hora ? `Arrastar ${t.titulo} para outro horário` : undefined}
                                title={t.hora ? 'Arrastar para outro horário' : 'Sem horário — defina uma hora para poder mover'}
                                className={`shrink-0 select-none text-nz-tinta-fraca mt-1 sm:mt-0 ${t.hora ? 'cursor-grab active:cursor-grabbing hover:text-nz-verde' : 'opacity-30 cursor-not-allowed'}`}
                                data-teste="punho-arrastar"
                              >
                                ⠿
                              </span>
                              <input type="checkbox" checked={!!t.feito} onChange={() => alternarFeito(t)} className="w-4 h-4 accent-green-600 shrink-0 cursor-pointer mt-1 sm:mt-0" />
                              {/* ⚡ o XP voando no clique — feedback imediato do jogo */}
                              {xpFlash?.id === t.id && (
                                <span className="shrink-0 text-[11px] font-bold text-nz-verde animate-bounce">
                                  +{xpFlash.pts} pts{xpFlash.valor > 0 ? ` · +${fmtReais(xpFlash.valor)}` : ''}
                                </span>
                              )}
                              <div className="flex-1 min-w-0">
                                {/* ✅ DIR-77 — concluída fica VERDE (ordem do dono), e o
                                    horário mostra quando TERMINA quando isso existe. */}
                                {/* 🖐️ 09/09/2026 — achado no tour: cada linha da lista tinha
                                    o MESMO data-teste, e o tour sempre mirava na primeira
                                    tarefa renderizada (não necessariamente a primeira da
                                    lista). Marcado só na tarefa que É a primeira de
                                    `tarefasJogo` — o que o passo do tour de fato descreve. */}
                                <p className={`text-sm break-words ${t.feito ? 'line-through text-nz-verde font-semibold' : 'text-nz-tinta font-medium'}`} data-teste={t.id === tarefasJogo[0]?.id ? 'titulo-tarefa' : undefined}>
                                  {t.hora && <span className="font-bold">{t.hora_fim ? `${t.hora}–${t.hora_fim}` : t.hora} · </span>}{t.titulo}
                                </p>
                                {/* ⏰ o pronto: "pronto até", e o recado quando a tarefa voltou.
                                    🎓 09/09/2026 — DIR-107, dono: "tem gente que confunde o que
                                    é o pronto... acha que é só quando termina. Se estiver no
                                    meio da demanda, avise que está fazendo, comunique." */}
                                {t.prazo_em && (() => { const est = estadoDoPronto(t); return (
                                  <p className={`text-[10px] font-bold ${est.id === 'atrasada' ? 'text-red-600' : est.atrasou ? 'text-amber-600' : est.id === 'conferida' ? 'text-nz-verde' : 'text-nz-tinta-fraca'}`} data-teste="pronto-ate" title='O "pronto" não é só marcar como feito no fim: se você ainda está no meio da tarefa, comunique que está em andamento — pela Mensagem pro CEO ou com o responsável.'>
                                    ⏰ {rotuloDoPrazo(t.prazo_em, dia)}{est.id === 'atrasada' ? ' · atrasada — dá o pronto (ou avise que está em andamento)' : est.id === 'pronto' ? (est.atrasou ? ' · pronto dado (atrasado)' : ' · pronto dado, aguardando conferência') : est.id === 'conferida' ? ' · conferida ✔✔' : ''}
                                  </p>
                                ); })()}
                                {t.devolvida_motivo && !t.feito && (
                                  <p className="text-[11px] font-semibold text-amber-700" data-teste="devolvida">↩ devolvida: {t.devolvida_motivo} — refaz e dá o pronto de novo</p>
                                )}
                                {/* 🎓 tarefa com mentalidade (distribuída na gestão): o ensinamento aparece inteiro, não cortado */}
                                {t.mentalidade && !t.feito ? (
                                  <p className="text-[11px] text-nz-tinta-fraca whitespace-pre-line" data-teste="ensinamento-tarefa">{t.detalhe}</p>
                                ) : (
                                  t.detalhe && !t.feito && <p className="text-[11px] text-nz-tinta-fraca truncate">{t.detalhe}</p>
                                )}
                              </div>
                              {/* o ANDAR DE BAIXO no celular; no desktop `sm:contents`
                                  dissolve este contêiner e nada muda de lugar */}
                              <div className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 sm:pl-0 sm:w-auto sm:contents" data-teste={t.id === tarefasJogo[0]?.id ? 'acoes-tarefa' : undefined}>
                              {/* 💰 X-PAY — a fatia da tarefa no valor do dia (fixo ÷ 22, repartido pelo peso) */}
                              {xgame && xgame.valores[t.id] > 0 && (t.feito || estadoDaTarefa(t)?.id !== 'PERDIDO') && (
                                <span className={`shrink-0 text-[10px] font-semibold tabular-nums ${t.feito ? 'text-nz-verde' : 'text-nz-tinta-fraca'}`}>
                                  {t.feito ? '+' : ''}{fmtReais(xgame.valores[t.id])}
                                </span>
                              )}
                              {/* 🛠️ F5 — conferência dupla: o SIM do gestor confirmado */}
                              {t.feito && t.conferido === true && (
                                <span className="shrink-0 text-[10px] font-bold text-nz-verde" title="Conferência dupla: o gestor confirmou o SIM">✔✔ conferida</span>
                              )}
                              {/* ✅ F10 — a comprovação registrada: aprovada pela IA, em análise ou manual */}
                              {t.feito && t.comprovacao?.valido && (
                                t.comprovacao.print_url ? (
                                  t.comprovacao.status === 'em_analise' ? (
                                    <a href={t.comprovacao.print_url} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] font-bold text-amber-600 hover:underline" title={`Em análise do gestor — conta provisoriamente. IA: ${t.comprovacao.veredito_ia?.motivo || ''}`}>⏳ em análise</a>
                                  ) : (
                                    <a href={t.comprovacao.print_url} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] font-bold text-nz-verde hover:underline" title={`${t.comprovacao.status === 'aprovada_manual' ? 'Aprovada pelo gestor' : 'Aprovada pela IA'}${t.comprovacao.veredito_ia?.o_que_viu ? ` — viu: ${t.comprovacao.veredito_ia.o_que_viu}` : ''}`}>{{ foto: '📷', aprendizado: '📚' }[t.comprovacao.tipo] || '📸'} comprovada</a>
                                  )
                                ) : (
                                  <span className="shrink-0 text-[10px] font-bold text-nz-verde" title={`Comprovação: ${t.comprovacao.entrega}`}>{t.comprovacao.tipo === 'ritual' ? '🌅 ritual completo' : '📚 comprovada'}</span>
                                )
                              )}
                              {/* 🎙️ DIR-101.1 — "posteriormente pode ouvir o áudio".
                                  A gratidão falada não some depois de gravada: ela
                                  vira acervo. O link é ASSINADO e de curta validade
                                  (o cofre é privado), então é pedido na hora do
                                  clique — nunca fica guardado na tela. */}
                              {t.feito && t.comprovacao?.audio_gratidao_path && (
                                <OuvirGratidao caminho={t.comprovacao.audio_gratidao_path} uid={uid} dia={t.data} segundos={t.comprovacao.audio_gratidao_seg || 0} />
                              )}
                              {/* 🎮 X-GAME — o tempo real da planilha: AGORA / ATRASADO / PERDIDO */}
                              {!t.feito && (() => {
                                const est = estadoDaTarefa(t);
                                if (!est || !SELO_ESTADO[est.id]) return null;
                                const perda = est.id === 'PERDIDO' && xgame?.valores[t.id] > 0 ? ` − ${fmtReais(xgame.valores[t.id])}` : '';
                                return (
                                  <span className={`shrink-0 text-[10px] font-bold ${COR_ESTADO[est.id]}`} title={est.id === 'PERDIDO' ? 'ISSO IMPACTA NO SEU RESULTADO FINANCEIRO' : undefined}>
                                    {SELO_ESTADO[est.id]}{perda}
                                  </span>
                                );
                              })()}
                              {/* 🔓 08/09/2026 — dono: "o sistema tem que dar isso pra
                                  ele, conversar com ele" — o convite pra recuperar
                                  aparece na própria tarefa perdida, no fim de semana. */}
                              {!t.feito && !ehHoje && estadoDaTarefa(t)?.id === 'PERDIDO' && podeRecuperarNoFds({
                                estadoId: 'PERDIDO', dataTarefaISO: dia, cicloInicioISO: xgame ? dataISO(xgame.ciclo_inicio) : null, hoje: new Date(),
                              }) && (
                                <span className="shrink-0 text-[10px] font-bold text-nz-verde" title="Comprove que fez agora — o X-Pay volta pra você, sem perder o fixo.">
                                  ↺ recupere hoje
                                </span>
                              )}
                              {/* 🔗 DIR-75 — a tarefa leva pra ferramenta dela. Tarefa
                                  sem ferramenta NÃO ganha botão: link errado é pior
                                  que link nenhum. */}
                              {(() => {
                                const f = ferramentaDe(t);
                                if (!f || t.feito) return null;
                                const abrir = () => {
                                  if (f.chave === 'quadro') { setVisao('quadro'); return; }
                                  onIr?.(f.secao, f.sub);
                                };
                                return (
                                  <button
                                    type="button"
                                    onClick={abrir}
                                    title={`Abrir ${f.rotulo} (Hábito ${f.habito})`}
                                    className="shrink-0 text-[11px] font-semibold text-nz-verde hover:text-nz-verde-claro inline-flex items-center gap-1"
                                  >{f.chave === 'quadro' ? <LayoutGrid className="w-3 h-3" /> : <Link2 className="w-3 h-3" />} {f.rotulo}</button>
                                );
                              })()}
                              {/* 🗂️ DIR-76 — dia → quadro: guardar em vez de perder */}
                              {!t.feito && (
                                <button
                                  type="button"
                                  onClick={() => guardarNoQuadro(t)}
                                  title="não vai sair hoje? guarda no quadro e volta pro dia quando quiser"
                                  data-teste="guardar-no-quadro"
                                  className="shrink-0 text-[11px] font-semibold text-nz-tinta-fraca hover:text-nz-verde"
                                >guardar</button>
                              )}
                              {guia && !t.feito && (
                                <button
                                  type="button"
                                  onClick={() => setGuiaAberto(guiaAberto === t.id ? null : t.id)}
                                  className={`shrink-0 text-[11px] font-semibold ${guiaAberto === t.id ? 'text-nz-verde' : 'text-nz-tinta-fraca hover:text-nz-verde'}`}
                                >📖 guia</button>
                              )}
                              {/* ✏️ DIR-80 — EDITAR, que não existia: só havia a
                                  lixeira. O dono pediu "botão de editar de
                                  excluir" — e sem editar, corrigir um horário
                                  significava apagar e recriar. */}
                              {!t.feito && (
                                <button
                                  type="button"
                                  onClick={() => { setEditandoId(t.id); setEdicao({ hora: t.hora || '', titulo: t.titulo || '' }); }}
                                  title="editar esta tarefa de hoje"
                                  data-teste="editar-tarefa"
                                  className="text-nz-tinta-fraca/60 hover:text-nz-verde shrink-0"
                                ><PenLine className="w-3.5 h-3.5" /></button>
                              )}
                              <button type="button" onClick={() => removerTarefa(t)} title="apagar só de hoje — a rotina continua igual" className="text-nz-tinta-fraca/50 hover:text-red-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            {/* ✏️ o editor da tarefa de HOJE, inline */}
                            {editandoId === t.id && (
                              <div className="mt-2 flex flex-wrap items-center gap-2" data-teste="editor-tarefa">
                                <Input type="time" value={edicao.hora} onChange={(e) => setEdicao({ ...edicao, hora: e.target.value })} className="bg-white border-nz-borda text-nz-tinta w-28 shrink-0" data-teste="editar-hora" />
                                <Input value={edicao.titulo} onChange={(e) => setEdicao({ ...edicao, titulo: e.target.value })} className="bg-white border-nz-borda text-nz-tinta flex-1 min-w-[160px]" data-teste="editar-titulo" />
                                <Button size="sm" onClick={() => tentarSalvarEdicao(t)} className="bg-nz-verde hover:bg-nz-verde-claro text-white shrink-0" data-teste="editar-salvar">salvar</Button>
                                <button type="button" onClick={() => setEditandoId(null)} className="text-[11px] text-nz-tinta-fraca hover:text-nz-tinta shrink-0">cancelar</button>
                                <p className="w-full text-[10px] text-nz-tinta-fraca">isto muda só o dia de hoje — pra mudar todo dia, edite a sua rotina.</p>
                                {/* 🔮 DIR-91 — prévia da Jornada antes de gravar um horário mudado */}
                                {previaEdicaoAberta && (
                                  <PreviaJornadaModal
                                    itens={tarefas}
                                    novo={{ titulo: edicao.titulo, hora: edicao.hora, ignorarId: t.id }}
                                    onFechar={() => setPreviaEdicaoAberta(false)}
                                    onAjustar={() => setPreviaEdicaoAberta(false)}
                                    onUsarLivre={(h) => setEdicao((e) => ({ ...e, hora: h }))}
                                    onConfirmar={() => { setPreviaEdicaoAberta(false); salvarEdicao(t); }}
                                  />
                                )}
                              </div>
                            )}
                            {guia && guiaAberto === t.id && !t.feito && (
                              <p className="mt-2 ml-6 text-[11px] leading-relaxed text-nz-tinta-fraca border-l-2 border-nz-verde/40 pl-2.5 whitespace-pre-line">{guia}</p>
                            )}
                          </div>
                          )}
                          </Draggable>
                        );
                      })}
                      {areaSoltar.placeholder}
                    </div>
                    )}
                    </Droppable>
                  </div>
                );
              })}
              </DragDropContext>
            )}

            {visao === 'lista' && (
            <div className="pt-1">
              {/* 🌑 09/09/2026 — dono: "fundo branco em mais um campo descoberto".
                  Este campo nasceu quando a Jornada ainda era painel claro. O painel
                  virou escuro e ele ficou pra trás: caixa branca no meio do preto,
                  com a hora sumindo de tão clara. O componente já sabe ser escuro
                  desde a DIR-90 — só ninguém tinha avisado ele aqui. */}
              <EntradaComDestinos origem="lista" valor={novaTarefa} onChange={setNovaTarefa} onCriar={addTarefa} listas={listasDoQuadro} testeCampo="campo-nova-tarefa" altura={40} itensDoDia={tarefas} escuro />
            </div>
            )}
            {/* ══ 📅 DIR-80 — A MINHA ROTINA (o modelo, não o dia) ══
                O dono: "ela pode gerar a perfeita e excluir e incluir, na rotina
                dela — existem pessoas que não vão pra empresa". Editar aqui vale
                a partir de AMANHÃ: mexer no dia que ela já está tocando apagaria
                o que ela já fez. */}
            {visao === 'lista' && (
              <div className="mt-4 rounded-xl border border-nz-borda bg-white" data-teste="minha-rotina">
                <button
                  type="button"
                  onClick={() => setRotinaAberta((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                  data-teste="abrir-minha-rotina"
                >
                  <span className="text-[13px] font-bold text-nz-tinta">
                    📅 A minha rotina <span className="font-medium text-nz-tinta-fraca">· {rotina.length} itens · {estadoRotina.propria ? 'sua' : 'a padrão da casa'}</span>
                  </span>
                  <span className="text-[11px] font-semibold text-nz-verde shrink-0">{rotinaAberta ? '▾ fechar' : '▸ editar'}</span>
                </button>
                {rotinaAberta && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-nz-verde-fundo px-2.5 py-2">
                      <span className="text-[11px] text-nz-tinta">
                        {estadoRotina.automatica
                          ? 'Está ligada: todo dia nasce com a sua rotina.'
                          : 'Ainda não se repete. Gere um dia e ela passa a nascer sozinha.'}
                      </span>
                      {estadoRotina.automatica && (
                        <button
                          type="button"
                          onClick={() => salvarPerfil({ rotina_automatica: false, rotina_automatica_recusada: true }).then((ok) => ok && toast.success('Parei de gerar sozinha. Você continua podendo gerar na mão.'))}
                          className="ml-auto text-[11px] font-bold text-red-600 hover:underline shrink-0"
                          data-teste="parar-rotina"
                        >parar de gerar todo dia</button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {rotina.map((item, i) => (
                        <div key={`${item.hora}-${item.titulo}-${i}`} className="flex flex-wrap items-center gap-2 border-b border-nz-borda/40 py-1.5" data-teste="item-rotina">
                          {editandoRotina === i ? (
                            <>
                              <Input type="time" value={rascunho.hora} onChange={(e) => setRascunho({ ...rascunho, hora: e.target.value })} className="bg-white border-nz-borda text-nz-tinta w-28 shrink-0" data-teste="rotina-hora" />
                              <Input value={rascunho.titulo} onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })} className="bg-white border-nz-borda text-nz-tinta flex-1 min-w-[150px]" data-teste="rotina-titulo" />
                              <Button size="sm" className="bg-nz-verde hover:bg-nz-verde-claro text-white shrink-0" data-teste="rotina-salvar"
                                onClick={async () => { const ok = await gravarRotina(editarNaRotina(rotina, i, rascunho)); if (ok) setEditandoRotina(null); }}
                              >salvar</Button>
                              <button type="button" onClick={() => setEditandoRotina(null)} className="text-[11px] text-nz-tinta-fraca shrink-0">cancelar</button>
                            </>
                          ) : (
                            <>
                              <span className="text-[12px] font-bold tabular-nums text-nz-tinta w-12 shrink-0">{item.hora || '—'}</span>
                              <span className="text-[12px] text-nz-tinta flex-1 min-w-0 break-words">{item.titulo}</span>
                              <button type="button" title="editar na rotina — vale todo dia" data-teste="rotina-editar"
                                onClick={() => { setEditandoRotina(i); setRascunho({ hora: item.hora || '', titulo: item.titulo }); }}
                                className="text-nz-tinta-fraca/60 hover:text-nz-verde shrink-0"><PenLine className="w-3.5 h-3.5" /></button>
                              <button type="button" title="tirar da rotina — some de todo dia, não só de hoje" data-teste="rotina-excluir"
                                onClick={() => gravarRotina(excluirDaRotina(rotina, i))}
                                className="text-nz-tinta-fraca/50 hover:text-red-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Input type="time" value={novoDaRotina.hora} onChange={(e) => setNovoDaRotina({ ...novoDaRotina, hora: e.target.value })} className="bg-white border-nz-borda text-nz-tinta w-28 shrink-0" data-teste="rotina-nova-hora" />
                      <Input value={novoDaRotina.titulo} onChange={(e) => setNovoDaRotina({ ...novoDaRotina, titulo: e.target.value })} placeholder="incluir na minha rotina..." className="bg-white border-nz-borda text-nz-tinta flex-1 min-w-[150px]" data-teste="rotina-nova-titulo" />
                      <Button disabled={!novoDaRotina.titulo.trim()} className="bg-nz-verde hover:bg-nz-verde-claro text-white shrink-0" data-teste="rotina-incluir"
                        onClick={async () => { const ok = await gravarRotina(incluirNaRotina(rotina, novoDaRotina)); if (ok) setNovoDaRotina({ hora: '', titulo: '' }); }}
                      ><Plus className="w-4 h-4" /></Button>
                    </div>
                    <p className="text-[10px] text-nz-tinta-fraca">
                      O que você muda aqui vale <strong>a partir de amanhã</strong> — o dia de hoje continua como está, com o que você já fez.
                      Pra valer hoje também, use o <em>regerar o dia</em> ali embaixo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {visao === 'lista' && tarefas.length > 0 && (
              confirmaRegerar ? (
                <div className="flex items-center gap-2 flex-wrap rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs">
                  <p className="text-nz-tinta">Apagar as <strong>{tarefas.length} tarefas deste dia</strong> (feitas e não feitas) e criar as <strong>{rotina.length} da Rotina Perfeita</strong>?</p>
                  <Button size="sm" onClick={regerarDia} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-xs">
                    {salvando ? 'Regenerando...' : 'Sim, gerar de novo'}
                  </Button>
                  <button type="button" onClick={() => setConfirmaRegerar(false)} className="text-nz-tinta-fraca hover:text-nz-tinta">cancelar</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmaRegerar(true)} className="text-xs font-semibold text-nz-verde hover:text-nz-verde-claro text-left">
                  ⚡ Este dia foi gerado com a rotina antiga? Gerar de novo com a Rotina Perfeita ({rotina.length} tarefas)
                </button>
              )
            )}
          </div>
        )}

        {/* ══ 🤝 HÁBITO 3 — LISTA DE NETWORK QUALIFICADA (DIR-46) ══ */}
        {painel === 'lista' && (() => {
          const qualificadas = clientesManuais.filter((c) => probabilidadeFechamento(c.qualificacao_network)).length;
          // 👤 09/09/2026 — DIR-111, dono (super admin): "eu vejo aqui todo
          // mundo... tem que botar de quem é o nome da pessoa que
          // qualificou a lista, igual você colocou no Contato." `nomeDoDono`
          // é o mesmo helper do componente (topo do arquivo) — deduplicado
          // na auditoria pré-publicação (estava copiado aqui e no Contato).
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-nz-tinta-fraca">
                  {clientesManuais.length} pessoas {visaoTotal ? 'na lista do TIME' : 'na sua lista'} · {qualificadas} qualificada{qualificadas === 1 ? '' : 's'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={onNovoCliente} className="bg-nz-verde hover:bg-nz-verde-claro text-white" data-teste="lista-adicionar-pessoa">
                    <UserPlus className="w-4 h-4 mr-1" /> Adicionar pessoa
                  </Button>
                  {/* 📥 08/09 — importar em massa. Fica ao lado de "Adicionar
                      pessoa" porque é a mesma pergunta ("como entra gente
                      aqui?"), respondida de dois jeitos: um a um ou a agenda
                      inteira. Só aparece pra quem pode importar — na visão de
                      time, a lista é de outra pessoa, e importar contato pra
                      carteira alheia não é uma operação que exista. */}
                  {onImportarContatos && (
                    <Button size="sm" variant="outline" onClick={onImportarContatos} className="border-nz-verde text-nz-verde hover:bg-nz-verde-fundo">
                      <Upload className="w-4 h-4 mr-1" /> Importar contatos
                    </Button>
                  )}
                  {/* o cadastro de vendedor mora aqui agora: é na Lista de
                      Networking que a rede é construída, não no topo da página */}
                  {onNovoVendedor && (
                    <Button size="sm" onClick={onNovoVendedor} className="bg-nz-marrom hover:bg-nz-marrom-claro text-white">
                      <UserPlus className="w-4 h-4 mr-1" /> Novo vendedor
                    </Button>
                  )}
                </div>
              </div>
              <Input
                value={buscaLista}
                onChange={(e) => setBuscaLista(e.target.value)}
                placeholder="🔎 buscar na agenda por nome, telefone ou e-mail..."
                className="bg-white border-nz-borda text-nz-tinta"
              />
              {listaOrdenada.length === 0 ? (
                <p className="text-sm text-nz-tinta-fraca py-4 text-center">
                  {clientesManuais.length === 0 ? 'Sua lista começa aqui — adicione as pessoas da sua agenda.' : 'Ninguém na agenda com essa busca.'}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {listaOrdenada.map((c) => {
                    const q = c.qualificacao_network || null;
                    const prob = probabilidadeFechamento(q);
                    const prod = produtoApresentacao(q?.produto);
                    return (
                      <div key={c.id} className="flex items-center gap-3 rounded-lg border border-nz-borda bg-white p-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-nz-tinta truncate">
                            {visaoTotal && <span className="font-bold text-nz-verde">👤 {nomeDoDono(c) || 'sem dono definido'} · </span>}
                            {c.full_name || 'Sem nome'}
                          </p>
                          <p className="text-[11px] text-nz-tinta-fraca truncate">{[c.phone, c.email].filter(Boolean).join(' · ') || 'sem contato'}</p>
                        </div>
                        {prob ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button type="button" onClick={() => setQualificando(c)} className="shrink-0 text-right" title="Editar qualificação">
                              <p className="text-[11px] text-nz-tinta-fraca">
                                🫱{q.confianca} 💰{q.financeiro} 🔥{q.apetite}{prod ? ` · ${prod.emoji} ${prod.label}` : ''}
                              </p>
                              <p className={`text-xs font-bold ${COR_FAIXA[prob.faixa.id]}`}>
                                {prob.faixa.emoji} {prob.pct}% de fechamento · {prob.total}/15
                              </p>
                            </button>
                            {/* 🔗 09/09/2026 — DIR-111.2, dono: "eu cliquei
                                nessa pessoa, ela me levou pra página
                                seguinte, eu não posso ter a sensação que eu
                                estou recomeçando... já me coloca ela no meu
                                contato e pisca no contato que eu vou
                                fazer... achar direto na lista, não ficar
                                procurando." Leva o ID de quem clicou — o
                                Hábito 4 rola até ela e pisca a linha. */}
                            {onIr && (
                              <Button size="sm" onClick={() => onIr('contato', null, c.id)} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8" title="Ir contatar essa pessoa no Hábito 4">
                                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Contatar
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setQualificando(c)} className="border-nz-borda text-nz-tinta h-8 shrink-0" data-teste={c.id === primeiroNaoQualificadoId ? 'lista-qualificar' : undefined}>
                            <Star className="w-4 h-4 mr-1 text-amber-500" /> Qualificar
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <CrmNetworkQualificacaoModal
                contato={qualificando}
                onFechar={() => setQualificando(null)}
                onSalvar={salvarQualificacao}
                salvando={salvando}
              />
            </div>
          );
        })()}

        {/* ══ 📜 HÁBITO 4 — CONTATO E CONVITE VIVO (DIR-47) ══ */}
        {painel === 'contato' && (() => {
          const hoje = hojeStr();
          const fmtHora = (s) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
          const fmtQuando = (s) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
          // 🙋/👥 DIR-49 — o escopo (fila + agenda): MINHA é o padrão; TIME só
          // existe pra visão total. "Minha" = o que EU cadastrei/registrei.
          const minha = !visaoTotal; // 06/09: o escopo vem do seletor "só o meu / tudo" lá em cima, não de um botão aqui
          const quem = (nome) => (minha ? 'você' : (nome || 'sem dono definido')); // DIR-50/54: dono na frente
          // `nomeDoDono` é o helper do componente (topo do arquivo) —
          // deduplicado na auditoria pré-publicação (estava copiado aqui e na Lista).

          // 🎯 DIR-54 — a fila respeita o MESMO escopo: MINHA só os que EU
          // cadastrei; TIME mostra todos, com o dono identificado em cada um.
          const filaTodos = clientesManuais
            .map((c) => ({ c, prob: probabilidadeFechamento(c.qualificacao_network) }))
            .filter((x) => x.prob)
            .sort((a, b) => b.prob.pct - a.prob.pct);
          // 🔒 06/09 — "minha" é minha de verdade: filtra pelo dono sempre (a lista
          // já chega individual pra quem não é super admin; aqui é o cinto).
          const fila = minha ? filaTodos.filter(({ c }) => c.created_by_id === uid) : filaTodos;
          const totalEscopado = minha ? clientesManuais.filter((c) => c.created_by_id === uid).length : clientesManuais.length;
          const semQualificar = totalEscopado - fila.length; // DIR-49/54: fila honesta, no MESMO escopo

          const agenda = agendaDoDiaContatos(clientesManuais, hoje);
          const reunioesEsteiraHoje = reunioes.filter((o) => String(o.reuniao_em).slice(0, 10) === hoje);
          const agendados = minha ? agenda.agendados.filter(({ registro }) => registro.registrado_por_id === uid) : agenda.agendados;
          const retornos = minha ? agenda.retornos.filter(({ registro }) => registro.registrado_por_id === uid) : agenda.retornos;
          const esteiraDoDia = minha ? reunioesEsteiraHoje.filter((o) => o.responsavel_id === uid || o.criado_por_id === uid) : reunioesEsteiraHoje;
          // DIR-49.1 — reunião de dia futuro não pode ser invisível
          const proximasTodas = proximasReunioes(clientesManuais, hoje);
          const proximas = minha ? proximasTodas.filter(({ registro }) => registro.registrado_por_id === uid) : proximasTodas;
          // a LINHA DO TEMPO UNIFICADA: método + esteira + empresa + (na MINHA)
          // o Google — o Google é pessoal, nunca entra na visão do time; a
          // reunião da EMPRESA é de todos, entra nas duas.
          // DIR-73 — agenda marcada 'diretoria' some pra quem não é diretoria
          const empresaHoje = reunioesEmpresaDoDia(reunioesEmpresa, hoje, { visaoTotal });
          const linha = linhaDoTempoUnificada([
            ...agendados.map(({ cliente, registro }) => ({ origem: 'metodo', quando: registro.quando, cliente, registro })),
            ...esteiraDoDia.map((o) => ({ origem: 'esteira', quando: o.reuniao_em, o })),
            ...empresaHoje.map((r) => ({ origem: 'empresa', quando: r.quando, r })),
            ...(minha && Array.isArray(googleEventos) ? googleEventos.map((e) => ({ origem: 'google', quando: e.inicio, e })) : []),
          ]);
          const nReunioes = agendados.length + esteiraDoDia.length + empresaHoje.length;
          const resumoSemana = resumoSemanaReunioes(clientesManuais, hoje); // DIR-51
          const podeMexer = (registro) => registro.registrado_por_id === uid || visaoTotal; // DIR-50
          return (
            <div className="space-y-4">
              {/* 🔀 09/09/2026 — DIR-111, dono: "tudo tem que ter uma ordem...
                  tem que ter lá em cima explicando classificação da lista,
                  cem por cento, tal tal tal." O guia agora também explica o
                  % (vem da qualificação do Hábito 3) e a ordem dos 4 passos. */}
              <GuiaMovel titulo="Como fazer o contato" className="border-t border-nz-borda/40 pt-4 text-xs text-nz-tinta-fraca space-y-1">
                <p>📖 Antes do convite, o F.O.R.M. da pessoa: <strong>F</strong>amília · <strong>O</strong>cupação · <strong>R</strong>ecreação · <strong>M</strong>ensagem certa — você preenche na ficha de cada pessoa (Hábito 6 → Clientes).</p>
                <p>🎯 O % ao lado do nome vem da qualificação que você fez no Hábito 3 (confiança + financeiro + apetite) — quanto mais alto, mais perto de fechar.</p>
                <p>🔀 A ordem dos botões é a ordem do fluxo: <strong>Contatar</strong> (chama no WhatsApp) → <strong>Agendar</strong> (marcou reunião) ou <strong>Registrar</strong> (anota o desfecho, sem reunião) → <strong>Esteira</strong> (virou negociação de verdade).</p>
              </GuiaMovel>

              {/* 📜 DIR-112 (09/09/2026) — dono, ao vivo: "essa parte de cima
                  está boa pra caralho... vamos melhorar a apresentação e
                  obrigar ele fazer o form." O script sobe pro topo da tela,
                  vira uma ficha chamativa, e conta ponto uma vez só.
                  🎨 mesmo dia, olhando ao vivo: "só essa cor que está feia,
                  vamos deixar coeso." O fundo pastel translúcido (amber-50/50
                  em cima do hero escuro desta parte da tela) virava uma cor
                  suja/embaçada — trocado pelo MESMO padrão branco sólido dos
                  outros cartões desta tela (a fila logo abaixo), com o
                  estado (ainda não validado / já vale ponto) só na
                  borda+ícone, não no fundo inteiro.
                  🎯 DIR-112.1 — dono: "você só vai dar um ponto quando
                  conferir, como validação... se o script estiver bom, aí
                  fixa e dá o ponto." O ponto NÃO é mais automático por
                  tamanho — só quando a IA (scriptContatoCoach) aprova. */}
              <div data-teste="contato-script" className={`rounded-xl border-2 bg-white p-3.5 space-y-2.5 [color-scheme:light] ${perfil?.script_pontuado_em ? 'border-nz-verde/60' : 'border-amber-400/70'}`}>
                <div className="flex items-start gap-2">
                  <ScrollText className={`w-5 h-5 mt-0.5 shrink-0 ${perfil?.script_pontuado_em ? 'text-nz-verde' : 'text-amber-600'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
                      {perfil?.script_pontuado_em ? '✅ Seu script de convite (já validado — vale ponto)' : '⚠️ Escreva seu script antes de sair contatando'}
                    </p>
                    <p className="text-xs" style={{ color: '#5C6B62' }}>
                      {perfil?.script_pontuado_em
                        ? 'O método ensina, mas a voz é sua — aperfeiçoe a cada conversa. Ele aparece na sua frente sempre que você clicar em Contatar.'
                        : 'Escreva do seu jeito, use {nome} pra personalizar, e peça a dica: quando a IA conferir que está bom, você ganha o ponto. Ele também vai aparecer na sua frente sempre que você clicar em Contatar.'}
                    </p>
                  </div>
                </div>
                <Textarea value={script} onChange={(e) => setScript(e.target.value)} rows={6} placeholder={EXEMPLO_SCRIPT} className="bg-white border-nz-borda text-nz-tinta text-sm" />
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={salvarScript} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white">
                    <Save className="w-4 h-4 mr-2" /> {salvando ? 'Salvando...' : 'Salvar meu script'}
                  </Button>
                  {/* 💡 o "validador" pedido pelo dono: ajuda a MELHORAR — nunca
                      escreve por ela — e é ele quem confere se já vale o ponto. */}
                  <Button
                    type="button" variant="outline" disabled={pedindoDica || script.trim().length < 15}
                    onClick={pedirDicaDoScript}
                    className="border-nz-verde/40 text-nz-verde hover:bg-nz-verde-fundo"
                    data-teste="contato-script-dica"
                  >
                    {pedindoDica ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                    {pedindoDica ? 'Conferindo...' : 'Peça uma dica pra melhorar'}
                  </Button>
                </div>
                {dicaScript && (
                  <div className={`rounded-lg border bg-white p-2.5 space-y-1 ${dicaScript.aprovado ? 'border-nz-verde/40' : 'border-amber-400/40'}`} data-teste="contato-script-dica-resultado">
                    <p className={`text-xs font-bold ${dicaScript.aprovado ? 'text-nz-verde' : 'text-amber-600'}`}>
                      {dicaScript.aprovado ? '✅ Aprovado — vale ponto!' : '📝 Ainda não vale o ponto — ajuste e peça de novo'}
                    </p>
                    {dicaScript.pontos_fortes && <p className="text-xs font-semibold text-nz-verde">👍 {dicaScript.pontos_fortes}</p>}
                    <p className="text-xs whitespace-pre-line" style={{ color: '#1A1A1A' }}>💡 {dicaScript.dica}</p>
                  </div>
                )}
              </div>

              {/* 🎯 fila dos qualificados da lista (DIR-46 alimenta o contato) */}
              <div data-teste="contato-fila">
                <p className="text-sm font-bold text-nz-tinta mb-1.5">
                  Quem contatar — {visaoTotal && !minha ? 'os qualificados do TIME' : 'os qualificados da sua lista'}{fila.length > 0 ? ` (${fila.length})` : ''}
                </p>
                {visaoTotal && (
                  <p className="text-[11px] text-nz-tinta-fraca mb-1.5">{minha ? '🙋 mostrando só os SEUS cadastros — pra ver de todo mundo, troque pra "Tudo" no seletor do topo' : '👥 mostrando os cadastros de TODO MUNDO, cada um com o dono identificado'}</p>
                )}
                {fila.length === 0 ? (
                  <p className="text-xs text-nz-tinta-fraca py-3 text-center border border-dashed border-nz-borda rounded-xl">
                    Ninguém qualificado ainda —{' '}
                    <button type="button" onClick={() => onIr?.('lista')} className="font-semibold text-nz-verde hover:text-nz-verde-claro">qualifique sua lista no Hábito 3 →</button>
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {fila.map(({ c, prob }, i) => {
                      // 🔦 09/09/2026 — DIR-111.2, dono: "já me coloca ela no
                      // meu contato e pisca... achar direto na lista, não
                      // ficar procurando." Rola até ela UMA vez e pisca —
                      // `contatoDestacado` some sozinho em 4s (useEffect acima).
                      const destacada = c.id === contatoDestacado;
                      return (
                      <div
                        key={c.id}
                        ref={destacada ? (el) => { if (el && !el.dataset.rolou) { el.dataset.rolou = '1'; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } } : undefined}
                        className={`flex items-center gap-2 sm:gap-3 rounded-lg border p-2.5 flex-wrap ${destacada ? 'border-nz-verde ring-2 ring-nz-verde/50 animate-pulse bg-nz-verde-fundo/40' : 'border-nz-borda bg-white'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-nz-tinta truncate">
                            {visaoTotal && <span className="font-bold text-nz-verde">👤 {quem(nomeDoDono(c))} · </span>}
                            {c.full_name || 'Sem nome'}
                          </p>
                          <p className="text-[11px] text-nz-tinta-fraca truncate">{[c.phone, c.email].filter(Boolean).join(' · ') || 'sem contato'}</p>
                          {(() => { // DIR-49.1 — o registro salvo aparece AQUI, na hora
                            const u = ultimoContato(c);
                            const r = u && RESULTADOS_CONTATO.find((x) => x.id === u.resultado);
                            return r ? <p className="text-[11px] font-medium text-nz-verde truncate">último: {r.emoji} {r.label} · {fmtQuando(u.em)}</p> : null;
                          })()}
                        </div>
                        <p className={`text-xs font-bold shrink-0 ${COR_FAIXA[prob.faixa.id]}`}>{prob.faixa.emoji} {prob.pct}%</p>
                        {/* DIR-49 — os DOIS caminhos claros: agendar em 1 clique ou registrar o desfecho.
                            🔀 09/09/2026 — DIR-111, dono: "tudo tem que ter uma ordem... quando eu clicar
                            em contatar, me gera WhatsApp." Contatar vem primeiro — é o gesto físico de
                            chamar a pessoa; só depois entram agendar/registrar o desfecho.
                            📜 DIR-112 — "imagina ele com fone, começando a fazer a ligação... ele
                            clica, esse papel vem pra frente." Em vez de ir direto pro WhatsApp, o
                            clique primeiro traz o SCRIPT da pessoa pra frente (chamadaAberta) — o
                            WhatsApp abre só depois, do próprio modal. */}
                        {/* 🖐️ 09/09/2026 — mesmo achado do tour: marcado só na
                            PRIMEIRA linha da fila (já ordenada por %), que é
                            de fato a pessoa que o passo do tour descreve. */}
                        <div className="flex gap-1.5 shrink-0 flex-wrap" data-teste={i === 0 ? 'contato-acoes' : undefined}>
                          {(() => {
                            const numero = String(c.phone || '').replace(/\D/g, '');
                            const wa = numero ? `https://wa.me/${numero.length <= 11 ? `55${numero}` : numero}?text=${encodeURIComponent(`Oi ${(c.full_name || '').split(' ')[0] || ''}, tudo bem?`)}` : null;
                            // 🐛 09/09/2026 — achado na auditoria: sem telefone, o botão só
                            // sumia — sem explicar por quê, parecia bug. Agora avisa.
                            return wa ? (
                              <Button size="sm" variant="outline" onClick={() => setChamadaAberta({ contato: c, wa })} className="border-nz-verde/40 text-nz-verde hover:bg-nz-verde-fundo h-8" data-teste="contato-abrir-chamada">
                                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />Contatar
                              </Button>
                            ) : (
                              <span className="text-[11px] text-nz-tinta-fraca italic self-center" data-teste="contato-sem-telefone">sem telefone cadastrado</span>
                            );
                          })()}
                          <Button size="sm" onClick={() => setRegistroAberto({ contato: c, agendar: true })} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8">
                            <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />Agendar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRegistroAberto({ contato: c })} className="border-nz-verde/40 text-nz-verde hover:bg-nz-verde-fundo h-8">
                            <PenLine className="w-3.5 h-3.5 mr-1.5" />Registrar
                          </Button>
                          {/* 🔗 08/09/2026 — dono: "quando falar contato e convite,
                              isso tem que me levar numa esteira... a jornada não
                              está conexa." Vira negociação de verdade sem
                              redigitar nada — mesmo caminho do "+ Criar
                              oportunidade" do modal do cliente, só que direto
                              daqui, no exato passo em que ela vira interesse real. */}
                          {onCriarOportunidade && (
                            <Button size="sm" variant="outline" onClick={() => onCriarOportunidade(c)} title="Virou negociação de verdade? Leva pra Esteira de Captação, já com o nome e contato preenchidos." className="border-nz-marrom/40 text-nz-marrom hover:bg-nz-marrom/10 h-8">
                              <GitBranch className="w-3.5 h-3.5 mr-1.5" />Esteira
                            </Button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
                {/* DIR-49/54 — fila honesta: quem ficou de fora e por quê, no MESMO escopo */}
                {semQualificar > 0 && (
                  <p className="text-[11px] text-nz-tinta-fraca mt-1.5">
                    ⭐ {semQualificar === 1 ? `+1 pessoa d${visaoTotal && !minha ? 'o time' : 'a sua lista'} ainda sem qualificação` : `+${semQualificar} pessoas d${visaoTotal && !minha ? 'o time' : 'a sua lista'} ainda sem qualificação`} —{' '}
                    <button type="button" onClick={() => onIr?.('lista')} className="font-semibold text-nz-verde hover:text-nz-verde-claro">qualificar no Hábito 3 →</button>
                  </p>
                )}
              </div>

              {/* 📅 DIR-49 — A AGENDA UNIFICADA: minha (padrão) × time inteiro,
                  método + esteira + Google numa linha do tempo só */}
              <div className="rounded-xl border border-nz-verde/25 bg-nz-verde-fundo/30 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-bold text-nz-tinta">
                    {minha ? 'Minha agenda de hoje' : 'Agenda do TIME hoje'} · {plural(nReunioes, 'reunião', 'reuniões')} · {plural(retornos.length, 'retorno', 'retornos')}
                  </p>
                  <div className="flex gap-1.5 shrink-0 flex-wrap">
                    {minha && (
                      <Button size="sm" variant="outline" onClick={conectarGoogleAgenda} disabled={googleConectando} className="border-nz-borda text-nz-tinta h-8 bg-white">
                        🗓️ {googleConectando ? 'Conectando...' : googleEventos ? 'Atualizar Google' : 'Conectar Google'}
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setRegistroAberto({ contato: null })} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8">
                      <CalendarPlus className="w-4 h-4 mr-1" /> Agendar reunião
                    </Button>
                  </div>
                </div>
                {minha && googleConta && (
                  <p className="text-[11px] text-nz-tinta-fraca">
                    🗓️ Conectado como <span className="font-semibold text-nz-tinta">{googleConta}</span> —{' '}
                    <button type="button" onClick={trocarContaGoogle} className="font-semibold text-nz-verde hover:text-nz-verde-claro">trocar conta</button>
                  </p>
                )}
                {minha && googleEventos === null && !googleConta && (
                  <p className="text-[11px] text-nz-tinta-fraca">🗓️ Conecte o Google pra ver os SEUS eventos de hoje aqui no meio (só leitura, direto no seu navegador — ninguém mais vê a sua agenda).</p>
                )}
                {!minha && (
                  <p className="text-[11px] text-nz-tinta-fraca">👥 Você está vendo as reuniões DO MÉTODO do time inteiro — a Google Agenda é pessoal e só aparece na sua.</p>
                )}
                {/* 📊 DIR-51 — a visão MACRO da semana, só no TIME INTEIRO */}
                {!minha && (
                  <div className="rounded-lg bg-white border border-nz-verde/25 p-2.5">
                    <p className="text-xs font-bold text-nz-tinta">Semana: {plural(resumoSemana.total, 'reunião agendada', 'reuniões agendadas')} <span className="font-normal text-nz-tinta-fraca">(meta do método: {META_REUNIOES_SEMANA}/pessoa)</span></p>
                    {resumoSemana.porPessoa.length > 0 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {resumoSemana.porPessoa.map((p) => (
                          <span key={p.id} className="text-[11px] text-nz-tinta"><span className="font-bold text-nz-verde">👤 {p.nome}</span> {plural(p.total, 'reunião', 'reuniões')} · <span className={p.pct >= 100 ? 'text-nz-verde font-bold' : ''}>{p.pct}% da meta</span></span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {linha.length === 0 && retornos.length === 0 ? (
                  <p className="text-xs text-nz-tinta-fraca text-center py-2">
                    {minha && Array.isArray(googleEventos) && googleEventos.length === 0
                      ? 'Nada na sua agenda de hoje — nem no método, nem no Google. Dia livre pra contatar a fila. 🎯'
                      : minha ? 'Nada na sua agenda de hoje ainda — use o 📅 Agendar da fila acima.' : 'Nenhuma reunião do time hoje.'}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {linha.map((item) => {
                      if (item.origem === 'metodo') {
                        const { cliente, registro } = item;
                        const g = registro.google_event_link
                          || linkGoogleAgenda({ titulo: registro.titulo_reuniao || `Reunião — ${cliente.full_name || 'contato'} (Leilão NoZap)`, inicio: registro.quando, duracaoMin: registro.duracao_min || 60, detalhes: registro.obs || 'Apresentação de sucesso — Contato e Convite' });
                        return (
                          <div key={registro.id || `${cliente.id}-${registro.quando}`} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-nz-borda bg-white p-2.5 flex-wrap [color-scheme:light]">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-nz-tinta truncate"><span className="font-bold text-nz-verde">👤 {quem(registro.registrado_por_nome)}</span> · 📅 <span className="font-bold">{fmtHora(registro.quando)}</span> · {registro.titulo_reuniao || cliente.full_name || 'Sem nome'}</p>
                              <p className="text-[11px] text-nz-tinta-fraca truncate">reunião do método{registro.obs ? ` · ${registro.obs}` : ''}</p>
                            </div>
                            {g && (
                              <a href={g} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <Button size="sm" variant="outline" className="border-nz-borda text-nz-tinta h-8"><CalendarPlus className="w-4 h-4 mr-1" /> {registro.google_event_link ? 'Abrir no Google' : 'Google Agenda'}</Button>
                              </a>
                            )}
                            {podeMexer(registro) && (
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="outline" onClick={() => setRegistroAberto({ contato: cliente, editar: registro })} className="h-8 px-2 border-nz-borda text-nz-tinta" title="Editar reunião">✏️</Button>
                                <Button size="sm" variant="outline" onClick={() => excluirRegistro(cliente, registro)} className={`h-8 px-2 ${confirmaExcluir === registro.id ? 'border-red-500 text-red-600 bg-red-50 font-bold' : 'border-nz-borda text-nz-tinta-fraca'}`} title="Excluir (apaga do Google junto)">
                                  {confirmaExcluir === registro.id ? 'Confirma excluir?' : '🗑️'}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      }
                      if (item.origem === 'esteira') {
                        const { o } = item;
                        return (
                          <div key={o.id} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-nz-borda bg-white p-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-nz-tinta truncate"><span className="font-bold text-nz-verde">👤 {quem(o.responsavel_nome)}</span> · 🛤️ <span className="font-bold">{fmtHora(o.reuniao_em)}</span> · {o.cliente_nome || 'Sem nome'}</p>
                              <p className="text-[11px] text-nz-tinta-fraca truncate">reunião da esteira</p>
                            </div>
                          </div>
                        );
                      }
                      if (item.origem === 'empresa') {
                        const { r } = item; // 🏛️ DIR-52 — de todos, sinalizada
                        return (
                          <div key={`emp-${r.id || r.titulo}`} className="flex items-center gap-2 sm:gap-3 rounded-lg border-2 border-amber-400/50 bg-amber-50/70 p-2.5 [color-scheme:light]">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-nz-tinta truncate">🏛️ <span className="font-bold">{r.hora}</span> · {r.titulo}</p>
                              <p className="text-[11px] text-nz-tinta-fraca truncate">reunião da empresa — todo mundo participa{r.dia_semana !== null && r.dia_semana !== undefined ? ` · toda ${DIAS_SEMANA[r.dia_semana]}` : ''}</p>
                            </div>
                          </div>
                        );
                      }
                      const { e } = item; // origem google — só na MINHA agenda
                      return (
                        <div key={e.id} className="flex items-center gap-3 rounded-lg border border-dashed border-nz-borda bg-white/70 p-2.5 [color-scheme:light]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-nz-tinta truncate">🗓️ <span className="font-bold">{fmtHora(e.inicio) || 'dia todo'}</span> · {e.titulo}</p>
                            <p className="text-[11px] text-nz-tinta-fraca">da sua Google Agenda</p>
                          </div>
                        </div>
                      );
                    })}
                    {retornos.map(({ cliente, registro }) => (
                      // 🩹 09/09/2026 — dono viu essa linha "meio apagada": o
                      // mesmo repintador de "modo escuro" do navegador (DIR-92)
                      // forçando cor por cima de um card que é claro de
                      // propósito. `color-scheme: light` avisa o navegador que
                      // ISTO já é claro por design; a cor também vira inline
                      // no texto que ele reportou, como segunda camada de defesa.
                      <div key={registro.id || `${cliente.id}-ret`} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-2.5 flex-wrap [color-scheme:light]">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}><span className="font-bold text-nz-verde">👤 {quem(registro.registrado_por_nome)}</span> · Retornar hoje · {cliente.full_name || 'Sem nome'}</p>
                          <p className="text-[11px] truncate" style={{ color: '#5C6B62' }}>{registro.obs || 'pediu pra retornar'}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" onClick={() => setRegistroAberto({ contato: cliente, agendar: true })} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8">📅 Agendar</Button>
                          <Button size="sm" variant="outline" onClick={() => setRegistroAberto({ contato: cliente })} className="border-nz-verde/40 text-nz-verde hover:bg-nz-verde-fundo h-8">✍️ Registrar</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 📆 DIR-49.1 — reunião de dia futuro tem casa: as próximas */}
                {proximas.length > 0 && (
                  <div className="pt-1.5 border-t border-nz-verde/20">
                    <p className="text-xs font-bold text-nz-tinta mb-1.5">📆 {plural(proximas.length, 'próxima reunião', 'próximas reuniões')}</p>
                    <div className="space-y-1.5">
                      {proximas.map(({ cliente, registro }) => {
                        const g = registro.google_event_link
                          || linkGoogleAgenda({ titulo: registro.titulo_reuniao || `Reunião — ${cliente.full_name || 'contato'} (Leilão NoZap)`, inicio: registro.quando, duracaoMin: registro.duracao_min || 60, detalhes: registro.obs || 'Apresentação de sucesso — Contato e Convite' });
                        return (
                          <div key={registro.id || `${cliente.id}-${registro.quando}`} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-nz-borda bg-white p-2.5 flex-wrap [color-scheme:light]">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-nz-tinta truncate"><span className="font-bold text-nz-verde">👤 {quem(registro.registrado_por_nome)}</span> · 📅 <span className="font-bold">{fmtQuando(registro.quando)}</span> · {registro.titulo_reuniao || cliente.full_name || 'Sem nome'}</p>
                              <p className="text-[11px] text-nz-tinta-fraca truncate">reunião do método{registro.local ? ` · ${registro.local}` : ''}</p>
                            </div>
                            {g && (
                              <a href={g} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <Button size="sm" variant="outline" className="border-nz-borda text-nz-tinta h-8"><CalendarPlus className="w-4 h-4 mr-1" /> {registro.google_event_link ? 'Abrir no Google' : 'Google Agenda'}</Button>
                              </a>
                            )}
                            {podeMexer(registro) && (
                              <div className="flex gap-1 shrink-0">
                                <Button size="sm" variant="outline" onClick={() => setRegistroAberto({ contato: cliente, editar: registro })} className="h-8 px-2 border-nz-borda text-nz-tinta" title="Editar reunião">✏️</Button>
                                <Button size="sm" variant="outline" onClick={() => excluirRegistro(cliente, registro)} className={`h-8 px-2 ${confirmaExcluir === registro.id ? 'border-red-500 text-red-600 bg-red-50 font-bold' : 'border-nz-borda text-nz-tinta-fraca'}`} title="Excluir (apaga do Google junto)">
                                  {confirmaExcluir === registro.id ? 'Confirma excluir?' : '🗑️'}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 📜 DIR-112 (09/09/2026) — dono, ao vivo: "tu pode sumir com
                  aquela parte da agenda ali fixa... pode excluir, pra ficar
                  ainda mais limpo." O painel de gestão de "Reuniões fixas da
                  empresa" saiu — quem tem visão total ainda agenda reunião da
                  empresa pelo botão "Agendar reunião" de cima (mesmo destino,
                  salvarAgendaEmpresa). O script de convite morou aqui; agora
                  mora lá em cima, logo depois do guia (ver PASSOS_TOUR_CONTATO
                  mais abaixo — o alvo "contato-script" segue o card). */}

              {/* 🏛️ DIR-73 — a porta da agenda da empresa só é ENTREGUE a quem tem
                  visão total: passando null, o modal nem desenha a opção. A
                  permissão mora aqui, e não numa condição perdida lá dentro. */}
              <CrmContatoRegistroModal
                aberto={registroAberto !== null}
                contatoInicial={registroAberto?.contato || null}
                agendarDireto={!!registroAberto?.agendar}
                registroInicial={registroAberto?.editar || null}
                contatos={clientesManuais}
                onFechar={() => setRegistroAberto(null)}
                onSalvar={salvarRegistroContato}
                salvando={salvando}
                criarNoGoogleFn={registroAberto?.editar ? atualizarEventoNoGoogle(registroAberto.editar) : criarEventoNoGoogle}
                onSalvarAgendaEmpresa={podeGerir ? salvarAgendaEmpresa : null}
                visaoTotal={visaoTotal}
                autor={currentUser}
              />

              {/* 📜 DIR-112 (09/09/2026) — "o papel vem pra frente": dono, ao
                  vivo — "imagina ele com fone, começando a fazer a ligação...
                  ele clica, esse papel vem pra frente." Em vez de abrir o
                  WhatsApp direto, o "Contatar" traz o SCRIPT em primeiro
                  plano — a pessoa lê enquanto liga, o WhatsApp só abre a
                  partir daqui. */}
              {chamadaAberta && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-label="Seu script pra este contato" data-teste="contato-chamada-modal">
                  <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-4 space-y-3 [color-scheme:light]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold" style={{ color: '#1A1A1A' }}>📞 Ligando pra {chamadaAberta.contato?.full_name || 'esse contato'}</p>
                      <button type="button" onClick={() => setChamadaAberta(null)} aria-label="Fechar" className="shrink-0 text-nz-tinta-fraca hover:text-nz-tinta"><X className="w-4 h-4" /></button>
                    </div>
                    <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 shrink-0" /> Use fone de ouvido — assim você lê e fala ao mesmo tempo.
                    </p>
                    {script.trim() ? (
                      <div className="rounded-lg border border-nz-borda bg-nz-verde-fundo/20 p-3 max-h-64 overflow-y-auto">
                        <p className="text-sm whitespace-pre-line" style={{ color: '#1A1A1A' }}>{personalizarScript(script, chamadaAberta.contato?.full_name)}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-nz-tinta-fraca">Você ainda não escreveu seu script — escreva ali em cima antes de ligar, é rápido e já ajuda nessa e nas próximas ligações.</p>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={() => { window.open(chamadaAberta.wa, '_blank', 'noopener'); setChamadaAberta(null); }} className="flex-1 bg-nz-verde hover:bg-nz-verde-claro text-white" data-teste="contato-chamada-whatsapp">
                        <MessageCircle className="w-4 h-4 mr-2" /> Abrir WhatsApp e ligar
                      </Button>
                      <Button variant="outline" onClick={() => setChamadaAberta(null)} className="border-nz-borda text-nz-tinta">Fechar</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ══ 🎤 HÁBITO 5 — APRESENTAÇÃO DE SUCESSO (agenda) ══ */}
        {painel === 'apresentacao' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1" data-teste="apresentacao-meta">
              <p className={`text-sm font-bold ${reunioesHoje >= 3 ? 'text-nz-verde' : 'text-nz-tinta'}`}>Hoje: {reunioesHoje} de 3 reuniões (meta do método)</p>
              <button type="button" onClick={() => onIr?.('acompanhamento', 'expansao')} className="text-sm font-semibold text-nz-verde hover:text-nz-verde-claro">+ Agendar reunião (na esteira) →</button>
            </div>
            {reunioes.length === 0 ? (
              <p className="text-sm text-nz-tinta-fraca py-3 text-center">Nenhuma reunião nos próximos 7 dias — reunião nasce da oportunidade na esteira.</p>
            ) : (
              <div className="space-y-1.5">
                {reunioes.map((o) => {
                  const g = linkGoogleAgenda({ titulo: `Reunião — ${o.cliente_nome || 'apresentação'} (Leilão NoZap)`, inicio: o.reuniao_em, duracaoMin: 60, detalhes: `Apresentação de sucesso · ${o.tipo || ''} · responsável: ${o.responsavel_nome || ''}` });
                  return (
                    <div key={o.id} className="flex items-center gap-3 rounded-lg border border-nz-borda bg-white p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-nz-tinta truncate">{o.cliente_nome || 'Sem nome'}</p>
                        <p className="text-[11px] text-nz-tinta-fraca">{new Date(o.reuniao_em).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {o.responsavel_nome || ''}</p>
                      </div>
                      {g && (
                        <a href={g} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <Button size="sm" variant="outline" className="border-nz-borda text-nz-tinta h-8"><CalendarPlus className="w-4 h-4 mr-1" /> Google Agenda</Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-lg border border-nz-borda p-3 space-y-2" data-teste="apresentacao-oficial">
              <p className="text-xs font-semibold text-nz-tinta">Apresentação oficial do negócio</p>
              <div className="flex gap-2">
                <Input value={apresentacaoUrl} onChange={(e) => setApresentacaoUrl(e.target.value)} placeholder="cole aqui o link da apresentação (deck, página, vídeo)..." className="bg-white border-nz-borda text-nz-tinta text-sm" />
                <Button size="sm" onClick={() => salvarPerfil({ apresentacao_url: apresentacaoUrl })} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white shrink-0 h-9"><Save className="w-4 h-4" /></Button>
                {perfil?.apresentacao_url && (
                  <a href={perfil.apresentacao_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <Button size="sm" variant="outline" className="border-nz-borda text-nz-tinta h-9"><ExternalLink className="w-4 h-4 mr-1" /> Abrir</Button>
                  </a>
                )}
              </div>
              <p className="text-[11px] text-nz-tinta-fraca">Conexão → FORM → Mensagem → Convite → Apresentação → <strong>Próximo Passo</strong>.</p>
            </div>
          </div>
        )}

        {/* ══ 🔁 HÁBITO 8 — DUPLICAÇÃO (local de treinamento) ══ */}
        {painel === 'duplicacao' && (
          <div className="space-y-3">
            <div className="space-y-2" data-teste="duplicacao-habitos">
              {HABITOS.map((h) => (
                <div key={h.n} className="rounded-lg border border-nz-borda p-3">
                  <p className="text-sm font-bold text-nz-tinta"><span className="text-nz-verde">{h.n}. {h.titulo}</span><span className="text-nz-tinta-fraca font-normal"> — {h.sub}</span></p>
                  <p className="text-sm text-nz-tinta-fraca mt-0.5">{h.texto}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-dashed border-nz-verde/40 bg-nz-verde-fundo/40 p-4 text-center" data-teste="duplicacao-treinamento">
              <p className="text-sm font-semibold text-nz-tinta">Local de treinamento do time</p>
              <p className="text-xs text-nz-tinta-fraca mt-1">Aqui entram os materiais oficiais (vídeos, decks, trilha do novo executivo). Estrutura pronta — os conteúdos entram conforme o time for gravando.</p>
            </div>
            <p className="text-xs text-nz-tinta-fraca text-center italic">"A disciplina é a ponte entre objetivos e realização." — Jim Rohn</p>
          </div>
        )}
    <TourGuiado ativo={tourAberto} passos={PASSOS_POR_PAINEL[painel] || []} onFechar={() => setTourAberto(false)} />
    </div>
  );
}

// 🖐️ 09/09/2026 — dono, ao vivo, depois de testar o tour do Compromisso:
// "pode seguir pros outros hábitos". Cada `texto` abre com uma pergunta
// (método socrático, o mesmo tom pedido pra IA de comprovação hoje) antes
// de explicar — a plataforma ensinando, não só narrando.

// Hábito 2 — Compromisso, a tela que a pessoa vive todo dia
const PASSOS_TOUR_METODO = [
  {
    alvo: 'nav-habitos',
    titulo: 'Estes são os seus 8 Hábitos',
    texto: 'Sabe qual você vai usar todo santo dia? O Hábito 2 — Compromisso. Os outros sete entram conforme a etapa do seu negócio, mas é aqui que o jogo acontece.',
  },
  {
    alvo: 'titulo-tarefa',
    titulo: 'Sua rotina de hoje, tarefa por tarefa',
    texto: 'Reparou que cada uma tem um horário? É esse horário que decide se ela conta cheia, atrasada ou perdida — não a ordem da lista.',
  },
  {
    alvo: 'acoes-tarefa',
    titulo: 'Marcar é um toque',
    texto: 'Fez a tarefa? Marque NA HORA, não no fim do dia — marcar tudo às 22h faz o sistema contar todas como atrasadas, mesmo que você tenha feito na hora certa. Algumas pedem uma foto como prova antes de fechar.',
  },
  {
    alvo: 'placar-do-dia',
    titulo: 'Seus 4 números do dia',
    texto: 'Human Token, MvM, Cotação e X-Pay — sempre aqui, sempre atualizados. Toque no ⓘ de qualquer um pra entender de onde ele sai.',
  },
  {
    alvo: 'votacao-mvm-toggle',
    titulo: 'A votação que ninguém pode esquecer',
    texto: 'Você sabia que não votar em TODOS os colegas até o fim da janela zera o seu dia inteiro — dinheiro incluído, mesmo com 100% das suas tarefas feitas? Vote aqui, todo dia, sem falta.',
  },
];

// Hábito 1 — Quadro dos Sonhos
const PASSOS_TOUR_SONHO = [
  {
    alvo: 'nav-habitos',
    titulo: 'Estes são os seus 8 Hábitos',
    texto: 'Você está no Hábito 1 — Sonho. É por aqui que tudo começa: sem saber onde quer chegar, a energia se espalha.',
  },
  {
    alvo: 'sonho-horizonte',
    titulo: 'Três prazos, não um só',
    texto: 'Sabe por que curto, médio e longo prazo são caixas separadas? Porque sonho sem prazo vira desejo vago — com prazo, vira meta.',
  },
  {
    alvo: 'sonho-adicionar',
    titulo: 'Detalhe o sonho, não só a imagem',
    texto: 'Vai colocar um carro? Escreva ano, cor, banco de couro, roda. Quanto mais detalhe, mais real ele fica pro seu cérebro perseguir — e é essa imagem que flutua no seu Ritual do Amanhecer.',
  },
];

// Hábito 3 — Lista de Networking
const PASSOS_TOUR_LISTA = [
  {
    alvo: 'nav-habitos',
    titulo: 'Hábito 3 — Lista de Networking',
    texto: 'Sabe quem você já conhece que podia virar cliente ou parceiro? É isso que essa lista organiza — as pessoas da sua agenda, qualificadas de 1 a 5.',
  },
  {
    alvo: 'lista-adicionar-pessoa',
    titulo: 'Toda pessoa da sua agenda entra aqui',
    texto: 'Adicione antes de qualificar — a lista cresce primeiro, a nota vem depois.',
  },
  {
    alvo: 'lista-qualificar',
    titulo: 'Qualificar é o que decide quem vira prioridade',
    texto: 'Confiança, financeiro e apetite — três notas que juntas dizem o % de chance de fechar. É essa nota que decide quem aparece primeiro no Hábito 4.',
  },
];

// Hábito 4 — Contato e Convite
const PASSOS_TOUR_CONTATO = [
  {
    alvo: 'nav-habitos',
    titulo: 'Hábito 4 — Contato e Convite',
    texto: 'Já qualificou alguém no Hábito 3? Essas pessoas aparecem aqui, na fila de quem contatar — as mais qualificadas primeiro.',
  },
  {
    alvo: 'contato-script',
    titulo: 'Seu script vale ponto — e vem com você pra ligação',
    texto: 'Já pensou por que escrever o SEU jeito de convidar (não um copiado) muda o resultado da ligação? Escreva com {nome} pra personalizar e peça a dica pra IA: quando ela conferir que está bom, você ganha o ponto — uma vez só. Ela te ajuda a pensar, nunca escreve por você. Ele também aparece na sua frente sempre que você clicar em Contatar.',
  },
  {
    alvo: 'contato-fila',
    titulo: 'A fila é ordenada pelo %',
    texto: 'Quem tem mais chance de fechar aparece no topo — não é a ordem que você cadastrou, é a ordem de prioridade real.',
  },
  {
    alvo: 'contato-acoes',
    titulo: 'Três botões, uma ordem só',
    texto: 'Sabe qual vem primeiro? Contatar traz seu script pra frente (pra você ler enquanto liga, de fone) e leva ao WhatsApp → Agendar ou Registrar o desfecho → Esteira, quando virar negociação de verdade. Sempre nessa ordem.',
  },
];

// Hábito 5 — Apresentação de Sucesso
const PASSOS_TOUR_APRESENTACAO = [
  {
    alvo: 'nav-habitos',
    titulo: 'Hábito 5 — Apresentação de Sucesso',
    texto: 'A reunião marcada no Hábito 4 chega aqui. Sabe a meta do método? 3 apresentações por dia, de 45 a 60 minutos cada.',
  },
  {
    alvo: 'apresentacao-meta',
    titulo: 'O contador não deixa você esquecer',
    texto: 'Fica verde quando bate 3 — é o número que o método pede todo dia, nem mais, nem menos.',
  },
  {
    alvo: 'apresentacao-oficial',
    titulo: 'Uma apresentação, sempre a mesma',
    texto: 'Cole aqui o link do seu deck ou vídeo oficial — é a mesma apresentação toda vez, pra você não reinventar a roda a cada reunião.',
  },
];

// Hábito 8 — Duplicação
const PASSOS_TOUR_DUPLICACAO = [
  {
    alvo: 'nav-habitos',
    titulo: 'Hábito 8 — Duplicação',
    texto: 'Sabe o que separa quem cresce sozinho de quem constrói um time? Ensinar os outros 7 Hábitos pra frente — é isso que esse hábito é.',
  },
  {
    alvo: 'duplicacao-habitos',
    titulo: 'Os 8 Hábitos, resumidos',
    texto: 'Use esta lista pra treinar alguém do zero — é o mesmo roteiro que você aprendeu, só que contado por você agora.',
  },
  {
    alvo: 'duplicacao-treinamento',
    titulo: 'O local de treinamento do time',
    texto: '"A disciplina é a ponte entre objetivos e realização." Os materiais oficiais (vídeos, decks) entram aqui conforme o time for gravando.',
  },
];

const PASSOS_POR_PAINEL = {
  sonho: PASSOS_TOUR_SONHO,
  compromisso: PASSOS_TOUR_METODO,
  lista: PASSOS_TOUR_LISTA,
  contato: PASSOS_TOUR_CONTATO,
  apresentacao: PASSOS_TOUR_APRESENTACAO,
  duplicacao: PASSOS_TOUR_DUPLICACAO,
};
