import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, Star, CalendarPlus, ExternalLink, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import {
  HABITOS, ROTINA_PADRAO, periodoDe, PERIODOS, gerarTarefasDaRotina,
  progressoDia, linkGoogleAgenda, QUALIFICACOES,
} from '@/lib/metodo';
import { ehAtiva } from '@/lib/esteiraCaptacao';

// 🏆 DIR-43 — O MÉTODO VIVO: os painéis dos hábitos 1-5 e 8 (os hábitos 6 e
// 7 são o próprio CRM: Acompanhamento = Clientes+Esteira, Verificação =
// Visão Executiva). Dados pessoais em metodo_perfil/metodo_tarefas.
const hojeStr = () => new Date().toISOString().slice(0, 10);
const fmtDia = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });

const EXEMPLO_SCRIPT = `Ex.: "Oi {nome}! Lembrei de você por causa do {contexto da pessoa — FORM}.
Estou construindo um negócio de leilões e loja com preço de fábrica que está crescendo forte,
e queria te mostrar uma possibilidade — não é promessa, é projeto sério, com números abertos.
Topa uma conversa de 45 minutos essa semana? Tenho agenda {dia} às {hora}."`;

export default function CrmMetodo({ painel, currentUser, clientesManuais = [], oportunidades = [], onQualificar, onNovoCliente, onIr }) {
  const uid = currentUser?.id;
  const [perfil, setPerfil] = useState(null);
  const [dia, setDia] = useState(hojeStr());
  const [tarefas, setTarefas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  // edições locais
  const [novoSonho, setNovoSonho] = useState('');
  const [script, setScript] = useState('');
  const [apresentacaoUrl, setApresentacaoUrl] = useState('');
  const [novaTarefa, setNovaTarefa] = useState({ hora: '', titulo: '' });

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

  const carregarTarefas = useCallback(() => {
    if (!uid) return;
    plataforma.entities.MetodoTarefa.filter({ user_id: uid, data: dia })
      .then((rows) => setTarefas((Array.isArray(rows) ? rows : []).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.hora).localeCompare(String(b.hora)))))
      .catch(() => setTarefas([]));
  }, [uid, dia]);
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
    } catch (e) {
      console.error('Erro ao salvar método:', e);
      toast.error('Erro ao salvar — a migração do Método já foi colada no banco?');
    } finally { setSalvando(false); }
  };

  const sonhos = Array.isArray(perfil?.sonhos) ? perfil.sonhos : [];
  const rotina = Array.isArray(perfil?.rotina) && perfil.rotina.length ? perfil.rotina : ROTINA_PADRAO;
  const progresso = progressoDia(tarefas);

  const mudarDia = (delta) => {
    const d = new Date(`${dia}T12:00:00`);
    d.setDate(d.getDate() + delta);
    setDia(d.toISOString().slice(0, 10));
  };

  const gerarDia = async () => {
    setSalvando(true);
    try {
      const linhas = gerarTarefasDaRotina(rotina, uid, dia);
      for (const linha of linhas) await plataforma.entities.MetodoTarefa.create(linha);
      toast.success(`Dia gerado com ${linhas.length} tarefas da sua rotina!`);
      carregarTarefas();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar o dia — a migração do Método já foi colada no banco?');
    } finally { setSalvando(false); }
  };

  const alternarFeito = async (t) => {
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, feito: !t.feito } : x)));
    try { await plataforma.entities.MetodoTarefa.update(t.id, { feito: !t.feito }); }
    catch { toast.error('Erro ao salvar'); carregarTarefas(); }
  };

  const addTarefa = async () => {
    if (!novaTarefa.titulo.trim()) return;
    try {
      await plataforma.entities.MetodoTarefa.create({ user_id: uid, data: dia, hora: novaTarefa.hora, titulo: novaTarefa.titulo.trim(), detalhe: '', feito: false, ordem: tarefas.length });
      setNovaTarefa({ hora: '', titulo: '' });
      carregarTarefas();
    } catch { toast.error('Erro ao adicionar'); }
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

  const listaOrdenada = useMemo(
    () => [...clientesManuais].sort((a, b) => (b.qualificacao || 0) - (a.qualificacao || 0) || String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR')),
    [clientesManuais]
  );

  const habito = HABITOS.find((h) => h.id === painel);

  return (
    <Card className="bg-white border-nz-borda mb-4 sm:mb-6">
      <CardContent className="p-4 sm:p-6 space-y-4">
        {habito && (
          <div>
            <p className="text-lg font-bold text-nz-tinta"><span className="text-nz-verde">Hábito {habito.n} — {habito.titulo}</span></p>
            <p className="text-sm text-nz-tinta-fraca">{habito.texto}</p>
          </div>
        )}

        {/* ══ 🌟 HÁBITO 1 — QUADRO DOS SONHOS ══ */}
        {painel === 'sonho' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sonhos.map((s, i) => (
                <div key={i} className="rounded-xl border border-nz-verde/30 bg-nz-verde-fundo p-4 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-nz-tinta">🌟 {s.titulo}</p>
                    {s.prazo && <p className="text-xs text-nz-tinta-fraca mt-0.5">alvo: {s.prazo}</p>}
                  </div>
                  <button type="button" onClick={() => salvarPerfil({ sonhos: sonhos.filter((_, j) => j !== i) })} className="text-nz-tinta-fraca hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {sonhos.length === 0 && (
                <p className="text-sm text-nz-tinta-fraca sm:col-span-2">Seu quadro está vazio. "Se você não sabe para onde vai, qualquer caminho serve." — escreva o primeiro sonho abaixo.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input value={novoSonho} onChange={(e) => setNovoSonho(e.target.value)} placeholder='ex.: "Bater R$ 1 mi de captação até março/2027"' className="bg-white border-nz-borda text-nz-tinta" />
              <Button
                disabled={salvando || !novoSonho.trim()}
                onClick={() => { salvarPerfil({ sonhos: [...sonhos, { titulo: novoSonho.trim() }] }); setNovoSonho(''); }}
                className="bg-nz-verde hover:bg-nz-verde-claro text-white shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        )}

        {/* ══ ✅ HÁBITO 2 — MASTER TASK (o Trello do dia) ══ */}
        {painel === 'compromisso' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => mudarDia(-1)}><ChevronLeft className="w-5 h-5 text-nz-tinta" /></Button>
                <p className="text-sm font-bold text-nz-tinta capitalize min-w-[180px] text-center">{fmtDia(dia)}{dia === hojeStr() ? ' · HOJE' : ''}</p>
                <Button variant="ghost" size="icon" onClick={() => mudarDia(1)}><ChevronRight className="w-5 h-5 text-nz-tinta" /></Button>
              </div>
              <p className="text-sm font-semibold text-nz-tinta">{progresso.feitas}/{progresso.total} feitas · {progresso.pct.toFixed(0)}%</p>
            </div>
            <div className="h-2 rounded-full bg-nz-cinza-fundo overflow-hidden">
              <div className="bg-nz-verde h-full transition-all" style={{ width: `${progresso.pct}%` }} />
            </div>

            {tarefas.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-nz-tinta-fraca">Dia sem Master Task ainda. "O compromisso é uma decisão diária."</p>
                <Button onClick={gerarDia} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white">
                  ⚡ {salvando ? 'Gerando...' : 'Gerar meu dia (rotina do método)'}
                </Button>
                <p className="text-[11px] text-nz-tinta-fraca">Cria as {rotina.length} tarefas da rotina — das 5h ao fechamento do dia.</p>
              </div>
            ) : (
              PERIODOS.map((p) => {
                const doPeriodo = tarefas.filter((t) => periodoDe(t.hora) === p.id);
                if (doPeriodo.length === 0) return null;
                return (
                  <div key={p.id}>
                    <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">{p.label}</p>
                    <div className="space-y-1.5">
                      {doPeriodo.map((t) => (
                        <div key={t.id} className={`flex items-center gap-2.5 rounded-lg border p-2.5 ${t.feito ? 'border-nz-verde/30 bg-nz-verde-fundo/50' : 'border-nz-borda bg-white'}`}>
                          <input type="checkbox" checked={!!t.feito} onChange={() => alternarFeito(t)} className="w-4 h-4 accent-green-600 shrink-0 cursor-pointer" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${t.feito ? 'line-through text-nz-tinta-fraca' : 'text-nz-tinta font-medium'}`}>
                              {t.hora && <span className="font-bold">{t.hora} · </span>}{t.titulo}
                            </p>
                            {t.detalhe && !t.feito && <p className="text-[11px] text-nz-tinta-fraca truncate">{t.detalhe}</p>}
                          </div>
                          <button type="button" onClick={() => removerTarefa(t)} className="text-nz-tinta-fraca/50 hover:text-red-600 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}

            <div className="flex gap-2 pt-1">
              <Input type="time" value={novaTarefa.hora} onChange={(e) => setNovaTarefa({ ...novaTarefa, hora: e.target.value })} className="bg-white border-nz-borda text-nz-tinta w-28 shrink-0" />
              <Input value={novaTarefa.titulo} onChange={(e) => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })} placeholder="nova tarefa do dia..." className="bg-white border-nz-borda text-nz-tinta" />
              <Button onClick={addTarefa} disabled={!novaTarefa.titulo.trim()} className="bg-nz-verde hover:bg-nz-verde-claro text-white shrink-0"><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* ══ 🤝 HÁBITO 3 — LISTA DE NETWORK (qualificada 1-5) ══ */}
        {painel === 'lista' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-nz-tinta-fraca">{listaOrdenada.length} pessoas na sua lista · qualifique de 1 a 5 estrelas</p>
              <Button size="sm" onClick={onNovoCliente} className="bg-nz-verde hover:bg-nz-verde-claro text-white">
                <UserPlus className="w-4 h-4 mr-1" /> Adicionar pessoa
              </Button>
            </div>
            {listaOrdenada.length === 0 ? (
              <p className="text-sm text-nz-tinta-fraca py-4 text-center">Sua lista começa aqui — adicione as pessoas da sua agenda.</p>
            ) : (
              <div className="space-y-1.5">
                {listaOrdenada.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-nz-borda bg-white p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-nz-tinta truncate">{c.full_name || 'Sem nome'}</p>
                      <p className="text-[11px] text-nz-tinta-fraca truncate">{[c.phone, c.email].filter(Boolean).join(' · ') || 'sem contato'}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {QUALIFICACOES.map((n) => (
                        <button key={n} type="button" onClick={() => onQualificar?.(c, n)} title={`${n} estrela(s)`}>
                          <Star className={`w-4 h-4 ${((c.qualificacao || 0) >= n) ? 'text-amber-500 fill-amber-500' : 'text-nz-borda'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ 📜 HÁBITO 4 — CONTATO E CONVITE (o SEU script) ══ */}
        {painel === 'contato' && (
          <div className="space-y-3">
            <div className="rounded-lg bg-nz-cinza-fundo/60 border border-nz-borda p-3 text-xs text-nz-tinta-fraca">
              📖 Antes do convite, o F.O.R.M. da pessoa: <strong>F</strong>amília · <strong>O</strong>cupação · <strong>R</strong>ecreação · <strong>M</strong>ensagem certa — você preenche na ficha de cada pessoa (Hábito 6 → Clientes).
            </div>
            <p className="text-xs text-nz-tinta-fraca">Escreva o SEU script de convite — o método ensina, mas a voz é sua. Aperfeiçoe a cada conversa.</p>
            <Textarea value={script} onChange={(e) => setScript(e.target.value)} rows={8} placeholder={EXEMPLO_SCRIPT} className="bg-white border-nz-borda text-nz-tinta text-sm" />
            <Button onClick={() => salvarPerfil({ script })} disabled={salvando} className="bg-nz-verde hover:bg-nz-verde-claro text-white">
              <Save className="w-4 h-4 mr-2" /> {salvando ? 'Salvando...' : 'Salvar meu script'}
            </Button>
          </div>
        )}

        {/* ══ 🎤 HÁBITO 5 — APRESENTAÇÃO DE SUCESSO (agenda) ══ */}
        {painel === 'apresentacao' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <p className={`text-sm font-bold ${reunioesHoje >= 3 ? 'text-nz-verde' : 'text-nz-tinta'}`}>📅 Hoje: {reunioesHoje} de 3 reuniões (meta do método)</p>
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
            <div className="rounded-lg border border-nz-borda p-3 space-y-2">
              <p className="text-xs font-semibold text-nz-tinta">🎤 Apresentação oficial do negócio</p>
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
            <div className="space-y-2">
              {HABITOS.map((h) => (
                <div key={h.n} className="rounded-lg border border-nz-borda p-3">
                  <p className="text-sm font-bold text-nz-tinta"><span className="text-nz-verde">{h.n}. {h.titulo}</span><span className="text-nz-tinta-fraca font-normal"> — {h.sub}</span></p>
                  <p className="text-sm text-nz-tinta-fraca mt-0.5">{h.texto}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-dashed border-nz-verde/40 bg-nz-verde-fundo/40 p-4 text-center">
              <p className="text-sm font-semibold text-nz-tinta">🎓 Local de treinamento do time</p>
              <p className="text-xs text-nz-tinta-fraca mt-1">Aqui entram os materiais oficiais (vídeos, decks, trilha do novo executivo). Estrutura pronta — os conteúdos entram conforme o time for gravando.</p>
            </div>
            <p className="text-xs text-nz-tinta-fraca text-center italic">"A disciplina é a ponte entre objetivos e realização." — Jim Rohn</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
