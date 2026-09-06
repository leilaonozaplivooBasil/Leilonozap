import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { fmtReais, pesoAutomatico, porqueDoPeso, categoriaDaTarefa, validacaoAutomatica, nomeExibicao } from '@/lib/xgame';
import { normalizeLevels, getLevel } from '@/lib/careerLevels';
import { isAdminRole } from '@/lib/roles';
import { ROTINA_PADRAO, gerarTarefasDaRotina } from '@/lib/metodo';

// 🛠️ X-GAME — ADMIN DA GAMIFICAÇÃO (só o super admin chega aqui; o gate é
// feito pelo painel Admin do Licensing). É AQUI que o dono do jogo decide:
//   • quem participa (os integrantes da egrégora/mentoria);
//   • quanto cada um recebe (as verbas do X-Pay: produção, bônus e venda);
//   • quais são as tarefas da gamificação de cada pessoa (categoria + peso);
//   • quando o ciclo oficial de 22 dias úteis começa;
//   • a conferência dupla — o "SIM" do gestor tarefa a tarefa.
// A votação do MvM (1 a 10 nas 10 Virtudes, 20h–22h) acontece entre os
// participantes ATIVOS cadastrados aqui — quem está fora não vota nem recebe voto.

// Multas de atraso do FAQ da planilha: Trainee R$50 · Executivo R$200 · Diretor R$500.
const MULTA_POR_CARGO = { trainee: 50, executivo: 200, diretor: 500, ceo: 500 };
// SEM [VENDA] aqui de propósito: a venda da loja da pessoa já remunera pelo
// sistema de comissões da plataforma — a gamificação não paga venda de novo.
const CATEGORIAS = [
  ['producao', '[PRODUÇÃO]'], ['bonus', '[BÔNUS]'],
  ['mentoria', '[MENTORIA]'], ['visao', '[VISÃO ESTRATÉGICA]'],
];
const hojeStr = () => new Date().toISOString().slice(0, 10);

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
  perfil: 'O perfil muda os pesos do Human Token: estratégico/operacional têm 12,22 de aplicabilidade (50% produção, 30% real time, 20% bônus); comercial tem 2,22 + PT VENDA 2,5 (vendas valem muito mais).',
  cargo: 'O cargo define a multa de atraso do FAQ: Trainee R$50, Executivo R$200, Diretor R$500.',
  peso: 'Peso 1 a 6 da tarefa (padrão 3). Tarefa mais pesada vale mais dinheiro no X-Pay do dia.',
  categoria: 'A categoria decide de qual verba a tarefa paga: [PRODUÇÃO] e [MENTORIA]/[VISÃO] saem da verba de produção; [BÔNUS] da verba de bônus. Venda NÃO entra aqui — a venda da loja já remunera pelas comissões da plataforma.',
  conferencia: 'Conferência dupla da planilha: a pessoa marca a tarefa (o checkbox dela) e o gestor confirma o SIM aqui. Sem o SIM, a tarefa fica pendente de conferência.',
  validacao: 'Validação automática (F10): a tarefa só conclui com a comprovação — 📸 link do post/story do Instagram DO DIA, ou 📚 escrever o principal aprendizado da leitura. "Automática" deixa o sistema deduzir pelo título; "nenhuma" conclui direto. Vendas e reuniões validam sozinhas pelos dados do sistema.',
};

export default function XGameAdmin() {
  const [participantes, setParticipantes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [novo, setNovo] = useState('');
  const [busca, setBusca] = useState('');
  // menus suspensos: um grupo da busca aberto por vez, um participante aberto
  // por vez (abrir um fecha o outro) — pra página não ficar quilométrica
  const [grupoAberto, setGrupoAberto] = useState(null);
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
    supabase.from('app_users').select('id,full_name,nickname,role,career_levels').order('full_name')
      .then(({ data }) => setUsuarios(data || []));
    supabase.from('xgame_config').select('ciclo_inicio').eq('id', 'atual').maybeSingle()
      .then(({ data }) => setCicloInicio(data?.ciclo_inicio ? String(data.ciclo_inicio).slice(0, 10) : ''));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const nomeDe = (id) => {
    const u = usuarios.find((x) => x.id === id);
    return u ? nomeExibicao(u) : (id ? id.slice(0, 6) : '—');
  };

  // candidatos agrupados pelo plano de carreira + filtro do nome ao digitar
  const gruposDeCandidatos = useMemo(() => {
    const q = semAcento(busca.trim());
    const livres = usuarios.filter((u) => !participantes.some((p) => p.user_id === u.id));
    const filtrados = q
      ? livres.filter((u) => semAcento(u.nickname).includes(q) || semAcento(u.full_name).includes(q))
      : livres;
    const por = { corporativo: [], licenciados: [], vendedores: [], usuarios: [] };
    filtrados.forEach((u) => por[grupoDoUsuario(u)].push(u));
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

  const adicionar = async () => {
    if (!novo) return;
    setSalvando(true);
    const { error } = await supabase.from('xgame_participantes')
      .upsert({ user_id: novo, ativo: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setSalvando(false);
    if (error) { toast.error('Erro ao cadastrar participante.'); return; }
    toast.success('Participante no jogo!');
    setNovo('');
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
  const [iaLigada, setIaLigada] = useState(null);
  const [reprovando, setReprovando] = useState(null); // { id, motivo }
  const statusDaComp = (c) => c?.status || (c?.valido ? 'aprovada_ia' : 'reprovada');
  const carregarComprovacoes = useCallback(() => {
    supabase.from('metodo_tarefas')
      .select('id,user_id,data,hora,titulo,feito,comprovacao')
      .not('comprovacao', 'is', null)
      .order('data', { ascending: false }).limit(150)
      .then(({ data }) => setComprovacoes(data || []));
    fetch('/api/functions/xgameValidarPrint')
      .then((r) => r.json()).then((j) => setIaLigada(!!j?.ia)).catch(() => setIaLigada(false));
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
      const { error } = await supabase.from('metodo_tarefas').insert(linhas);
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
  const compFiltradas = comprovacoes.filter((t) => filtroComp === 'todas' || statusDaComp(t.comprovacao) === filtroComp);

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
        <span className={`ml-auto text-[10px] font-bold ${iaLigada === null ? 'text-gray-400' : iaLigada ? 'text-emerald-600' : 'text-amber-600'}`}>
          {iaLigada === null ? '… conferindo a IA' : iaLigada ? '🧠 IA de visão CONECTADA' : '⚠ IA desligada — tudo cai na fila manual'}
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
            <p className="text-[11px] text-gray-500">Nada aqui nesse filtro — quando alguém comprovar uma tarefa, a imagem chega nesta fila.</p>
          ) : (
            <div className="space-y-1.5">
              {compFiltradas.map((t) => {
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
                        {nomeDe(t.user_id)} · {String(t.data).slice(8, 10)}/{String(t.data).slice(5, 7)} {t.hora} — {t.titulo}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {s === 'em_analise' && <span className="font-bold text-amber-600">⏳ EM ANÁLISE</span>}
                        {s === 'aprovada_ritual' && <span className="font-bold text-emerald-600">🌅 ritual do amanhecer completo</span>}
                        {s === 'aprovada_ia' && <span className="font-bold text-emerald-600">🤖 aprovada pela IA{c.veredito_ia?.confianca ? ` (${c.veredito_ia.confianca}%)` : ''}</span>}
                        {s === 'aprovada_manual' && <span className="font-bold text-emerald-700">👤 aprovada pelo gestor</span>}
                        {s === 'reprovada' && <span className="font-bold text-red-600">🚫 reprovada</span>}
                        {c.fora_da_janela && <span className="ml-2 text-amber-600 font-semibold">⏰ fora da janela de 2h</span>}
                        {c.video_url && <a href={c.video_url} target="_blank" rel="noreferrer" className="ml-2 font-bold text-emerald-700 hover:underline">🎥 ver a visualização ({c.video_seg || 0}s)</a>}
                        {c.veredito_ia?.o_que_viu && <span className="ml-2">IA viu: {c.veredito_ia.o_que_viu}</span>}
                        {c.motivo_gestor && <span className="ml-2">gestor: {c.motivo_gestor}</span>}
                      </p>
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

      {/* cadastrar participante — busca por nome + categorias do plano de carreira */}
      <div className="space-y-2 border-t border-gray-200 pt-3">
        <p className="text-xs font-semibold text-gray-900">Colocar no jogo (os integrantes da egrégora):</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="🔎 digite o nome — ex.: “lu” acha todos os Lucianos"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-9 bg-white border-gray-300 flex-1 min-w-[220px]"
          />
          <Button size="sm" onClick={adicionar} disabled={salvando || !novo} className="bg-emerald-600 hover:bg-emerald-700 text-white h-9">
            <UserPlus className="w-4 h-4 mr-1" /> Cadastrar{novo ? ` ${nomeDe(novo)}` : ''}
          </Button>
        </div>
        {GRUPOS_BUSCA.every(([g]) => gruposDeCandidatos[g].length === 0) ? (
          <p className="text-[11px] text-gray-500">{busca ? `Ninguém com "${busca}" fora do jogo.` : 'Todo mundo já está no jogo.'}</p>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white">
            {GRUPOS_BUSCA.map(([g, rotulo]) => {
              if (gruposDeCandidatos[g].length === 0) return null;
              // buscando, o grupo com resultado abre sozinho; sem busca, é menu suspenso
              const aberto = busca.trim() ? true : grupoAberto === g;
              return (
                <div key={g}>
                  <button
                    type="button"
                    onClick={() => setGrupoAberto(grupoAberto === g ? null : g)}
                    className="sticky top-0 w-full flex items-center justify-between bg-gray-100 border-b border-gray-200 px-3 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-wide hover:bg-gray-200"
                  >
                    <span>{aberto ? '▾' : '▸'} {rotulo} ({gruposDeCandidatos[g].length})</span>
                    {!aberto && <span className="normal-case font-normal text-gray-400">toque pra abrir</span>}
                  </button>
                  {aberto && gruposDeCandidatos[g].map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setNovo(novo === u.id ? '' : u.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left border-b border-gray-100 last:border-b-0 ${novo === u.id ? 'bg-emerald-50 text-emerald-800' : 'text-gray-800 hover:bg-gray-50'}`}
                    >
                      <span className="text-xs truncate">{novo === u.id ? '✔ ' : ''}{nomeExibicao(u)}</span>
                      {cargoLabel(u) && <span className="shrink-0 text-[10px] text-gray-400">{cargoLabel(u)}</span>}
                    </button>
                  ))}
                </div>
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
          <p className="text-xs font-semibold text-gray-900">Participantes ({participantes.filter((p) => p.ativo).length} ativos) — quem está ativo vota e recebe voto no MvM das 20h às 22h:</p>
          {participantes.map((p) => {
            const cardAberto = participanteAberto === p.id;
            return (
            <div key={p.id} className={`rounded-lg border px-3 py-2 bg-white space-y-1.5 ${p.ativo ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
              {/* cabeçalho: sempre visível — clica e abre; abrir um fecha o outro */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => { setParticipanteAberto(cardAberto ? null : p.id); setTarefaUser(''); }}
                  className="flex-1 min-w-[140px] text-left text-sm font-semibold text-gray-900 hover:text-emerald-700"
                >
                  {cardAberto ? '▾' : '▸'} {nomeDe(p.user_id)}
                  <span className="ml-2 text-[10px] font-normal text-gray-400">{p.cargo} · {p.perfil}</span>
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
                              <option value="">✅ auto ({{ instagram: '📸 insta', aprendizado: '📚 aprendizado', foto: '📷 foto' }[validacaoAutomatica(t.titulo)] || '📷 foto'})</option>
                              <option value="nenhuma">sem prova</option>
                              <option value="instagram">📸 Instagram</option>
                              <option value="aprendizado">📚 aprendizado</option>
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
