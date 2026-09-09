import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Plus, GraduationCap, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { fmtReais, pesoAutomatico, porqueDoPeso, categoriaDaTarefa, validacaoAutomatica, nomeExibicao, VOTACAO_INICIO_MIN, VOTACAO_FIM_MIN, horaDeMin, VIRTUDES, podeSerVotado, votouEmTodosOsColegas, mvmManual, dataISO } from '@/lib/xgame';
import { normalizeLevels, getLevel } from '@/lib/careerLevels';
import { isAdminRole } from '@/lib/roles';
import { ROTINA_PADRAO, gerarTarefasDaRotina } from '@/lib/metodo';
import { comprovacaoBateNaBusca, agruparComprovacoesPorData, rotuloDataComprovacao } from '@/lib/filaComprovacoes';

// 🛠️ X-GAME — ADMIN DA GAMIFICAÇÃO (só o super admin chega aqui; o gate é
// feito pelo painel Admin do Licensing). É AQUI que o dono do jogo decide:
//   • quem participa (os integrantes da egrégora/mentoria);
//   • quanto cada um recebe (as verbas do X-Pay: produção, bônus e venda);
//   • quais são as tarefas da gamificação de cada pessoa (categoria + peso);
//   • quando o ciclo oficial de 22 dias úteis começa;
//   • a conferência dupla — o "SIM" do gestor tarefa a tarefa.
// A votação do MvM (1 a 10 nas 10 Virtudes, 17h–21h30 — radical se não
// fechar em todos) acontece entre os participantes ATIVOS cadastrados
// aqui — quem está fora não vota nem recebe voto.

// Multas de atraso do FAQ da planilha: Trainee R$50 · Executivo R$200 · Diretor R$500.
const MULTA_POR_CARGO = { trainee: 50, executivo: 200, diretor: 500, ceo: 500 };
// SEM [VENDA] aqui de propósito: a venda da loja da pessoa já remunera pelo
// sistema de comissões da plataforma — a gamificação não paga venda de novo.
const CATEGORIAS = [
  ['producao', '[PRODUÇÃO]'], ['bonus', '[BÔNUS]'],
  ['mentoria', '[MENTORIA]'], ['visao', '[VISÃO ESTRATÉGICA]'],
];
// 🚫 09/09/2026 — DIR-122, dono, direto: "faz o que precisa ser feito, a
// pessoal com certeza" — depois disso, preocupado com o próprio jogo:
// "mas ele não pode ganhar duas vezes... eu só escolhi uma conta." A conta
// duplicada de Joao Vitor Paim Pereira (e-mail auto-gerado, sem atividade
// nenhuma) foi unificada com a pessoal dele direto no banco — mas o LOGIN
// duplicado continua existindo (serve pra outra coisa, o "concurso"), então
// ainda aparecia como candidato pra "adicionar participante", pronto pra
// alguém recriar a mesma confusão sem querer. Nunca mais aparece na lista.
const IDS_DUPLICADOS_FORA_DO_XGAME = new Set(['e90ed56209c71d4bf4dd3bc3']);

// 🐛 09/09/2026 — mesmo bug de fuso do CrmMetodo.jsx: toISOString() usa UTC,
// e no Brasil (UTC-3) o dia vira 3h antes da meia-noite local (a partir das
// 21h) — bem no fim da janela de votação. O raio-x "quem votou hoje" olhava
// a data errada depois das 21h e achava todo mundo sem voto. dataISO() usa
// data local de verdade.
const hojeStr = () => dataISO();

// ── Busca de pessoas por categoria do plano de carreira ─────────────
// Time Corporativo = o bloco diretor inteiro (do trainee/executivo até
// embaixador, conselheiro e fundador) + admins. Quem é corporativo NÃO
// repete nos licenciados. Depois: Licenciados, Vendedores/Influenciadores
// e por fim os Usuários comuns.
const BLOCO_DIRETOR = new Set(['trainee_diretor', 'executivo_conta', 'diretoria_operacao', 'diretoria_executiva', 'ceo', 'livoo_live', 'embaixador', 'conselheiro', 'fundador']);
const NIVEIS_LICENCIADO = new Set(['licenciado', 'parceiro', 'ponto_retirada', 'loja_fisica', 'distribuidor']);
const NIVEIS_VENDEDOR = new Set(['vendedor', 'influenciador']);
const GRUPOS_BUSCA = [
  ['corporativo', '👔 Time Corporativo'],
  ['licenciados', '🎖️ Licenciados'],
  ['vendedores', '🛒 Vendedores & Influenciadores'],
  ['usuarios', '👤 Usuários'],
];
// filtro do "Colocar no jogo" — "Todos" primeiro pra achar QUALQUER pessoa
// (corporativa OU usuário comum) sem precisar adivinhar a categoria antes;
// as pílulas são só um atalho de recorte, não uma pasta obrigatória.
const FILTROS_CANDIDATOS = [['todos', '✨ Todos'], ...GRUPOS_BUSCA];
const ROTULO_GRUPO = Object.fromEntries(GRUPOS_BUSCA);

function getIniciais(nome = '') {
  return nome.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?';
}

// 🖼️ "esse logo" — o dono pediu foto/avatar pra ficar óbvio QUEM está sendo
// adicionado/votado, não só o nome. Mesma régua de fallback do menu do
// usuário (foto → cor + iniciais), só que em miniatura.
function AvatarPessoa({ u, tamanho = 28 }) {
  const foto = u?.profile_photo_url || u?.avatar_url;
  const cor = u?.avatar_color || 'linear-gradient(135deg, #10b981, #f59e0b)';
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 overflow-hidden"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.36, background: foto ? 'transparent' : cor }}
    >
      {foto ? <img src={foto} alt="" className="w-full h-full object-cover" /> : getIniciais(u ? nomeExibicao(u) : '')}
    </span>
  );
}
function grupoDoUsuario(u) {
  const cargos = normalizeLevels(u?.career_levels);
  if (isAdminRole(u?.role) || cargos.some((c) => BLOCO_DIRETOR.has(c))) return 'corporativo';
  if (u?.role === 'licensee' || cargos.some((c) => NIVEIS_LICENCIADO.has(c))) return 'licenciados';
  if (cargos.some((c) => NIVEIS_VENDEDOR.has(c))) return 'vendedores';
  return 'usuarios';
}
function cargoLabel(u) {
  const cargos = normalizeLevels(u?.career_levels);
  if (!cargos.length) return u?.role === 'licensee' ? 'Licenciado' : '';
  return cargos.map(getLevel).sort((a, b) => b.ordem - a.ordem)[0]?.name || '';
}
// "lu" acha Luciano, Lúcia, LUIZ... — sem sofrer com acento nem maiúscula.
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const DICAS = {
  ciclo: 'O jogo roda em ciclos de 22 dias úteis. A cotação do dia começa em 1,00 e cai 0,01 por dia útil até 0,80 no dia 22 — "ANTECIPAÇÃO É PODER". Sem data aberta aqui, o app usa o 1º dia útil do mês.',
  verba_producao: 'Verba mensal de PRODUÇÃO — usada como fixo quando a pessoa não tem "fixo mensal" definido na gestão do X-Performance. A conta: fixo ÷ 24 dias de operação = valor do dia; dentro do dia o PESO reparte o valor (a soma das tarefas é sempre o dia inteiro); dia com menos tarefas que o mínimo paga proporcional.',
  verba_bonus: 'Verba mensal de BÔNUS/ESTUDO (leitura, cursos). Mesma régua, só entre as tarefas de bônus do dia.',
  perfil: 'O perfil muda os pesos do Human Token (teto 22,22 pros dois): estratégico/operacional — MvM 6,67 (30%, PORTÃO de caráter) + produção 6,67 + real time 3,33 + bônus/estudo 2,22 + PT VENDA 3,33; comercial — MvM 10 + produção 1,36 + real time 3,33 + bônus/estudo 5,03 + PT VENDA 2,5 (vendas valem bem mais). "Recrutamos caráter e treinamos habilidade": MvM da votação abaixo de 7 trava tudo em Bronze; abaixo de 8, sem Platina — mesmo com pontuação de sobra. Vendas só abre a Platina batendo 100% da meta do ciclo. Sem estudo em dia (semana ou fim de semana), o ciclo trava em 19,99 — só o topo (Platina), Ouro continua alcançável via produção/MvM/vendas.',
  cargo: 'O cargo define a multa de atraso do FAQ: Trainee R$50, Executivo R$200, Diretor R$500.',
  mentoria: 'Está participando do Programa da Mentoria (8 Hábitos, set/2026 a mar/2027)? Independente de estar ATIVO no MvM — dá pra votar sem estar na mentoria, e vice-versa.',
  recebeVoto: 'Ela aparece na lista de colegas votáveis da MvM? Desligado só tira ela de RECEBER voto — ela continua podendo VOTAR nos outros se quiser, continua ATIVA no jogo e continua recebendo o fixo gamificado normalmente. Pra quem já passou pela mentoria mas não deve receber avaliação dos colegas.',
  peso: 'Peso 1 a 6 da tarefa (padrão 3). Tarefa mais pesada vale mais dinheiro no X-Pay do dia.',
  categoria: 'A categoria decide de qual verba a tarefa paga: [PRODUÇÃO] e [MENTORIA]/[VISÃO] saem da verba de produção; [BÔNUS] da verba de bônus. Venda NÃO entra aqui — a venda da loja já remunera pelas comissões da plataforma.',
  conferencia: 'Conferência dupla da planilha: a pessoa marca a tarefa (o checkbox dela) e o gestor confirma o SIM aqui. Sem o SIM, a tarefa fica pendente de conferência.',
  validacao: 'Validação automática (F10): a tarefa só conclui com a comprovação — 📸 link do post/story do Instagram DO DIA, ou 📚 escrever o principal aprendizado da leitura. "Automática" deixa o sistema deduzir pelo título; "nenhuma" conclui direto. Vendas e reuniões validam sozinhas pelos dados do sistema.',
};

export default function XGameAdmin({ onVerComo } = {}) {
  const [participantes, setParticipantes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  // 🎯 08/09/2026 — dono: "nem todo mundo que está no topo, no grupo
  // corporativo, está na gamificação — preciso selecionar as pessoas que
  // vão ser votadas." Cadastrar um por um não dava pra escolher o time
  // corporativo inteiro de uma vez; agora marca vários e cadastra juntos.
  const [selecionados, setSelecionados] = useState([]);
  const alternarSelecionado = (id) => setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const [busca, setBusca] = useState('');
  // filtro do "Colocar no jogo" (pílula ativa) + um participante aberto por
  // vez (abrir um fecha o outro) — pra página não ficar quilométrica
  const [filtroCandidato, setFiltroCandidato] = useState('todos');
  const [participanteAberto, setParticipanteAberto] = useState(null);
  const [cicloInicio, setCicloInicio] = useState('');
  const [salvando, setSalvando] = useState(false);
  // tarefas da gamificação da pessoa (categoria/peso/conferência)
  const [tarefaUser, setTarefaUser] = useState('');
  const [tarefaDia, setTarefaDia] = useState(hojeStr());
  const [tarefas, setTarefas] = useState([]);
  const [novaTarefa, setNovaTarefa] = useState({ hora: '', titulo: '', categoria: 'producao', peso: 3 });

  const carregar = useCallback(() => {
    supabase.from('xgame_participantes').select('*').order('created_date')
      .then(({ data }) => setParticipantes(data || []));
    supabase.from('app_users').select('id,full_name,nickname,role,career_levels,profile_photo_url,avatar_url,avatar_color').order('full_name')
      .then(({ data }) => setUsuarios(data || []));
    supabase.from('xgame_config').select('ciclo_inicio').eq('id', 'atual').maybeSingle()
      .then(({ data }) => setCicloInicio(data?.ciclo_inicio ? String(data.ciclo_inicio).slice(0, 10) : ''));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // 🗳️ 08/09/2026 — dono: "quero ver se todo mundo votou... eu estou às
  // cegas." Um raio-x de quem já fechou a MvM de hoje em TODOS os colegas
  // votáveis, sem precisar abrir card por card ou entrar no painel de
  // ninguém — a mesma régua de xgame.js (votouEmTodosOsColegas), lida aqui
  // pra todo mundo de uma vez.
  const [votosHojeTodos, setVotosHojeTodos] = useState([]);
  useEffect(() => {
    supabase.from('xgame_votos_mvm').select('votante_id,votado_id,virtude').eq('data', hojeStr())
      .then(({ data }) => setVotosHojeTodos(data || []));
  }, []);
  // 🗳️ 08/09/2026 — dono: "eu também quero ver como as pessoas votaram."
  // O raio-x acima só mostra SE a pessoa votou (✅/⏳) — não mostra a NOTA
  // que ela deu nem a que recebeu. Isto traz a nota de verdade (1 a 10),
  // a mesma conta de mvmManual usada no Human Token oficial.
  const [votosCicloRecebidos, setVotosCicloRecebidos] = useState([]);
  useEffect(() => {
    if (!cicloInicio) return;
    supabase.from('xgame_votos_mvm').select('votado_id,virtude,nota').gte('data', cicloInicio)
      .then(({ data }) => setVotosCicloRecebidos(data || []));
  }, [cicloInicio]);
  const mvmCicloDe = useCallback((userId) => {
    const votos = votosCicloRecebidos.filter((v) => v.votado_id === userId);
    return votos.length ? mvmManual(votos).media : null;
  }, [votosCicloRecebidos]);
  const colegasVotaveisIds = useMemo(() => participantes.filter((p) => p.ativo)
    .filter((p) => podeSerVotado({ role: usuarios.find((x) => x.id === p.user_id)?.role, aceita_ser_votado: p.aceita_ser_votado }))
    .map((p) => p.user_id), [participantes, usuarios]);
  const statusVotoDe = useCallback((userId) => {
    const colegas = colegasVotaveisIds.filter((id) => id !== userId);
    const porColega = {};
    votosHojeTodos.filter((v) => v.votante_id === userId).forEach((v) => { (porColega[v.votado_id] ||= new Set()).add(v.virtude); });
    const completos = colegas.filter((id) => (porColega[id]?.size || 0) >= VIRTUDES.length);
    return { total: colegas.length, feitos: completos.length, completo: votouEmTodosOsColegas(colegas, completos) };
  }, [colegasVotaveisIds, votosHojeTodos]);

  const nomeDe = (id) => {
    const u = usuarios.find((x) => x.id === id);
    return u ? nomeExibicao(u) : (id ? id.slice(0, 6) : '—');
  };

  // candidatos livres (corporativo OU usuário comum, junto) + filtro do nome
  // e da pílula de categoria — "Todos" é o padrão pra achar QUALQUER pessoa
  // sem ter que adivinhar a caixinha dela antes
  const candidatos = useMemo(() => {
    const q = semAcento(busca.trim());
    const livres = usuarios.filter((u) => !participantes.some((p) => p.user_id === u.id) && !IDS_DUPLICADOS_FORA_DO_XGAME.has(u.id));
    const porNome = q
      ? livres.filter((u) => semAcento(u.nickname).includes(q) || semAcento(u.full_name).includes(q))
      : livres;
    const filtrados = filtroCandidato === 'todos' ? porNome : porNome.filter((u) => grupoDoUsuario(u) === filtroCandidato);
    return filtrados.sort((a, b) => nomeExibicao(a).localeCompare(nomeExibicao(b)));
  }, [usuarios, participantes, busca, filtroCandidato]);
  const contagemPorGrupo = useMemo(() => {
    const q = semAcento(busca.trim());
    const livres = usuarios.filter((u) => !participantes.some((p) => p.user_id === u.id) && !IDS_DUPLICADOS_FORA_DO_XGAME.has(u.id));
    const porNome = q ? livres.filter((u) => semAcento(u.nickname).includes(q) || semAcento(u.full_name).includes(q)) : livres;
    const por = { todos: porNome.length, corporativo: 0, licenciados: 0, vendedores: 0, usuarios: 0 };
    porNome.forEach((u) => { por[grupoDoUsuario(u)] += 1; });
    return por;
  }, [usuarios, participantes, busca]);

  const abrirCiclo = async () => {
    if (!cicloInicio) { toast.error('Escolha a data de início do ciclo.'); return; }
    setSalvando(true);
    const { error } = await supabase.from('xgame_config')
      .upsert({ id: 'atual', ciclo_inicio: cicloInicio, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    setSalvando(false);
    if (error) { toast.error('Erro ao abrir o ciclo.'); return; }
    toast.success('Ciclo X-GAME aberto!');
  };

  // 🎯 um toque marca, "Cadastrar N" grava todos de uma vez — dono pediu as
  // DUAS coisas: fluidez pra achar QUALQUER pessoa (corporativo OU usuário
  // comum, "não está fluido... eu preciso selecionar o time corporativo mas
  // também preciso selecionar o usuário") E marcar vários de uma vez ("nem
  // todo mundo que está no topo, no grupo corporativo, está na
  // gamificação — preciso selecionar as pessoas que vão ser votadas").
  const adicionar = async (ids) => {
    const lista = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    if (!lista.length) return;
    setSalvando(true);
    const linhas = lista.map((user_id) => ({ user_id, ativo: true, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('xgame_participantes').upsert(linhas, { onConflict: 'user_id' });
    setSalvando(false);
    if (error) { toast.error('Erro ao cadastrar participante(s).'); return; }
    toast.success(lista.length > 1 ? `${lista.length} pessoas no jogo — já votam e recebem voto no MvM!` : `${nomeDe(lista[0])} no jogo — já vota e recebe voto no MvM!`);
    setSelecionados((prev) => prev.filter((id) => !lista.includes(id)));
    setBusca('');
    carregar();
  };

  const salvarParticipante = async (p, patch) => {
    const { error } = await supabase.from('xgame_participantes')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', p.id);
    if (error) { toast.error('Erro ao salvar.'); return; }
    setParticipantes((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
  };

  const carregarTarefas = useCallback(async (userId, dia) => {
    if (!userId || !dia) { setTarefas([]); return; }
    const { data } = await supabase.from('metodo_tarefas')
      .select('id,hora,titulo,feito,conferido,categoria,peso,ordem,validacao,comprovacao')
      .eq('user_id', userId).eq('data', dia).order('hora');
    setTarefas(data || []);
  }, []);
  useEffect(() => { carregarTarefas(tarefaUser, tarefaDia); }, [tarefaUser, tarefaDia, carregarTarefas]);

  const salvarTarefa = async (t, patch) => {
    const { error } = await supabase.from('metodo_tarefas').update(patch).eq('id', t.id);
    if (error) { toast.error('Erro ao salvar a tarefa.'); return; }
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
  };

  // 🪄 F6 — aplica o peso automático (regra do dono) em todas as tarefas do dia
  const aplicarPesosAutomaticos = async () => {
    const mudar = tarefas.filter((t) => (t.peso ?? 3) !== pesoAutomatico(t.titulo));
    if (!mudar.length) { toast.success('Os pesos já estão no automático!'); return; }
    setSalvando(true);
    const resultados = await Promise.all(mudar.map((t) =>
      supabase.from('metodo_tarefas').update({ peso: pesoAutomatico(t.titulo) }).eq('id', t.id)
    ));
    setSalvando(false);
    if (resultados.some((r) => r.error)) { toast.error('Erro ao aplicar os pesos — tente de novo.'); return; }
    toast.success(`🪄 Pesos automáticos aplicados em ${mudar.length} tarefa${mudar.length > 1 ? 's' : ''}!`);
    setTarefas((prev) => prev.map((t) => ({ ...t, peso: pesoAutomatico(t.titulo) })));
  };

  // 🖼️ F10.2 — A FILA DE COMPROVAÇÕES: pra onde vão as imagens. A IA aprova
  // sozinha; o gestor só entra na DÚVIDA (segunda análise) — e pode reprovar,
  // o que desfaz o feito e derruba os pontos.
  const [abaAdmin, setAbaAdmin] = useState('participantes');
  const [comprovacoes, setComprovacoes] = useState([]);
  const [filtroComp, setFiltroComp] = useState('em_analise');
  // 🔎 09/09/2026 — dono, olhando a fila crescer: "eu preciso separar por
  // data... data de comprovação, nome das pessoas, pra ficar mais fácil...
  // ainda precisa ter uma busca, quando eu fizer buscar mais rápido, tanto
  // a data e tanto o dia." Uma busca só (nome OU data, ex.: "09/09" ou
  // "luciano") + a fila agrupada por dia, cada dia com seu próprio
  // cabeçalho — em vez de uma lista corrida que só o texto de cada linha
  // já dizia a data.
  const [buscaComp, setBuscaComp] = useState('');
  const [iaLigada, setIaLigada] = useState(null);
  const [iaDetalhe, setIaDetalhe] = useState(''); // modelo, ou o erro real do gateway quando cai
  const [reprovando, setReprovando] = useState(null); // { id, motivo }
  const statusDaComp = (c) => c?.status || (c?.valido ? 'aprovada_ia' : 'reprovada');
  const carregarComprovacoes = useCallback(() => {
    supabase.from('metodo_tarefas')
      .select('id,user_id,data,hora,titulo,feito,comprovacao')
      .not('comprovacao', 'is', null)
      .order('data', { ascending: false }).limit(150)
      .then(({ data }) => setComprovacoes(data || []));
    // 🩺 DIR-84.1 — `?ping=1` faz o modelo RESPONDER de verdade; "tem chave"
    // sozinho mentia "IA ligada" enquanto toda comprovação caía em indisponível.
    fetch('/api/functions/xgameValidarPrint?ping=1')
      .then((r) => r.json())
      .then((j) => { setIaLigada(!!j?.ia); setIaDetalhe(j?.ping && !j.ping.ok ? `${j.model} (${j.via || '?'}) → HTTP ${j.ping.status}${j.ping.corpo ? `: ${String(j.ping.corpo).slice(0, 320)}` : ''}` : `${j?.model || ''}${j?.via ? ` · via ${j.via}` : ''}`); })
      .catch(() => { setIaLigada(false); setIaDetalhe('a função de validação não respondeu'); });
  }, []);
  useEffect(() => { carregarComprovacoes(); }, [carregarComprovacoes]);
  const aprovarComp = async (t) => {
    const comprovacao = { ...t.comprovacao, status: 'aprovada_manual', valido: true };
    const { error } = await supabase.from('metodo_tarefas').update({ comprovacao, feito: true }).eq('id', t.id);
    if (error) { toast.error('Erro ao aprovar.'); return; }
    toast.success('Comprovação aprovada ✔');
    setComprovacoes((prev) => prev.map((x) => (x.id === t.id ? { ...x, comprovacao, feito: true } : x)));
  };
  const reprovarComp = async (t) => {
    const comprovacao = {
      ...t.comprovacao, status: 'reprovada', valido: false,
      motivo_gestor: (reprovando?.motivo || '').trim() || 'reprovada pelo gestor na segunda análise',
    };
    const { error } = await supabase.from('metodo_tarefas').update({ comprovacao, feito: false }).eq('id', t.id);
    if (error) { toast.error('Erro ao reprovar.'); return; }
    toast.success('Reprovada — a tarefa voltou a ficar pendente pra pessoa.');
    setReprovando(null);
    setComprovacoes((prev) => prev.map((x) => (x.id === t.id ? { ...x, comprovacao, feito: false } : x)));
  };
  // 🚨 radar + 🎖️ selo confiável, por pessoa (derivados da própria fila)
  const radarPorPessoa = useMemo(() => {
    const por = {};
    comprovacoes.forEach((t) => {
      const r = por[t.user_id] || (por[t.user_id] = { reprovadas: 0, analise: 0, aprovadas: 0 });
      const s = statusDaComp(t.comprovacao);
      if (s === 'reprovada') r.reprovadas += 1;
      else if (s === 'em_analise') r.analise += 1;
      else r.aprovadas += 1;
    });
    return por;
  }, [comprovacoes]);

  // excluir em 2 cliques (padrão DIR-50 do CRM): o 1º arma, o 2º confirma
  const [excluindo, setExcluindo] = useState(null);
  const excluirTarefa = async (t) => {
    if (excluindo !== t.id) { setExcluindo(t.id); return; }
    setExcluindo(null);
    const { error } = await supabase.from('metodo_tarefas').delete().eq('id', t.id);
    if (error) { toast.error('Erro ao excluir a tarefa.'); return; }
    toast.success('Tarefa excluída.');
    setTarefas((prev) => prev.filter((x) => x.id !== t.id));
  };

  // ⚡ A Rotina Perfeita AUTOMÁTICA — a mesma do Compromisso: puxa a rotina
  // da pessoa (metodo_perfil) ou a Rotina do Método padrão e gera o dia dela.
  const gerarRotinaPerfeita = async () => {
    if (!tarefaUser) return;
    setSalvando(true);
    try {
      const { data: perfil } = await supabase.from('metodo_perfil')
        .select('rotina').eq('user_id', tarefaUser).maybeSingle();
      const rotina = Array.isArray(perfil?.rotina) && perfil.rotina.length ? perfil.rotina : ROTINA_PADRAO;
      // já nasce com peso automático (regra do dono) e categoria deduzida
      const linhas = gerarTarefasDaRotina(rotina, tarefaUser, tarefaDia).map((l) => ({
        ...l, peso: pesoAutomatico(l.titulo), categoria: categoriaDaTarefa({ titulo: l.titulo }),
      }));
      // 🐛 09/09/2026 — DIR-127: ignora duplicata em vez de criar (ou quebrar
      // tentando) — a trava real é o UNIQUE(user_id,data,hora,titulo) do banco.
      const { error } = await supabase.from('metodo_tarefas')
        .upsert(linhas, { onConflict: 'user_id,data,hora,titulo', ignoreDuplicates: true });
      if (error) throw error;
      toast.success(`Dia gerado com ${linhas.length} tarefas da Rotina Perfeita!`);
      carregarTarefas(tarefaUser, tarefaDia);
    } catch (e) {
      console.error('[X-GAME] gerar rotina:', e);
      toast.error('Erro ao gerar a Rotina Perfeita — tente de novo.');
    } finally { setSalvando(false); }
  };

  const criarTarefa = async () => {
    if (!tarefaUser || !novaTarefa.titulo.trim() || !novaTarefa.hora) {
      toast.error('Preencha hora e título da tarefa.'); return;
    }
    setSalvando(true);
    const { error } = await supabase.from('metodo_tarefas').insert({
      user_id: tarefaUser, data: tarefaDia, hora: novaTarefa.hora,
      titulo: novaTarefa.titulo.trim(), feito: false, ordem: tarefas.length,
      categoria: novaTarefa.categoria, peso: Number(novaTarefa.peso) || 3,
    });
    setSalvando(false);
    if (error) { toast.error('Erro ao criar a tarefa.'); return; }
    toast.success('Tarefa da gamificação criada!');
    setNovaTarefa({ hora: '', titulo: '', categoria: 'producao', peso: 3 });
    carregarTarefas(tarefaUser, tarefaDia);
  };

  const pendentesAnalise = comprovacoes.filter((t) => statusDaComp(t.comprovacao) === 'em_analise').length;
  const compFiltradas = useMemo(() => comprovacoes.filter((t) => {
    if (filtroComp !== 'todas' && statusDaComp(t.comprovacao) !== filtroComp) return false;
    return comprovacaoBateNaBusca(t, nomeDe(t.user_id), buscaComp);
  }), [comprovacoes, filtroComp, buscaComp, usuarios]);
  // 📅 agrupada por dia — a fila vem do banco já em ORDER BY data DESC
  // (carregarComprovacoes); `agruparComprovacoesPorData` só junta quem tem
  // a mesma data, nunca reordena por conta própria (lógica pura, testada
  // em tests/filaComprovacoes.test.mjs).
  const compPorData = useMemo(() => agruparComprovacoesPorData(compFiltradas), [compFiltradas]);

  return (
    <div className="space-y-4 text-sm">
      {/* abas do admin: participantes × a fila de comprovações */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        {[['participantes', '👥 Participantes'], ['comprovacoes', `🖼️ Comprovações${pendentesAnalise > 0 ? ` (${pendentesAnalise} em análise)` : ''}`]].map(([v, rotulo]) => (
          <button
            key={v}
            type="button"
            onClick={() => setAbaAdmin(v)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold ${abaAdmin === v ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >{rotulo}</button>
        ))}
        <span className={`ml-auto text-[10px] font-bold ${iaLigada === null ? 'text-gray-400' : iaLigada ? 'text-emerald-600' : 'text-red-600'}`} title={iaDetalhe} data-teste="ia-status">
          {iaLigada === null ? '… conferindo a IA (chamada real ao modelo)' : iaLigada ? `🧠 IA de visão RESPONDENDO · ${iaDetalhe}` : `🚨 IA FORA DO AR — comprovações BLOQUEADAS até voltar${iaDetalhe ? ` · ${iaDetalhe}` : ''}`}
        </span>
      </div>

      {/* ══ 🖼️ A FILA DE COMPROVAÇÕES (segunda análise — humano só na dúvida) ══ */}
      {abaAdmin === 'comprovacoes' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[['em_analise', '⏳ em análise'], ['aprovada_ia', '🤖 aprovadas pela IA'], ['aprovada_manual', '👤 aprovadas pelo gestor'], ['reprovada', '🚫 reprovadas'], ['todas', 'todas']].map(([v, rotulo]) => (
              <button key={v} type="button" onClick={() => setFiltroComp(v)} className={`px-2 py-1 rounded border text-[11px] font-medium ${filtroComp === v ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-gray-300 text-gray-500 hover:border-emerald-400'}`}>
                {rotulo}
              </button>
            ))}
          </div>

          {/* 🔎 busca única — nome ("luciano") OU data ("09/09") — pra achar
              rápido sem precisar rolar a fila inteira dia por dia. */}
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="🔎 buscar por nome ou por data (ex.: “luciano” ou “09/09”)"
              value={buscaComp}
              onChange={(e) => setBuscaComp(e.target.value)}
              className="h-8 text-[11px] bg-white border-gray-300 flex-1 min-w-[220px]"
            />
            {buscaComp && (
              <button type="button" onClick={() => setBuscaComp('')} className="text-[11px] text-gray-400 hover:text-gray-600">limpar</button>
            )}
          </div>

          {/* 🚨 radar: quem acumula reprova/dúvida · 🎖️ quem só aprova de primeira */}
          {Object.keys(radarPorPessoa).length > 0 && (
            <p className="text-[11px] text-gray-600">
              {Object.entries(radarPorPessoa).map(([id, r]) => {
                if (r.reprovadas >= 3) return <span key={id} className="mr-3 font-bold text-red-600">🚨 {nomeDe(id)} ({r.reprovadas} reprovadas)</span>;
                if (r.aprovadas >= 5 && r.reprovadas === 0) return <span key={id} className="mr-3 font-bold text-emerald-700">🎖️ {nomeDe(id)} Confiável</span>;
                return null;
              })}
            </p>
          )}

          {compFiltradas.length === 0 ? (
            <p className="text-[11px] text-gray-500">{buscaComp ? 'Nada encontrado nessa busca.' : 'Nada aqui nesse filtro — quando alguém comprovar uma tarefa, a imagem chega nesta fila.'}</p>
          ) : (
            <div className="space-y-3" data-teste="comprovacoes-por-data">
              {compPorData.map(([data, itens]) => (
                <div key={data} className="space-y-1.5">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide sticky top-0 bg-gray-50 -mx-1 px-1 py-0.5" data-teste="comprovacoes-cabecalho-data">
                    📅 {rotuloDataComprovacao(data)} <span className="font-normal normal-case text-gray-400">· {itens.length} comprovaç{itens.length > 1 ? 'ões' : 'ão'}</span>
                  </p>
                  {itens.map((t) => {
                    const c = t.comprovacao || {};
                    const s = statusDaComp(c);
                    return (
                      <div key={t.id} className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                        {c.print_url ? (
                          <a href={c.print_url} target="_blank" rel="noreferrer" title="Abrir a imagem inteira">
                            <img src={c.print_url} alt="comprovação" className="w-14 h-14 rounded object-cover border border-gray-200" loading="lazy" />
                          </a>
                        ) : (
                          <span className="w-14 h-14 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-lg" title={c.entrega}>{c.tipo === 'ritual' ? '🌅' : '📚'}</span>
                        )}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="text-[11px] font-semibold text-gray-900 truncate">
                            {nomeDe(t.user_id)} · {t.hora} — {t.titulo}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {s === 'em_analise' && <span className="font-bold text-amber-600">⏳ EM ANÁLISE</span>}
                            {s === 'aprovada_ritual' && <span className="font-bold text-emerald-600">🌅 ritual do amanhecer completo</span>}
                            {s === 'aprovada_ia' && <span className="font-bold text-emerald-600">🤖 aprovada pela IA{c.veredito_ia?.confianca ? ` (${c.veredito_ia.confianca}%)` : ''}</span>}
                            {s === 'aprovada_manual' && <span className="font-bold text-emerald-700">👤 aprovada pelo gestor</span>}
                            {s === 'reprovada' && <span className="font-bold text-red-600">🚫 reprovada</span>}
                            {c.fora_da_janela && <span className="ml-2 text-amber-600 font-semibold">⏰ fora da janela de 2h</span>}
                            {c.video_url && <a href={c.video_url} target="_blank" rel="noreferrer" className="ml-2 font-bold text-emerald-700 hover:underline">🎥 ver a visualização ({c.video_seg || 0}s)</a>}
                            {/* 📝 09/09/2026 — dono: "se for vídeo, se for áudio,
                                tem que tudo transcrever e mostrar ali." `entrega`
                                já é o texto — escrito ou falado (transcrito) —
                                CrmMetodo.jsx; só não mostra quando é URL (a
                                miniatura já cobre foto/print/link). */}
                            {c.entrega && !/^https?:\/\//.test(c.entrega) && <span className="ml-2 italic text-gray-700">"{c.entrega}"</span>}
                            {c.veredito_ia?.o_que_viu && <span className="ml-2">IA viu: {c.veredito_ia.o_que_viu}</span>}
                            {c.motivo_gestor && <span className="ml-2">gestor: {c.motivo_gestor}</span>}
                          </p>
                          {/* 🗣️ DIR-84 — chegou aqui DEPOIS de a pessoa já ter
                              tentado se explicar pra IA e ainda assim ficou em
                              dúvida: o gestor precisa ver essa explicação, não só
                              a imagem, pra decidir com o mesmo contexto que a IA teve. */}
                          {c.justificativa_pessoa && (
                            <p className="text-[10px] text-gray-600 italic bg-amber-50 border border-amber-100 rounded px-1.5 py-1 mt-0.5">
                              🗣️ a pessoa explicou: "{c.justificativa_pessoa}"
                            </p>
                          )}
                          {reprovando?.id === t.id && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <Input placeholder="motivo (a pessoa vai ler)" value={reprovando.motivo} onChange={(e) => setReprovando({ ...reprovando, motivo: e.target.value })} className="h-7 text-[11px] bg-white border-gray-300" />
                              <Button size="sm" onClick={() => reprovarComp(t)} className="bg-red-600 hover:bg-red-700 text-white h-7 text-[11px]">Confirmar reprova</Button>
                              <button type="button" onClick={() => setReprovando(null)} className="text-[11px] text-gray-400 hover:text-gray-600">cancelar</button>
                            </div>
                          )}
                        </div>
                        {s !== 'reprovada' && reprovando?.id !== t.id && (
                          <span className="flex items-center gap-1.5 shrink-0">
                            {s === 'em_analise' && (
                              <Button size="sm" onClick={() => aprovarComp(t)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-[11px]">Aprovar ✔</Button>
                            )}
                            <button type="button" onClick={() => setReprovando({ id: t.id, motivo: '' })} className="text-[11px] font-bold text-gray-400 hover:text-red-600">reprovar</button>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {abaAdmin === 'participantes' && (<>
      {/* ciclo oficial */}
      <div className="flex items-end gap-2 flex-wrap">
        <label className="text-xs text-gray-700" title={DICAS.ciclo}>
          Início oficial do ciclo (22 dias úteis) ⓘ
          <Input type="date" value={cicloInicio} onChange={(e) => setCicloInicio(e.target.value)} className="h-9 mt-1 bg-white border-gray-300" />
        </label>
        <Button size="sm" onClick={abrirCiclo} disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          Abrir ciclo
        </Button>
        <span className="text-[11px] text-gray-500">sem data vigente, vale o 1º dia útil do mês</span>
      </div>

      {/* cadastrar participante — busca por nome, TODOS numa lista só (corporativo
          e usuário comum juntos), um toque já coloca no jogo. Dono: "eu preciso
          selecionar o time corporativo mas também preciso selecionar o usuário...
          não está fluido" — as pílulas são só um recorte, "Todos" é o padrão. */}
      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="text-xs font-semibold text-gray-900">Colocar no jogo — quem vota e recebe voto no MvM (time corporativo OU usuário comum, tanto faz):</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="🔎 digite o nome — ex.: “lu” acha todos os Lucianos"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 bg-white border-gray-300 flex-1 min-w-[220px]"
          />
          {/* 🎯 dono: "nem todo mundo que está no topo, no grupo corporativo,
              está na gamificação — preciso selecionar as pessoas que vão ser
              votadas" — marca vários (ou o filtro inteiro) e cadastra juntos. */}
          <Button size="sm" onClick={() => adicionar(selecionados)} disabled={salvando || !selecionados.length} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
            <UserPlus className="w-4 h-4 mr-1" /> {selecionados.length > 1 ? `Cadastrar ${selecionados.length} selecionados` : selecionados.length === 1 ? `Cadastrar ${nomeDe(selecionados[0])}` : 'Cadastrar'}
          </Button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTROS_CANDIDATOS.map(([g, rotulo]) => (
            <button
              key={g}
              type="button"
              onClick={() => setFiltroCandidato(g)}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${filtroCandidato === g ? 'border-emerald-600 text-emerald-700 bg-emerald-50' : 'border-gray-300 text-gray-500 hover:border-emerald-400'}`}
            >{rotulo} ({contagemPorGrupo[g]})</button>
          ))}
          {/* marca/desmarca TODOS os que estão na lista agora — funciona com
              qualquer pílula (inclusive "Todos" ou uma busca por nome), não só
              por categoria fixa como o "marcar todo o grupo" de antes */}
          {candidatos.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const ids = candidatos.map((u) => u.id);
                const todosMarcados = ids.every((id) => selecionados.includes(id));
                setSelecionados((prev) => (todosMarcados ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
              }}
              className="ml-auto text-[11px] font-semibold text-emerald-700 hover:underline"
            >
              {candidatos.every((u) => selecionados.includes(u.id)) ? '✔ desmarcar' : '☐ marcar'} os {candidatos.length} listados
            </button>
          )}
        </div>
        {candidatos.length === 0 ? (
          <p className="text-[11px] text-gray-500">{busca ? `Ninguém com "${busca}" fora do jogo.` : 'Todo mundo desse filtro já está no jogo.'}</p>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white divide-y divide-gray-100">
            {candidatos.map((u) => {
              const marcado = selecionados.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => alternarSelecionado(u.id)}
                  title="Toque pra marcar/desmarcar"
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${marcado ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                >
                  <AvatarPessoa u={u} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-gray-900 truncate">{marcado ? '✔ ' : ''}{nomeExibicao(u)}</span>
                    <span className="block text-[10px] text-gray-400">{ROTULO_GRUPO[grupoDoUsuario(u)]}{cargoLabel(u) ? ` · ${cargoLabel(u)}` : ''}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* participantes: cargo, perfil, verbas + AS TAREFAS DA PESSOA no card.
          O que o admin gera/cria aqui grava em metodo_tarefas — é a MESMA
          tabela do Compromisso, então aparece na hora no perfil dela. */}
      {participantes.length > 0 && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <p className="text-xs font-semibold text-gray-900">Participantes ({participantes.filter((p) => p.ativo).length} ativos) — quem está ativo vota e recebe voto no MvM das {horaDeMin(VOTACAO_INICIO_MIN)} às {horaDeMin(VOTACAO_FIM_MIN)}:</p>
          {/* 🗳️ 08/09/2026 — dono: "quero ver se todo mundo votou... eu
              estou às cegas." Raio-x de hoje: cada chip já mostra se a
              pessoa fechou o voto em TODOS os colegas votáveis (✅) ou
              ainda falta alguém (⏳ N/M) — sem abrir card nem entrar no
              painel de ninguém. */}
          {participantes.some((p) => p.ativo) && (
            <div className="flex items-center gap-1.5 flex-wrap rounded-md border border-emerald-100 bg-emerald-50/50 px-2.5 py-2" data-teste="quem-vota">
              {participantes.filter((p) => p.ativo).map((p) => {
                const sv = statusVotoDe(p.user_id);
                const mvm = mvmCicloDe(p.user_id);
                return (
                  <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-white border border-emerald-200 pl-1 pr-1.5 py-0.5" title={`${nomeDe(p.user_id)} — votou em ${sv.feitos} de ${sv.total} colegas hoje · MvM recebida no ciclo: ${mvm === null ? 'ninguém votou nela ainda' : mvm.toFixed(2)}`}>
                    <AvatarPessoa u={usuarios.find((x) => x.id === p.user_id)} tamanho={20} />
                    <span className="text-[10.5px] font-medium text-gray-700 truncate max-w-[110px]">{nomeDe(p.user_id)}</span>
                    {p.em_mentoria && <span title="está na mentoria">🎓</span>}
                    {sv.total > 0 && (
                      <span className={`text-[9.5px] font-bold tabular-nums ${sv.completo ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {sv.completo ? '✅' : `⏳ ${sv.feitos}/${sv.total}`}
                      </span>
                    )}
                    {/* 🗳️ a NOTA recebida de verdade (não só se votou) */}
                    <span className={`text-[9.5px] font-bold tabular-nums ${mvm === null ? 'text-gray-400' : mvm < 4 ? 'text-red-600' : 'text-gray-600'}`}>
                      MvM {mvm === null ? '—' : mvm.toFixed(1)}
                    </span>
                    {onVerComo && (
                      <button
                        type="button"
                        onClick={() => onVerComo(p.user_id)}
                        title={`Ver como ${nomeDe(p.user_id)} vê o MvM dela`}
                        className="text-gray-400 hover:text-nz-verde"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
          {/* 🎓 08/09/2026 — dono: Super Admin não é votável a não ser que
              ele mesmo permita (interruptor "Aceito ser votado" no X-GAME
              dele) — aqui é só leitura, pra quem gerencia não achar que ele
              "sumiu" da lista de colegas sem explicação. */}
          <p className="text-[10.5px] text-gray-500">🛡️ Super Admin fica FORA da lista votável por padrão — só entra se ele mesmo ligar o interruptor no X-GAME dele.</p>
          {participantes.map((p) => {
            const cardAberto = participanteAberto === p.id;
            const usu = usuarios.find((x) => x.id === p.user_id);
            const ehSuperAdminNaoVotavel = usu?.role === 'super_admin' && p.aceita_ser_votado !== true;
            // 🗳️ 09/09/2026 — dono: "tem pessoas que já participaram da
            // mentoria e não vão receber voto... eles podem votar, mas não
            // recebem voto." Diferente do Super Admin (opt-IN, ele mesmo se
            // liga): aqui o ADMIN desliga por pessoa, e o padrão continua
            // sendo votável — só quem for desligado explicitamente some da
            // lista de quem RECEBE voto (podeSerVotado, xgame.js).
            const ehParticipanteComum = usu?.role !== 'super_admin';
            const recebeVoto = podeSerVotado({ role: usu?.role, aceita_ser_votado: p.aceita_ser_votado });
            return (
            <div key={p.id} className={`rounded-lg border px-3 py-2 bg-white space-y-1.5 ${p.ativo ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
              {/* cabeçalho: sempre visível — clica e abre; abrir um fecha o outro */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setParticipanteAberto(cardAberto ? null : p.id); setTarefaUser(''); }}
                  className="flex-1 min-w-[140px] flex items-center gap-2 text-left text-sm font-semibold text-gray-900 hover:text-emerald-700"
                >
                  <AvatarPessoa u={usu} tamanho={26} />
                  <span className="min-w-0 truncate">
                    {cardAberto ? '▾' : '▸'} {nomeDe(p.user_id)}
                    <span className="ml-2 text-[10px] font-normal text-gray-400">{p.cargo} · {p.perfil}</span>
                    {ehSuperAdminNaoVotavel && <span className="ml-2 text-[10px] font-semibold text-purple-600">🛡️ não votável (Super Admin)</span>}
                    {ehParticipanteComum && !recebeVoto && <span className="ml-2 text-[10px] font-semibold text-blue-600" title={DICAS.recebeVoto}>🗳️ não recebe voto</span>}
                  </span>
                </button>
                <span className="flex items-center gap-3">
                  {cardAberto && (
                    <button
                      type="button"
                      onClick={() => setTarefaUser(tarefaUser === p.user_id ? '' : p.user_id)}
                      title={DICAS.conferencia}
                      className={`text-[11px] font-bold ${tarefaUser === p.user_id ? 'text-emerald-700' : 'text-gray-500 hover:text-emerald-700'}`}
                    >{tarefaUser === p.user_id ? '▾ 📋 Tarefas' : '▸ 📋 Tarefas'}</button>
                  )}
                  <button
                    type="button"
                    onClick={() => salvarParticipante(p, { em_mentoria: !p.em_mentoria })}
                    title={DICAS.mentoria}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${p.em_mentoria ? 'text-purple-600' : 'text-gray-300 hover:text-purple-500'}`}
                  ><GraduationCap className="w-3.5 h-3.5" /> {p.em_mentoria ? 'na mentoria' : 'sem mentoria'}</button>
                  {ehParticipanteComum && (
                    <button
                      type="button"
                      onClick={() => salvarParticipante(p, { aceita_ser_votado: recebeVoto ? false : true })}
                      title={DICAS.recebeVoto}
                      className={`text-[11px] font-bold ${recebeVoto ? 'text-blue-600' : 'text-gray-300 hover:text-blue-500'}`}
                    >🗳️ {recebeVoto ? 'recebe voto' : 'sem voto'}</button>
                  )}
                  <button type="button" onClick={() => salvarParticipante(p, { ativo: !p.ativo })} className={`text-[11px] font-bold ${p.ativo ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {p.ativo ? '● ATIVO' : '○ inativo'}
                  </button>
                </span>
              </div>
              {cardAberto && (
              <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-600">
                <label title={DICAS.cargo}>cargo ⓘ{' '}
                  <select value={p.cargo} onChange={(e) => salvarParticipante(p, { cargo: e.target.value, multa_atraso: MULTA_POR_CARGO[e.target.value] ?? p.multa_atraso })} className="border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-900">
                    {['trainee', 'executivo', 'diretor', 'ceo'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label title={DICAS.perfil}>perfil ⓘ{' '}
                  <select value={p.perfil} onChange={(e) => salvarParticipante(p, { perfil: e.target.value })} className="border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-900">
                    {['estrategico', 'comercial', 'operacional'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label title={DICAS.verba_producao}>produção R$ ⓘ{' '}
                  <input type="number" defaultValue={p.verba_producao} onBlur={(e) => salvarParticipante(p, { verba_producao: Number(e.target.value) || 0 })} className="w-20 border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-900 tabular-nums" />
                </label>
                <label title={DICAS.verba_bonus}>bônus R$ ⓘ{' '}
                  <input type="number" defaultValue={p.verba_bonus} onBlur={(e) => salvarParticipante(p, { verba_bonus: Number(e.target.value) || 0 })} className="w-16 border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-900 tabular-nums" />
                </label>
                <span title={DICAS.cargo}>multa {fmtReais(p.multa_atraso)}</span>
              </div>
              )}

              {/* ══ 📋 AS TAREFAS DA PESSOA — menu suspenso dentro do card ══ */}
              {cardAberto && tarefaUser === p.user_id && (
                <div className="space-y-1.5 rounded-md border border-emerald-200 bg-emerald-50/30 px-2 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[11px] font-semibold text-gray-900 flex-1 min-w-[160px]" title={DICAS.conferencia}>
                      Tarefas de {nomeDe(p.user_id)} — o que você gerencia aqui aparece na hora no Compromisso dela ⓘ
                    </p>
                    {tarefas.length > 0 && (
                      <Button
                        size="sm"
                        onClick={aplicarPesosAutomaticos}
                        disabled={salvando}
                        title={'Aplica a regra do dono em todas as tarefas do dia: negócio/venda peso 6 · gratidão e treinamento 5 · leitura e postagem 4 · atividade física e gestão 3 · suporte 2 · almoço/descanso 1.'}
                        className="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-8"
                      >🪄 Pesos automáticos</Button>
                    )}
                    <Input type="date" value={tarefaDia} onChange={(e) => setTarefaDia(e.target.value)} className="h-8 bg-white border-gray-300 w-auto" />
                  </div>

                  {tarefas.length === 0 ? (
                    <div className="flex items-center gap-2 flex-wrap rounded border border-dashed border-emerald-300 bg-white px-3 py-2">
                      <p className="text-[11px] text-gray-600 flex-1 min-w-[160px]">Dia sem Master Task ainda. Gera automático com a Rotina Perfeita (o planejamento diário perfeito), ou cria manual abaixo.</p>
                      <Button size="sm" onClick={gerarRotinaPerfeita} disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8">
                        ⚡ {salvando ? 'Gerando...' : 'Gerar Rotina Perfeita'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {tarefas.map((t) => (
                        <div key={t.id} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-2 py-1.5 flex-wrap">
                          <span className={`text-[11px] min-w-0 truncate ${t.feito ? 'text-gray-900' : 'text-gray-400'}`}>
                            {t.hora} — {t.titulo} {t.feito ? '✔ feita' : '(não marcada)'}
                            {t.comprovacao?.valido && (t.comprovacao.tipo === 'instagram'
                              ? <a href={t.comprovacao.entrega} target="_blank" rel="noreferrer" className="ml-1.5 font-bold text-emerald-600 hover:underline" title="Comprovação: post do Instagram">📸</a>
                              : <span className="ml-1.5 font-bold text-emerald-600" title={`Comprovação: ${t.comprovacao.entrega}`}>📚</span>)}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <select
                              value={t.validacao || ''}
                              onChange={(e) => salvarTarefa(t, { validacao: e.target.value || null })}
                              title={DICAS.validacao}
                              className="text-[10px] border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900"
                            >
                              <option value="">✅ auto ({{ instagram: '📸 insta', aprendizado: '📚 aprendizado', aprendizado_fds: '📚🔥 estudo fds', foto: '📷 foto' }[validacaoAutomatica(t.titulo)] || '📷 foto'})</option>
                              <option value="nenhuma">sem prova</option>
                              <option value="instagram">📸 Instagram</option>
                              <option value="aprendizado">📚 aprendizado</option>
                              <option value="aprendizado_fds">📚🔥 estudo de fim de semana (resumo bem maior)</option>
                              <option value="foto">📷 foto/print</option>
                            </select>
                            <select value={t.categoria || 'producao'} onChange={(e) => salvarTarefa(t, { categoria: e.target.value })} title={DICAS.categoria} className="text-[10px] border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900">
                              {CATEGORIAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                            </select>
                            <select value={t.peso ?? 3} onChange={(e) => salvarTarefa(t, { peso: Number(e.target.value) })} title={`${DICAS.peso} Automático sugere: ${porqueDoPeso(t.titulo)}.`} className="text-[10px] border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900">
                              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>peso {n}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => salvarTarefa(t, { conferido: t.conferido === true ? null : true })}
                              title={DICAS.conferencia}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${t.conferido === true ? 'border-emerald-600 text-white bg-emerald-600' : 'border-gray-300 text-gray-500 hover:border-emerald-600'}`}
                            >{t.conferido === true ? 'SIM ✔' : 'confirmar SIM'}</button>
                            <button
                              type="button"
                              onClick={() => excluirTarefa(t)}
                              title="Excluir a tarefa do dia dela (2 cliques pra confirmar)"
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${excluindo === t.id ? 'border-red-600 text-white bg-red-600' : 'border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500'}`}
                            >{excluindo === t.id ? 'confirma?' : '✕'}</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* criar manual — as coisas que você precisa que ela faça */}
                  <div className="flex items-end gap-2 flex-wrap rounded border border-dashed border-gray-300 bg-white px-2 py-2">
                    <Input type="time" value={novaTarefa.hora} onChange={(e) => setNovaTarefa({ ...novaTarefa, hora: e.target.value })} className="h-8 bg-white border-gray-300 w-auto" />
                    <Input placeholder="tarefa manual — o que ela precisa fazer" value={novaTarefa.titulo} onChange={(e) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })} className="h-8 bg-white border-gray-300 flex-1 min-w-[160px]" />
                    <select value={novaTarefa.categoria} onChange={(e) => setNovaTarefa({ ...novaTarefa, categoria: e.target.value })} title={DICAS.categoria} className="text-[11px] border border-gray-300 rounded px-1.5 py-1.5 bg-white text-gray-900">
                      {CATEGORIAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                    </select>
                    <select value={novaTarefa.peso} onChange={(e) => setNovaTarefa({ ...novaTarefa, peso: Number(e.target.value) })} title={DICAS.peso} className="text-[11px] border border-gray-300 rounded px-1.5 py-1.5 bg-white text-gray-900">
                      {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>peso {n}</option>)}
                    </select>
                    <Button size="sm" onClick={criarTarefa} disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8">
                      <Plus className="w-4 h-4 mr-1" /> Criar tarefa
                    </Button>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
      </>)}
    </div>
  );
}
