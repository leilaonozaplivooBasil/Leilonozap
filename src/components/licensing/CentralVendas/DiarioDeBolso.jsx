import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, NotebookText, Search, Sparkles, Camera as CameraIcon, MessageSquarePlus, Pencil, Check, X as XIcon, ScrollText } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { plataforma } from '@/api/plataformaClient';
import { diarioAgrupado, filtrarDiario, linhaParaGravar, tarefasParaMaterializar } from '@/lib/diarioDeBolso';
import { semanaDe } from '@/lib/metodo';

// 📔 DIÁRIO DE BOLSO — dono, 08/09/2026: "anotar e documentar os passos,
// tarefas e etc dos usuários de forma automática pra que tudo que foi feito
// e aprendido esteja de fácil acesso pra eles conseguirem
// acessar/recapitular/conferir".
//
// FASE 1 (só leitura): lê as tarefas já feitas da própria pessoa e monta o
// diário NA HORA (a régua pura vive em lib/diarioDeBolso).
//
// FASE 2 (dono: "prepare o terreno" → "prossiga"), duas coisas novas:
//   1. NOTA PESSOAL — a pessoa pode escrever por cima do texto automático.
//      É a única coisa que esta tela GRAVA de propósito, quando a pessoa
//      aperta salvar.
//   2. MATERIALIZAÇÃO AUTOMÁTICA em segundo plano — sempre que a tela
//      monta, o que ainda não virou linha em `diario_bolso_entradas` é
//      gravado sozinho ("de forma automática", a palavra do dono), sem
//      travar a leitura e sem avisar nada se falhar (é best-effort: a
//      LEITURA da lista nunca depende da tabela nova, só a nota depende).
// A lista em si continua vindo de `metodo_tarefas` — sempre fresca, nunca
// desatualiza mesmo que a materialização de fundo ainda não tenha rodado.
//
// FASE 3 (dono: "prepare o terreno" → "analisado, prossiga"): o resumo
// narrado da semana. DECISÃO DE CUSTO — a única chamada de IA desta tela é
// MANUAL, por clique, nunca automática: ler o resumo já gerado é de graça
// (só um select), e cada "gerar" é UM clique = UMA chamada, nunca um cron
// gerando pra todo mundo sozinho. Isso é o dono quem decide depois.
const fmtDia = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
};

export default function DiarioDeBolso({ currentUser = null }) {
  const uid = currentUser?.id;
  const [tarefas, setTarefas] = useState([]);
  const [notas, setNotas] = useState({}); // { [tarefa_id]: nota_pessoal }
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');
  const [notaAberta, setNotaAberta] = useState(null); // tarefa_id em edição
  const [rascunho, setRascunho] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [semanaInicio] = useState(() => semanaDe(new Date().toISOString().slice(0, 10))?.inicio || null);
  const [resumoSemana, setResumoSemana] = useState(null); // { resumo, gerado_em } | null
  const [gerandoResumo, setGerandoResumo] = useState(false);

  useEffect(() => {
    let vivo = true;
    if (!uid) { setCarregando(false); return undefined; }
    setCarregando(true);
    setErro(false);
    supabase
      .from('metodo_tarefas')
      .select('id,data,hora,titulo,detalhe,comprovacao,categoria,habito,mentalidade')
      .eq('user_id', uid)
      .eq('feito', true)
      .order('data', { ascending: false })
      .limit(400)
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) { setErro(true); setCarregando(false); return; }
        const lista = Array.isArray(data) ? data : [];
        setTarefas(lista);
        setCarregando(false);

        // 📔 Fase 2 — nunca trava nem avisa a pessoa se falhar: a leitura
        // acima já terminou. Tabela ainda não existir (Fase 2 não
        // mergeada) é um erro esperado, não uma falha da tela.
        supabase
          .from('diario_bolso_entradas')
          .select('tarefa_id,nota_pessoal')
          .eq('user_id', uid)
          .then(({ data: entradas, error: erroEntradas }) => {
            if (!vivo || erroEntradas) return;
            const linhas = Array.isArray(entradas) ? entradas : [];
            const idsGravados = new Set(linhas.map((l) => l.tarefa_id));
            setNotas(Object.fromEntries(linhas.filter((l) => l.nota_pessoal).map((l) => [l.tarefa_id, l.nota_pessoal])));

            const faltam = tarefasParaMaterializar(lista, idsGravados);
            if (faltam.length) {
              supabase.from('diario_bolso_entradas').upsert(faltam.map((t) => linhaParaGravar(t, uid)), { onConflict: 'tarefa_id' }).then(() => {});
            }
          });
      });
    return () => { vivo = false; };
  }, [uid]);

  // Fase 3 — só LÊ o que já foi gerado (de graça, um select); nunca gera sozinha.
  useEffect(() => {
    let vivo = true;
    if (!uid || !semanaInicio) return undefined;
    supabase.from('diario_bolso_semanas').select('resumo,gerado_em').eq('user_id', uid).eq('semana_inicio', semanaInicio).maybeSingle()
      .then(({ data, error }) => { if (vivo && !error && data) setResumoSemana(data); });
    return () => { vivo = false; };
  }, [uid, semanaInicio]);

  const gerarResumoSemana = async () => {
    if (!uid || !semanaInicio || gerandoResumo) return;
    setGerandoResumo(true);
    try {
      const resp = await plataforma.functions.invoke('diarioResumoSemanal', { user_id: uid, semana_inicio: semanaInicio });
      if (resp?.ok) { setResumoSemana({ resumo: resp.resumo, gerado_em: new Date().toISOString() }); toast.success('Resumo da semana pronto.'); }
      else toast.error(resp?.error || 'Não deu pra gerar o resumo agora — tenta de novo.');
    } catch {
      toast.error('Não deu pra gerar o resumo agora — tenta de novo.');
    } finally { setGerandoResumo(false); }
  };

  const dias = useMemo(() => diarioAgrupado(tarefas, notas), [tarefas, notas]);
  const diasVisiveis = useMemo(() => filtrarDiario(dias, busca), [dias, busca]);
  const comTexto = useMemo(() => tarefas.reduce((n, t) => n + (t.comprovacao ? 1 : 0), 0), [tarefas]);

  const abrirNota = (e) => { setNotaAberta(e.id); setRascunho(e.notaPessoal || ''); };
  const fecharNota = () => { setNotaAberta(null); setRascunho(''); };
  const salvarNota = async (tarefaId) => {
    const tarefa = tarefas.find((t) => t.id === tarefaId);
    if (!tarefa) return;
    setSalvando(true);
    const linha = linhaParaGravar(tarefa, uid, rascunho.trim());
    const { error } = await supabase.from('diario_bolso_entradas').upsert(linha, { onConflict: 'tarefa_id' });
    setSalvando(false);
    if (error) { toast.error('Não deu pra salvar a nota agora — tenta de novo.'); return; }
    setNotas((n) => ({ ...n, [tarefaId]: rascunho.trim() || undefined }));
    toast.success('Nota salva no seu diário.');
    fecharNota();
  };

  return (
    <div className="space-y-3" data-teste="diario-de-bolso">
      <div className="rounded-2xl border border-white/12 bg-gradient-to-br from-white/[0.07] to-transparent p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Top College · X-EOS</p>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight flex items-center gap-2">
              <NotebookText className="w-5 h-5 text-white/50" /> Diário de bolso
            </h2>
            <p className="text-white/60 mt-0.5">
              Tudo que você já fez e aprendeu, dia a dia — montado sozinho a partir das suas tarefas. Quer completar alguma? É só comentar.
            </p>
          </div>
        </div>

        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="procurar por palavra…"
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-white/15 bg-white/[0.06] text-white text-[13px] placeholder:text-white/30 outline-none focus:border-white/30"
            data-teste="diario-busca"
          />
        </div>
      </div>

      {semanaInicio && (
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-3 sm:p-4" data-teste="diario-resumo-semana">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-200/70 mb-1.5 flex items-center gap-1.5">
            <ScrollText className="w-3.5 h-3.5" /> resumo da semana
          </p>
          {resumoSemana ? (
            <>
              <p className="text-white/80 text-[13px] leading-relaxed whitespace-pre-line">{resumoSemana.resumo}</p>
              <button type="button" onClick={gerarResumoSemana} disabled={gerandoResumo} className="mt-2 text-[11px] text-white/30 hover:text-white/60 disabled:opacity-40" data-teste="diario-resumo-gerar-de-novo">
                {gerandoResumo ? 'gerando…' : 'gerar de novo'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={gerarResumoSemana}
              disabled={gerandoResumo}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 px-3 py-1.5 text-[12px] font-semibold text-emerald-200"
              data-teste="diario-resumo-gerar"
            >
              {gerandoResumo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScrollText className="w-3.5 h-3.5" />}
              {gerandoResumo ? 'gerando…' : 'gerar o resumo da semana'}
            </button>
          )}
        </section>
      )}

      {carregando && (
        <p className="text-[11px] text-white/40 py-2 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> montando o seu diário…</p>
      )}

      {!carregando && erro && (
        <p className="text-[11px] text-amber-200/80 py-2">Não deu pra carregar agora — tenta de novo em instantes.</p>
      )}

      {!carregando && !erro && dias.length === 0 && (
        <p className="text-[11px] text-white/40 py-2">Ainda não tem nada por aqui — assim que você marcar a primeira tarefa como feita, ela vira a primeira página do seu diário.</p>
      )}

      {!carregando && !erro && dias.length > 0 && diasVisiveis.length === 0 && (
        <p className="text-[11px] text-white/40 py-2">Nada com &quot;{busca}&quot; no seu diário ainda.</p>
      )}

      {!carregando && !erro && dias.length > 0 && (
        <p className="text-[10px] text-white/30" data-teste="diario-resumo">
          {tarefas.length} tarefa{tarefas.length === 1 ? '' : 's'} feita{tarefas.length === 1 ? '' : 's'} em {dias.length} dia{dias.length === 1 ? '' : 's'} · {comTexto} com comprovação
        </p>
      )}

      <div className="space-y-3">
        {diasVisiveis.map((dia) => (
          <section key={dia.data} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4" data-teste="diario-dia" data-dia={dia.data}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/50 capitalize mb-2">{fmtDia(dia.data)}</p>
            <ul className="space-y-2">
              {dia.entradas.map((e) => (
                <li key={e.id} className="rounded-xl bg-white/[0.04] px-3 py-2" data-teste="diario-entrada">
                  <div className="flex items-center gap-2 flex-wrap">
                    {e.hora && <span className="text-white/40 text-[11px] tabular-nums shrink-0">{e.hora}</span>}
                    <span className="font-semibold text-white/90 text-[13px]">{e.titulo}</span>
                    {e.temFoto && <CameraIcon className="w-3 h-3 text-white/30 shrink-0" />}
                  </div>
                  {e.texto && (
                    <p className="mt-1 text-white/65 text-[12px] leading-relaxed flex gap-1.5">
                      <Sparkles className="w-3 h-3 text-white/25 shrink-0 mt-0.5" />
                      <span>{e.texto}</span>
                    </p>
                  )}

                  {e.notaPessoal && notaAberta !== e.id && (
                    <p className="mt-1.5 text-emerald-200/80 text-[12px] leading-relaxed flex gap-1.5 items-start">
                      <span className="shrink-0 mt-0.5">📝</span>
                      <span className="flex-1">{e.notaPessoal}</span>
                      <button type="button" onClick={() => abrirNota(e)} className="shrink-0 text-white/30 hover:text-white/60" title="editar a nota" data-teste="diario-editar-nota">
                        <Pencil className="w-3 h-3" />
                      </button>
                    </p>
                  )}

                  {!e.notaPessoal && notaAberta !== e.id && (
                    <button
                      type="button"
                      onClick={() => abrirNota(e)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60"
                      data-teste="diario-adicionar-nota"
                    >
                      <MessageSquarePlus className="w-3 h-3" /> comentar
                    </button>
                  )}

                  {notaAberta === e.id && (
                    <div className="mt-1.5 flex items-start gap-1.5">
                      <textarea
                        autoFocus
                        value={rascunho}
                        onChange={(ev) => setRascunho(ev.target.value)}
                        placeholder="o que você quer lembrar sobre isso?"
                        rows={2}
                        className="flex-1 rounded-lg border border-white/15 bg-white/[0.06] text-white text-[12px] placeholder:text-white/30 outline-none focus:border-white/30 px-2 py-1.5 resize-none"
                        data-teste="diario-nota-campo"
                      />
                      <div className="flex flex-col gap-1 shrink-0">
                        <button type="button" disabled={salvando} onClick={() => salvarNota(e.id)} className="w-6 h-6 rounded-md bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-200 grid place-items-center disabled:opacity-40" title="salvar" data-teste="diario-nota-salvar">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={fecharNota} className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 text-white/50 grid place-items-center" title="cancelar" data-teste="diario-nota-cancelar">
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
