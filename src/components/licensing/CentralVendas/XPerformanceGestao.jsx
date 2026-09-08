import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, Wallet, Wrench, ChevronDown, X, UserRound, Zap, AlarmClock, CheckCheck, Undo2, Building2, BriefcaseBusiness, MessageCircle } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import XGameAdmin from '@/components/licensing/XGameAdmin';
import {
  fmtReais, nomeExibicao, pesoAutomatico, categoriaDaTarefa, valoresDasTarefas,
  fixoDoParticipante, pesoReferenciaDe, PESO_DIA_COMPLETO, inicioCicloOficial, fimCiclo, dataISO, PARTICIPANTE_PADRAO,
} from '@/lib/xgame';
import { distribuirDia, resumoDoCiclo } from '@/lib/distribuicaoFixo';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { ROTINA_PADRAO, gerarTarefasDaRotina } from '@/lib/metodo';
import { MENTALIDADES, mentalidadeDe, mentalidadePadrao, planejamentoDoDia, resumoPorMentalidade } from '@/lib/mentalidades';
import { ACOES_PADRAO, catalogoJunto } from '@/lib/catalogoAcoes';
import { prazoDe, rotuloDoPrazo, filaDoPronto, carimboDaDevolucao } from '@/lib/pronto';
import { EMPRESAS, empresaDe, rotuloDaEmpresa, FUNCOES_OFICIAIS, FUNCOES_DE_MERCADO, FUNCOES_DO_PAINEL, funcaoDaPessoaComOrigem, montarDiaDaFuncao } from '@/lib/funcoes';
import { CartaoFuncaoOficial, ModeloEconomico, ScoreEscada } from '@/components/licensing/CentralVendas/PainelOficial';
import { getLevel, normalizeLevels } from '@/lib/careerLevels';
import { semaforo, mesDe, fracoesDoScore } from '@/lib/metasPessoa';
import { useMetasDaPessoa, AbaMetas, AbaPrograma, AbaSemana, AbaQuadro, AbaHistorico, ABAS } from '@/components/licensing/CentralVendas/QuadroGeralAbas';
import ComprovacoesPainel from '@/components/licensing/CentralVendas/Comprovacoes';
import { portoesDaSociedade } from '@/lib/xperformance';

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
//
// 📚 QUARTA RODADA (dono, mesmo dia): "uma lista de opções do que tem pra
// fazer; ao selecionar, já me diz o peso e a mentalidade; e cada ação que eu
// colocar eu posso adicionar nesse menu". O CATÁLOGO (src/lib/catalogoAcoes):
// o inicial no código + o que o dono salva em xperf_acoes. Escolher uma ação
// preenche título, mentalidade, Hábito e peso; título digitado à mão é lido
// pela régua (a mentalidade vem do texto) e pode ser salvo no catálogo.
//
// 📏 E A COERÊNCIA DO VALOR (dono: "uma tarefa dessa não pode valer cento e
// seis reais num dia"): o dia completo é a Rotina Perfeita (peso 75) — a
// conta mora em distribuicaoFixo/xgame; aqui só se mostra.
//
// 🗂️ OITAVA RODADA (dono, mesmo dia): "mantém o Distribuir como está e entra
// um menu do QUADRO GERAL da pessoa: tudo — função, cargo, valores, o que
// fazer, meta mensal, entregáveis da mentoria (set/2026 a mar/2027), os
// produtos que precisa vender, o planejamento diário, o quadro dele por
// prioridade; e quando eu enviar a demanda, se cai na lista, no quadro ou
// nos dois". O modal virou ABAS (QuadroGeralAbas): Pessoa, Metas, Programa,
// Semana, Quadro dele, Histórico — com o SEMÁFORO e o "cobrar no WhatsApp"
// no topo. E o Distribuir ganhou DESTINO (lista / quadro / os dois),
// PRIORIDADE (vira o prazo do card) e "repetir nos dias úteis da semana".
//
// 🏢 SÉTIMA RODADA (dono, mesmo dia): "o que a gente tem que ter é a FUNÇÃO
// de cada um. O Emanuel: Diretor de Operações — a partir daí o sistema já me
// dá as tarefas do dia dele. E identificar a EMPRESA: e-Digital (marketing e
// tecnologia), Leilão no Zap, X-EOS; o Jean, CMO, trabalha pro Leilão no Zap
// através da e-Digital." No modal da pessoa: função (do painel de controle,
// ou escolhida: CMO/CTO/CFO), empresa e "através de", e O DIA DA FUNÇÃO com
// o botão que distribui as tarefas dela (src/lib/funcoes).
//
// 🧠 SEXTA RODADA (dono, mesmo dia): "quando eu botei uma palavra ele ficou
// nela até o final; tem que ir atualizando conforme eu escrevo — um
// raciocínio vivo junto comigo. E a mentoria tem roteiro: 15 min de leitura,
// 45 de treinamento e 2h de reunião." A LEITURA VIVA (lib catalogoAcoes.
// lerTexto): todas as palavras contam, o nome dito pesa mais, o último
// escrito desempata — e a tela mostra cada sinal reconhecido. A categoria e
// os temas também saem do texto. E "mentoria" vira TRÊS blocos encadeados
// no horário (montarMentoria), com o ensinamento de cada um.
//
// ⏰ QUINTA RODADA (dono, mesmo dia): "tem sistema que a gente chama de
// pronto: começar tal hora e entregar até tal hora; aparece pra ele dar o
// pronto até, pra gente sempre cobrar o pronto". A tarefa ganha o "pronto
// até" (prazo_em) e a FILA DO PRONTO fecha o enviar-e-voltar: o que está
// atrasado, o que está pronto esperando o ✔✔, e o DEVOLVER com recado —
// que a pessoa lê embaixo da tarefa (src/lib/pronto).


import DistribuirTarefa, { proximoDiaUtil, diasUteisAteSexta, prazoDaPrioridade } from '@/components/licensing/CentralVendas/DistribuirTarefa';
export { proximoDiaUtil, diasUteisAteSexta, prazoDaPrioridade };

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

// 🚦 o topo do Quadro Geral: semáforo, cobrar no WhatsApp e as abas
function QuadroGeralTopo({ pessoaId, nome, telefone, tarefasCiclo, hoje, aba, onAba, onFechar, metasInfo }) {
  const doHoje = tarefasCiclo.filter((t) => t.user_id === pessoaId && String(t.data).slice(0, 10) === hoje);
  const fila = filaDoPronto(tarefasCiclo.filter((t) => t.user_id === pessoaId));
  const atrasadas = fila.filter((f) => f.estado.id === 'atrasada');
  const devolvidas = fila.filter((f) => f.estado.id === 'devolvida').length;
  const foraDoRitmo = (metasInfo?.progresso || []).filter((m) => !m.noRitmo).length;
  const sem = semaforo({ planejou: planejamentoDoDia(doHoje).gerado, atrasadas: atrasadas.length, metasForaDoRitmo: foraDoRitmo, devolvidas });
  const COR = { verde: 'bg-nz-verde', amarelo: 'bg-amber-400', vermelho: 'bg-red-500' };
  const numero = String(telefone || '').replace(/\D/g, '');
  const cobrar = atrasadas[0]?.tarefa;
  const msg = cobrar
    ? `Oi ${nome.split(' ')[0]}, tudo bem? A tarefa "${cobrar.titulo}" tinha pronto até ${rotuloDoPrazo(cobrar.prazo_em, String(cobrar.data).slice(0, 10))?.replace('pronto até ', '')}. Consegue dar o pronto? 🙏`
    : `Oi ${nome.split(' ')[0]}, tudo bem? Passando pra ver como está o seu dia. 💪`;
  const wa = numero ? `https://wa.me/${numero.length <= 11 ? `55${numero}` : numero}?text=${encodeURIComponent(msg)}` : null;
  return (
    <div className="pb-2 mb-2 border-b border-white/10" data-teste="quadro-geral-topo">
      <div className="flex items-center gap-2 flex-wrap">
        <UserRound className="w-4 h-4 text-nz-verde" />
        <p className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">Quadro Geral · {nome}</p>
        <span className={`inline-block h-3 w-3 rounded-full ${COR[sem.cor]}`} title={sem.motivos.join(' · ') || 'tudo em dia'} data-teste="semaforo" data-cor={sem.cor} />
        <p className="text-[11px] text-white/60 truncate flex-1 min-w-[120px]">{sem.motivos.length ? sem.motivos.join(' · ') : 'tudo em dia: planejou, sem atraso, metas no ritmo'}</p>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-nz-verde/20 hover:bg-nz-verde/35 px-2.5 py-1 text-[11px] font-bold text-nz-verde" data-teste="whatsapp">
            <MessageCircle className="w-3.5 h-3.5" /> {cobrar ? 'cobrar o pronto' : 'chamar'} no WhatsApp
          </a>
        )}
        <button type="button" onClick={onFechar} aria-label="Fechar" title="fechar o Quadro Geral" className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/10"><X className="w-3.5 h-3.5" /> fechar</button>
      </div>
      <div className="mt-2 flex gap-1 overflow-x-auto" role="tablist" data-teste="abas-quadro-geral">
        {ABAS.map(([id, rotulo, Icone]) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => onAba(id)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${aba === id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white'}`} data-aba={id}>
            {Icone && <Icone className="w-3 h-3" />}{rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [abaModal, setAbaModal] = useState('pessoa');
  const [devolvendo, setDevolvendo] = useState(null); // { id, motivo }
  const [gerando, setGerando] = useState(false);
  // 📚 o catálogo: o que veio do banco + o padrão do código
  const [acoesDoBanco, setAcoesDoBanco] = useState([]);
  const catalogo = useMemo(() => catalogoJunto(ACOES_PADRAO, acoesDoBanco), [acoesDoBanco]);
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
    const [p, u, c, a] = await Promise.all([
      supabase.from('xgame_participantes').select('*').eq('ativo', true).order('created_date'),
      supabase.from('app_users').select('id,full_name,nickname,role,career_levels,primary_career_level,phone,profile_photo_url,avatar_url,avatar_color').order('full_name'),
      supabase.from('xgame_config').select('ciclo_inicio').eq('id', 'atual').maybeSingle(),
      supabase.from('xperf_acoes').select('*').order('titulo'),
    ]);
    setParticipantes(p.data || []);
    setUsuarios(u.data || []);
    setAcoesDoBanco(a.data || []);
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
      .select('id,user_id,data,hora,titulo,peso,categoria,feito,conferido,origem,mentalidade,habito,prazo_em,pronto_em,devolvida_motivo,devolvida_em')
      .in('user_id', equipe.map((p) => p.id))
      .gte('data', de).lte('data', ate)
      .order('data').order('hora');
    setTarefasCiclo(data || []);
  }, [equipe, diasCiclo, dia]);
  useEffect(() => { carregarTarefas(); }, [carregarTarefas]);

  useEffect(() => { if (!pessoa && equipe.length) setPessoa(equipe[0].id); }, [equipe, pessoa]);

  const participante = pessoa ? participanteDe(pessoa) : null;
  // 🎯 as metas do mês da pessoa aberta no modal (o semáforo do topo também lê)
  const tarefasDoMesDaPessoa = useMemo(() => tarefasCiclo.filter((t) => t.user_id === pessoaFixo && mesDe(String(t.data)) === mesDe(hoje)), [tarefasCiclo, pessoaFixo, hoje]);
  const metasInfo = useMetasDaPessoa({ pessoaId: modalAberto ? pessoaFixo : null, mes: mesDe(hoje), hoje, tarefasDoMes: tarefasDoMesDaPessoa });
  // 🚪 o caminho pra sociedade da pessoa aberta (os três portões, DIR-74) — saiu de baixo e veio pra cá
  const [entregaveisDaPessoa, setEntregaveisDaPessoa] = useState([]);
  useEffect(() => {
    if (!modalAberto || !pessoaFixo) return;
    supabase.from('xperf_entregaveis').select('*').eq('dono_id', pessoaFixo).then(({ data }) => setEntregaveisDaPessoa(data || []));
  }, [modalAberto, pessoaFixo]);
  // a função de trabalho (com o dia dela): a escolhida no painel da pessoa, ou a do nível do painel de controle
  // (a função NÃO é o nível: Diretor Operacional é posição; COO é trabalho — o
  // documento sugere pelo nome, o dono decide no painel da pessoa)
  const funcaoComOrigem = (id) => funcaoDaPessoaComOrigem({ funcaoTitulo: participanteDe(id)?.funcao_titulo, nivel: equipe.find((p) => p.id === id)?.nivel, nome: usuarios.find((u) => u.id === id)?.full_name || nomeDe(id) });
  const funcaoTrabalho = (id) => funcaoComOrigem(id).funcao;
  const niveisDe = (id) => { const u = usuarios.find((x) => x.id === id); return normalizeLevels([...(Array.isArray(u?.career_levels) ? u.career_levels : []), u?.primary_career_level].filter(Boolean)); };
  const ehProducao = (t) => { const c = categoriaDaTarefa(t); return c !== 'bonus' && c !== 'venda'; };

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

  // ✔✔ o SIM da gestão (conferência dupla) e ↩ a devolução com recado
  const conferir = async (t) => {
    setTarefasCiclo((l) => l.map((x) => (x.id === t.id ? { ...x, conferido: true } : x)));
    const { error } = await supabase.from('metodo_tarefas').update({ conferido: true }).eq('id', t.id);
    if (error) { toast.error('Não conferiu — recarregando'); carregarTarefas(); return; }
    toast.success(`✔✔ conferida: ${t.titulo}`);
  };
  const devolver = async (t, motivo) => {
    const patch = carimboDaDevolucao(motivo);
    setTarefasCiclo((l) => l.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
    setDevolvendo(null);
    const { error } = await supabase.from('metodo_tarefas').update(patch).eq('id', t.id);
    if (error) { toast.error('Não devolveu — recarregando'); carregarTarefas(); return; }
    toast.success(`↩ devolvida pra ${nomeDe(t.user_id)}: "${patch.devolvida_motivo}"`);
  };

  // 🏢 o dia da função: as tarefas que a função faz todo dia, distribuídas de uma vez
  const gerarDiaDaFuncao = async (userId, diaISO) => {
    const f = funcaoTrabalho(userId);
    if (!f) { toast.error('Defina a função da pessoa primeiro.'); return; }
    setGerando(true);
    const jaTem = tarefasCiclo.filter((t) => t.user_id === userId && String(t.data).slice(0, 10) === diaISO).length;
    const linhas = montarDiaDaFuncao(f, { userId, dia: diaISO, criadoPorId: currentUser?.id || null, prazoISO: prazoDe(diaISO, '18:00'), ordemInicial: jaTem });
    const { error } = await supabase.from('metodo_tarefas').insert(linhas);
    setGerando(false);
    if (error) { toast.error('Não distribuiu o dia da função — tenta de novo'); return; }
    toast.success(`${f.nome}: ${linhas.length} tarefas do dia distribuídas pra ${nomeDe(userId)} em ${fmtDia(diaISO)}`);
    carregarTarefas();
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
    toast.success(patch.fixo_mes != null ? `${nomeDe(p.user_id)}: fixo atualizado — o valor do dia já mudou` : `${nomeDe(p.user_id)}: painel atualizado`);
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
    return resumoDoCiclo({ fixoMes: fixoDoParticipante(base), pesoReferencia: pesoReferenciaDe(base), tarefasPorDia: porDia, diasDoCiclo: diasCiclo, hojeISO: hoje });
  };

  if (carregando) {
    return <div className="py-6 text-center text-white/40"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;
  }


  return (
    <div className="space-y-5" data-teste="gestao">
      {/* ── 1. 🎯 DISTRIBUIR TAREFA — a peça única (DistribuirTarefa.jsx), a mesma do Painel Corporativo ── */}
      <DistribuirTarefa
        currentUser={currentUser} equipe={equipe} participanteDe={participanteDe} nomeDe={nomeDe}
        tarefasCiclo={tarefasCiclo} carregarTarefas={carregarTarefas} catalogo={catalogo} acoesDoBanco={acoesDoBanco} onAcoesDoBanco={setAcoesDoBanco}
        pessoa={pessoa} onPessoa={setPessoa} dia={dia} onDia={setDia} desfazer={desfazer}
        onAbrirQuadroGeral={(id) => { setPessoaFixo(id); setAbaModal('pessoa'); setModalAberto(true); }}
      />

      {modalAberto && pessoaFixo && (() => {
        const base = participanteDe(pessoaFixo);
        const r = resumoDe(pessoaFixo);
        const hojeDele = tarefasCiclo.filter((t) => t.user_id === pessoaFixo && ehProducao(t) && String(t.data).slice(0, 10) === hoje);
        const reguaHoje = distribuirDia({ fixoMes: fixoDoParticipante(base), pesoReferencia: pesoReferenciaDe(base), tarefas: hojeDele });
        // os dias do ciclo com tarefa, de hoje em diante — o que está distribuído
        const proximos = [...new Set(tarefasCiclo.filter((t) => t.user_id === pessoaFixo && String(t.data).slice(0, 10) >= hoje).map((t) => String(t.data).slice(0, 10)))].sort().slice(0, 8);
        return (
          /* 🗂️ dono (06/09/2026): "não é um modalzinho: quando eu clico, ele abre
             pegando a página toda, na linha do cartão Distribuir tarefa". Então o
             Quadro Geral é um PAINEL de página inteira, logo abaixo do Distribuir;
             enquanto está aberto, o resto da gestão sai da frente. */
          <div className="rounded-xl border border-white/15 p-3 sm:p-4 text-white" style={{ background: 'rgba(255,255,255,0.04)' }} data-teste="modal-pessoa" data-pessoa={pessoaFixo} ref={(el) => { if (el && !el.dataset.rolou) { el.dataset.rolou = '1'; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }}>
            <div className="relative w-full">
              <QuadroGeralTopo pessoaId={pessoaFixo} nome={nomeDe(pessoaFixo)} telefone={usuarios.find((u) => u.id === pessoaFixo)?.phone} tarefasCiclo={tarefasCiclo} hoje={hoje} aba={abaModal} onAba={setAbaModal} onFechar={() => setModalAberto(false)} metasInfo={metasInfo} />
              <div className="flex items-start justify-between gap-2" hidden={abaModal !== 'pessoa'}>
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold truncate">{nomeDe(pessoaFixo)}</p>
                  <p className="text-[11px] text-white/45" data-teste="cabecalho-pessoa">
                    <span className="text-white/70">{funcaoDe(pessoaFixo)}</span> <span className="text-white/25">no painel de controle</span>
                    {funcaoTrabalho(pessoaFixo) ? <> · função <span className="text-white/70">{funcaoTrabalho(pessoaFixo).curto || funcaoTrabalho(pessoaFixo).nome}</span></> : <span className="text-amber-300/80"> · sem função</span>}
                    {base.empresa ? ` · ${rotuloDaEmpresa(base.empresa, base.empresa_via)}` : ''}
                  </p>
                </div>
              </div>

              <div hidden={abaModal !== 'pessoa'} data-teste="aba-pessoa">
              {/* 🏢 função e empresa — de onde sai o dia da pessoa */}
              {(() => {
                const { funcao: f, origem } = funcaoComOrigem(pessoaFixo);
                const nivel = equipe.find((p) => p.id === pessoaFixo)?.nivel;
                return (
                  <div className="mt-3 rounded-lg border border-white/10 p-2.5" style={{ background: 'rgba(255,255,255,0.03)' }} data-teste="funcao-empresa">
                    <div className="flex items-center gap-3 flex-wrap text-[10px] text-white/45 uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1" title="a posição no painel de controle — não é a função"><UserRound className="w-3 h-3" /> posição <span className="normal-case text-white/70" data-teste="posicao-painel">{nivel ? getLevel(nivel).name : '—'}</span></span>
                      <label className="inline-flex items-center gap-1"><BriefcaseBusiness className="w-3 h-3" /> função
                        <select
                          value={participanteDe(pessoaFixo)?.funcao_titulo ? (f?.id || '') : ''}
                          onChange={(e) => salvarFixo(base, { funcao_titulo: e.target.value || null })}
                          className={`ml-1 ${campo} normal-case`}
                          data-teste="funcao"
                        >
                          <option value="">{f && origem !== 'escolhida' ? `(sugerida: ${f.curto || f.nome})` : 'escolha…'}</option>
                          <optgroup label="Documento Oficial">
                            {FUNCOES_OFICIAIS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                          </optgroup>
                          <optgroup label="Funções de mercado">
                            {FUNCOES_DE_MERCADO.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                          </optgroup>
                          <optgroup label="Funções do painel de controle">
                            {FUNCOES_DO_PAINEL.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                          </optgroup>
                        </select>
                      </label>
                      <label className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> empresa
                        <select value={base.empresa || ''} onChange={(e) => salvarFixo(base, { empresa: e.target.value || null })} className={`ml-1 ${campo} normal-case`} data-teste="empresa">
                          <option value="">—</option>
                          {EMPRESAS.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                        </select>
                      </label>
                      <label>através da
                        <select value={base.empresa_via || ''} onChange={(e) => salvarFixo(base, { empresa_via: e.target.value || null })} className={`ml-1 ${campo} normal-case`} data-teste="empresa-via">
                          <option value="">—</option>
                          {EMPRESAS.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                        </select>
                      </label>
                    </div>
                    <p className="mt-1.5 text-[11px] text-white/60" data-teste="funcao-resumo">
                      {f ? <><span className="text-white font-bold">{f.nome}</span> · {mentalidadeDe(f.mentalidade)?.nome} — entrega {f.entrega}{origem === 'documento' ? <span className="text-white/35"> · sugerida pelo Documento Oficial</span> : null}</> : 'sem função com dia definido — escolha acima'}
                      {base.empresa && <span className="text-white/40"> · trabalha pro <span className="text-white/70">{rotuloDaEmpresa(base.empresa, base.empresa_via)}</span>{empresaDe(base.empresa)?.pilar ? <span className="text-white/30"> ({empresaDe(base.empresa).pilar})</span> : null}</span>}
                    </p>
                    {f && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">O dia da função ({f.dia.length} tarefas)</p>
                          <Button size="sm" onClick={() => gerarDiaDaFuncao(pessoaFixo, hoje)} disabled={gerando} className="ml-auto bg-nz-verde hover:bg-nz-verde-claro text-white h-7 text-[11px]" data-teste="gerar-dia-funcao">
                            {gerando ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />} distribuir o dia da função (hoje)
                          </Button>
                        </div>
                        <ul className="mt-1 space-y-0.5 text-[11px] text-white/55" data-teste="dia-funcao">
                          {f.dia.map((t) => <li key={t.hora + t.titulo}><span className="text-white/35 tabular-nums">{t.hora}</span> · {t.titulo} <span className="text-white/30">· H{t.habito}</span></li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 📜 a função no Documento Oficial: missão, metas, entregáveis, cadência */}
              <CartaoFuncaoOficial funcao={funcaoTrabalho(pessoaFixo)} origem={funcaoComOrigem(pessoaFixo).origem} nivel={equipe.find((p) => p.id === pessoaFixo)?.nivel} fixoMes={base.temFixo ? Number(base.fixo_mes) : null} />

              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-white/50 tabular-nums"><span className="text-white font-bold text-[14px]" data-teste="valor-dia-pessoa">{fmtReais(r.valorDia)}</span> / dia de operação</p>
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
                <span className="normal-case text-white/40" title="o peso somado das tarefas de produção da Rotina do Método — é o que o fixo do dia paga inteiro">dia completo = peso {pesoReferenciaDe(base)} <span className="text-white/25">(Rotina Perfeita{pesoReferenciaDe(base) === PESO_DIA_COMPLETO ? '' : ' desta pessoa'})</span></span>
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
                {reguaHoje.pesoFalta > 0
                  ? <span className="text-amber-300/80"> · peso {reguaHoje.somaPesos} de {reguaHoje.pesoReferencia}, falta {reguaHoje.pesoFalta} pro dia completo ({fmtReais(reguaHoje.emAberto)} em aberto)</span>
                  : ' · dia completo'}
              </p>

              {/* 💰 as cinco camadas do modelo econômico, com os números dela */}
              <ModeloEconomico fixoMes={base.temFixo ? Number(base.fixo_mes) : null} carteira={metasInfo.carteira} niveis={niveisDe(pessoaFixo)} />

              {/* 🚪 os três portões da sociedade desta pessoa */}
              {(() => {
                const p = portoesDaSociedade({ entregaveis: entregaveisDaPessoa, pessoaId: pessoaFixo, hojeISO: hoje });
                return (<>
                  <div className="mt-3 rounded-lg border border-white/10 p-2.5" style={{ background: 'rgba(255,255,255,0.03)' }} data-teste="portoes-pessoa">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">Caminho pra sociedade</p>
                      <p className={`text-[10px] font-bold ${p.liberado ? 'text-nz-verde' : 'text-white/35'}`}>{p.abertos} de {p.total} portões</p>
                    </div>
                    <div className="mt-1.5 grid grid-cols-3 gap-1">
                      {p.portoes.map((g) => (
                        <div key={g.id} className="rounded-md border border-white/10 px-2 py-1">
                          <p className={`text-[10px] font-bold ${g.aberto ? 'text-white' : 'text-white/55'}`}>{g.aberto ? '✓' : '○'} {g.titulo}</p>
                          <p className="text-[10px] text-white/35 tabular-nums">{g.valor} / {g.alvo}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 📊 o Score Executivo e a escada de ascensão */}
                  <ScoreEscada
                    fracoes={fracoesDoScore({ progresso: metasInfo.progresso, entregaveis: entregaveisDaPessoa, tarefasCiclo, pessoaId: pessoaFixo, hojeISO: hoje, cicloInicio: diasCiclo[0] || null })}
                    niveis={niveisDe(pessoaFixo)} portoesAbertos={p.abertos} emFormacao={tarefasCiclo.some((t) => t.user_id === pessoaFixo && (t.categoria || '') === 'mentoria')}
                  />
                </>);
              })()}

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
                    {(() => { const m = mentalidadeDe(funcaoTrabalho(pessoaFixo)?.mentalidade || mentalidadePadrao(base.cargo)); return (
                      <p className="mt-1 text-[10px] text-white/35">{m?.nome}: a trilha dela hoje — {m?.lema.toLowerCase()}.</p>
                    ); })()}
                  </div>
                );
              })()}

              {proximos.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold tracking-[0.22em] text-white/40 uppercase">Distribuído de hoje em diante</p>
                  <ul className="mt-1 space-y-0.5 text-[11px]" data-teste="proximos">
                    {proximos.map((d) => {
                      const doDia = tarefasCiclo.filter((t) => t.user_id === pessoaFixo && String(t.data).slice(0, 10) === d);
                      const dist = distribuirDia({ fixoMes: fixoDoParticipante(base), pesoReferencia: pesoReferenciaDe(base), tarefas: doDia.filter(ehProducao) });
                      return (
                        <li key={d} className="flex items-center gap-2 text-white/60">
                          <span className="w-24 shrink-0">{fmtDia(d)}</span>
                          <span className="truncate">{doDia.length} tarefa{doDia.length === 1 ? '' : 's'}{dist.pesoFalta ? ` · falta peso ${dist.pesoFalta}` : ''}</span>
                          <span className="ml-auto tabular-nums text-white/80">{fmtReais(dist.pago)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              </div>
              {abaModal === 'metas' && <AbaMetas pessoaId={pessoaFixo} nome={nomeDe(pessoaFixo)} funcaoId={funcaoTrabalho(pessoaFixo)?.id} mes={mesDe(hoje)} criadoPorId={currentUser?.id} metasInfo={metasInfo} />}
              {abaModal === 'programa' && <AbaPrograma pessoaId={pessoaFixo} nome={nomeDe(pessoaFixo)} mentalidade={funcaoTrabalho(pessoaFixo)?.mentalidade || mentalidadePadrao(base.cargo)} hoje={hoje} criadoPorId={currentUser?.id} />}
              {abaModal === 'semana' && <AbaSemana pessoaId={pessoaFixo} tarefasCiclo={tarefasCiclo} hoje={hoje} participante={base} />}
              {abaModal === 'quadro' && <AbaQuadro pessoaId={pessoaFixo} hoje={hoje} responsavelNome={nomeDe(currentUser?.id)} />}
              {abaModal === 'historico' && <AbaHistorico pessoaId={pessoaFixo} tarefasCiclo={tarefasCiclo} />}
              {abaModal === 'comprovacoes' && <ComprovacoesPainel pessoaId={pessoaFixo} nomeDe={nomeDe} compacto />}
              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={() => { setPessoa(pessoaFixo); setModalAberto(false); }} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 text-[11px]">
                  <Send className="w-3.5 h-3.5 mr-1" /> distribuir tarefa pra {nomeDe(pessoaFixo).split(' ')[0]}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* enquanto o Quadro Geral está aberto, o resto sai da frente */}
      <div hidden={modalAberto && !!pessoaFixo}>
      {/* ── ⏰ A FILA DO PRONTO — o enviar-e-voltar ─────────────────────── */}
      {(() => {
        const fila = filaDoPronto(tarefasCiclo).filter((f) => f.estado.id !== 'conferida');
        const conferidas = filaDoPronto(tarefasCiclo).filter((f) => f.estado.id === 'conferida').length;
        const COR = { atrasada: 'border-red-400/40 text-red-200', pronto: 'border-nz-verde/50 text-nz-verde', devolvida: 'border-amber-400/40 text-amber-200', aguardando: 'border-white/15 text-white/50' };
        return (
          <div className="rounded-xl border border-white/15 p-3 sm:p-4" style={{ background: 'rgba(255,255,255,0.04)' }} data-teste="fila-pronto">
            <div className="flex items-center gap-2 flex-wrap">
              <AlarmClock className="w-4 h-4 text-nz-verde" />
              <p className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">A fila do pronto</p>
              <span className="text-[10px] text-white/35">· {fila.length} pra olhar · {conferidas} conferida{conferidas === 1 ? '' : 's'} no ciclo</span>
            </div>
            {fila.length === 0 ? (
              <p className="mt-2 text-[11px] text-white/35">Nada esperando: toda tarefa distribuída está conferida — ou ainda não distribuiu nenhuma.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {fila.map(({ tarefa: t, estado }) => (
                  <li key={t.id} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px]" style={{ background: 'rgba(255,255,255,0.02)' }} data-teste="pronto-item" data-estado={estado.id}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${COR[estado.id] || ''}`}>{estado.rotulo}</span>
                      <span className="font-bold text-white/85 truncate">{nomeDe(t.user_id)}</span>
                      <span className="text-white/70 truncate">{t.titulo}</span>
                      <span className="text-white/40 shrink-0">{fmtDia(String(t.data).slice(0, 10))}{t.prazo_em ? ` · ${rotuloDoPrazo(t.prazo_em, String(t.data).slice(0, 10))}` : ''}</span>
                      {estado.id === 'pronto' && (
                        <span className="ml-auto flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => conferir(t)} className="inline-flex items-center gap-1 rounded-full bg-nz-verde/20 hover:bg-nz-verde/35 px-2 py-0.5 text-nz-verde font-bold" data-teste="conferir"><CheckCheck className="w-3 h-3" /> conferir</button>
                          <button type="button" onClick={() => setDevolvendo({ id: t.id, motivo: '' })} className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 hover:bg-amber-400/30 px-2 py-0.5 text-amber-200 font-bold" data-teste="devolver"><Undo2 className="w-3 h-3" /> devolver</button>
                        </span>
                      )}
                      {estado.id === 'devolvida' && <span className="ml-auto text-amber-200/80 truncate">↩ "{t.devolvida_motivo}"</span>}
                    </div>
                    {devolvendo?.id === t.id && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap" data-teste="devolver-recado">
                        <Input autoFocus value={devolvendo.motivo} onChange={(e) => setDevolvendo((d) => ({ ...d, motivo: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') devolver(t, devolvendo.motivo); }} placeholder="o recado: o que faltou pra valer o pronto" className="h-8 flex-1 min-w-[200px] border-white/15 bg-white/[0.06] text-white placeholder:text-white/30 text-[11px]" data-teste="recado" />
                        <Button size="sm" onClick={() => devolver(t, devolvendo.motivo)} className="bg-amber-400 hover:bg-amber-300 text-amber-950 h-8 text-[11px] font-extrabold" data-teste="devolver-confirmar">devolver com o recado</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDevolvendo(null)} className="h-8 text-[11px] text-white/50">cancelar</Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })()}

      {/* ── 📸 AS COMPROVAÇÕES, em cima (dono: "têm que subir") ──────────── */}
      <div className="rounded-xl border border-white/15 p-3 sm:p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <ComprovacoesPainel nomeDe={nomeDe} />
      </div>

      {/* ── 2. 💰 O FIXO DE CADA UM — menu suspenso, e o modal da pessoa ── */}
      {equipe.length > 0 && (
        <div className="rounded-xl border border-white/15 p-3 sm:p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-nz-verde" />
            <p className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">Quadro Geral de cada um</p>
            <span className="text-[10px] text-white/35">· ciclo de {fmtDia(diasCiclo[0])} a {fmtDia(diasCiclo[diasCiclo.length - 1])}</span>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <select
              value={pessoaFixo}
              onChange={(e) => { setPessoaFixo(e.target.value); setAbaModal('pessoa'); if (e.target.value) setModalAberto(true); }}
              className={`${campo} min-w-[240px]`}
              data-teste="pessoa-fixo"
            >
              <option value="">escolha a pessoa…</option>
              {equipe.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} · {p.funcao}{funcaoTrabalho(p.id) && (funcaoTrabalho(p.id).curto || funcaoTrabalho(p.id).nome) !== p.funcao ? ` · ${funcaoTrabalho(p.id).curto || funcaoTrabalho(p.id).nome}` : ''}{participanteDe(p.id).empresa ? ` · ${rotuloDaEmpresa(participanteDe(p.id).empresa, participanteDe(p.id).empresa_via)}` : ''}{participanteDe(p.id).temFixo ? '' : ' · sem fixo'}</option>
              ))}
            </select>
            <Button size="sm" onClick={() => { if (pessoaFixo) setModalAberto(true); }} disabled={!pessoaFixo} className="bg-white/10 hover:bg-white/20 text-white h-8 text-[11px]" data-teste="abrir-pessoa">
              <UserRound className="w-3.5 h-3.5 mr-1" /> abrir
            </Button>
            <span className="text-[10px] text-white/35">função, valores, metas, programa, semana, quadro e histórico · {equipe.length} no time corporativo · {equipe.filter((p) => participanteDe(p.id).temFixo).length} com fixo definido</span>
          </div>
        </div>
      )}


      </div>
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
          <span className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">Ciclo, verbas e participantes</span>
          {/* 🖼️ dono: "não está claro" — quem vota no MvM aparece aqui MESMO
              fechado, sem precisar abrir pra descobrir */}
          {participantes.length > 0 && (
            <span className="flex items-center -space-x-1.5" title={`${participantes.length} votando no MvM: ${participantes.map((p) => nomeDe(p.user_id)).join(', ')}`}>
              {participantes.slice(0, 6).map((p) => {
                const u = usuarios.find((x) => x.id === p.user_id);
                const foto = u?.profile_photo_url || u?.avatar_url;
                const cor = u?.avatar_color || 'linear-gradient(135deg, #10b981, #f59e0b)';
                return (
                  <span key={p.id} className="w-5 h-5 rounded-full ring-2 ring-[#0b0d14] flex items-center justify-center overflow-hidden text-[8px] font-bold text-white" style={{ background: foto ? 'transparent' : cor }}>
                    {foto ? <img src={foto} alt="" className="w-full h-full object-cover" /> : (u ? nomeDe(u.id) : '?').slice(0, 1)}
                  </span>
                );
              })}
              {participantes.length > 6 && <span className="w-5 h-5 rounded-full ring-2 ring-[#0b0d14] bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/70">+{participantes.length - 6}</span>}
            </span>
          )}
          <span className="text-[10px] text-white/35">· {participantes.length} votando no MvM · o admin do X-GAME de sempre</span>
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
