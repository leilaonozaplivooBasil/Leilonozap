import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { fmtReais } from '@/lib/xgame';
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
  verba_producao: 'Verba fixa mensal de PRODUÇÃO da pessoa. O X-Pay divide: verba ÷ 22 dias ÷ nº de tarefas de produção do dia × peso da tarefa ÷ 3.',
  verba_bonus: 'Verba mensal de BÔNUS/ESTUDO (leitura, cursos). Divide igual à produção, só entre as tarefas de bônus.',
  perfil: 'O perfil muda os pesos do Human Token: estratégico/operacional têm 12,22 de aplicabilidade (50% produção, 30% real time, 20% bônus); comercial tem 2,22 + PT VENDA 2,5 (vendas valem muito mais).',
  cargo: 'O cargo define a multa de atraso do FAQ: Trainee R$50, Executivo R$200, Diretor R$500.',
  peso: 'Peso 1 a 6 da tarefa (padrão 3). Tarefa mais pesada vale mais dinheiro no X-Pay do dia.',
  categoria: 'A categoria decide de qual verba a tarefa paga: [PRODUÇÃO] e [MENTORIA]/[VISÃO] saem da verba de produção; [BÔNUS] da verba de bônus. Venda NÃO entra aqui — a venda da loja já remunera pelas comissões da plataforma.',
  conferencia: 'Conferência dupla da planilha: a pessoa marca a tarefa (o checkbox dela) e o gestor confirma o SIM aqui. Sem o SIM, a tarefa fica pendente de conferência.',
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
    return u?.nickname || u?.full_name || (id ? id.slice(0, 6) : '—');
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
      .select('id,hora,titulo,feito,conferido,categoria,peso,ordem')
      .eq('user_id', userId).eq('data', dia).order('hora');
    setTarefas(data || []);
  }, []);
  useEffect(() => { carregarTarefas(tarefaUser, tarefaDia); }, [tarefaUser, tarefaDia, carregarTarefas]);

  const salvarTarefa = async (t, patch) => {
    const { error } = await supabase.from('metodo_tarefas').update(patch).eq('id', t.id);
    if (error) { toast.error('Erro ao salvar a tarefa.'); return; }
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
  };

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
      const linhas = gerarTarefasDaRotina(rotina, tarefaUser, tarefaDia);
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

  return (
    <div className="space-y-4 text-sm">
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
                      <span className="text-xs truncate">{novo === u.id ? '✔ ' : ''}{u.nickname || u.full_name || u.id.slice(0, 6)}</span>
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
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <select value={t.categoria || 'producao'} onChange={(e) => salvarTarefa(t, { categoria: e.target.value })} title={DICAS.categoria} className="text-[10px] border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900">
                              {CATEGORIAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                            </select>
                            <select value={t.peso ?? 3} onChange={(e) => salvarTarefa(t, { peso: Number(e.target.value) })} title={DICAS.peso} className="text-[10px] border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900">
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
    </div>
  );
}
