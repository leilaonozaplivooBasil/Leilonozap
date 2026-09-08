import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, NotebookText, Search, Sparkles, Camera as CameraIcon } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { diarioAgrupado, filtrarDiario } from '@/lib/diarioDeBolso';

// 📔 DIÁRIO DE BOLSO — Fase 1 (dono, 08/09/2026): "anotar e documentar os
// passos, tarefas e etc dos usuários de forma automática pra que tudo que
// foi feito e aprendido esteja de fácil acesso pra eles conseguirem
// acessar/recapitular/conferir".
//
// FASE 1 É SÓ LEITURA — decisão do dono: "montar numa aba nova para evitar
// desde conflitos a bugs no código e na experiência do usuário". Não cria
// tabela, não cria cron, não grava nada: lê as tarefas já feitas da própria
// pessoa e monta o diário NA HORA (a régua pura vive em lib/diarioDeBolso).
// Se o formato agradar, uma Fase 2 decide se vale persistir.
const fmtDia = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
};

export default function DiarioDeBolso({ currentUser = null }) {
  const uid = currentUser?.id;
  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');

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
        setTarefas(Array.isArray(data) ? data : []);
        setCarregando(false);
      });
    return () => { vivo = false; };
  }, [uid]);

  const dias = useMemo(() => diarioAgrupado(tarefas), [tarefas]);
  const diasVisiveis = useMemo(() => filtrarDiario(dias, busca), [dias, busca]);
  const comTexto = useMemo(() => tarefas.reduce((n, t) => n + (t.comprovacao ? 1 : 0), 0), [tarefas]);

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
              Tudo que você já fez e aprendeu, dia a dia — montado sozinho a partir das suas tarefas, sem você precisar escrever nada a mais.
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
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
