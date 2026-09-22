import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Loader2, CalendarPlus, LayoutGrid, X, Check, Network } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';
import { caixaDeEntrada, porDiaDeAnotacao, rotuloDoDia, rotuloDaOrigem } from '@/lib/demandas';
import { tarefaDaDemanda, cardDaDemanda } from '@/lib/encontro';

// 🧠 DEMANDAS — a caixa de entrada da mente, dentro do Compromisso.
//
// PEDIDO DO DONO (áudio de 19/09/2026, 10h32):
//   "no compromisso, a gente tem que criar uma aba de demandas. Eu abri o
//    compromisso, já vai aparecer ali um lugar com as demandas que eu posso
//    transformar em tarefa."
//   "estou numa reunião, o pessoal está falando o que tem que fazer, eu só vou
//    esvaziando a mente… entra numa lista com a data do dia que foi anotado. E
//    automaticamente eu já transformo isso e direciono para onde eu quero."
//
// 🔴 ESTA ABA FOI CORTADA POR MIM EM 21/09, E O CORTE ESTAVA ERRADO.
// Ao reusar `xperf_demandas` (decisão certa), concluí que a aba ficava
// desnecessária porque o Painel Corporativo já mostra a fila. Mas o Painel é
// tela de GESTÃO — o pedido era "abro o Compromisso e já vejo o que anotei".
// São coisas diferentes, e só uma delas foi pedida aqui.
//
// O QUE ESTA TELA NÃO É: um segundo sistema de tarefas. Ela LÊ a mesma
// `xperf_demandas` do Encontro e do Painel, e ao transformar usa as MESMAS
// funções (`tarefaDaDemanda`, `cardDaDemanda`) — o destino é o quadro e a
// jornada que já existem.

// 🗺️ 22/09 — o quarto destino fecha a frase do áudio: "dali eu transformo em
// ou mapa mental, PARA ABRIR o mapa mental, ou no quadro". É para a anotação
// que ainda não é tarefa porque ainda não está pensada.
//
// 🔴 Ele é o único que NÃO tira a demanda da caixa: o mapa é o desenho do
// pensamento, não um destino. Ela vira trabalho quando virar tarefa ou
// cartão — não quando alguém resolve pensar nela. Por isso fica por último,
// separado dos três que criam trabalho de verdade.
const DESTINOS = [
  { id: 'dia', rotulo: 'Minha jornada', Icone: CalendarPlus, dica: 'vira tarefa do dia' },
  { id: 'quadro', rotulo: 'Meu quadro', Icone: LayoutGrid, dica: 'vira cartão' },
  { id: 'ambos', rotulo: 'Os dois', Icone: Check, dica: 'tarefa + cartão' },
  { id: 'mapa', rotulo: 'Abrir no mapa', Icone: Network, dica: 'pensar antes — fica na caixa' },
];

export default function DemandasCompromisso({ uid, hojeISO, nome = null, onMudou = null, onAbrirNoMapa = null }) {
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [abrindo, setAbrindo] = useState(null);   // id da demanda com o seletor aberto
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!uid) { setCarregando(false); return; }
    const { data } = await supabase
      .from('xperf_demandas').select('*')
      .eq('pessoa_id', uid).order('created_at', { ascending: false }).limit(300);
    setLinhas(Array.isArray(data) ? data : []);
    setCarregando(false);
  }, [uid]);

  useEffect(() => { carregar(); }, [carregar]);

  const grupos = useMemo(() => porDiaDeAnotacao(linhas), [linhas]);
  const esperando = useMemo(() => caixaDeEntrada(linhas).length, [linhas]);

  // ✅ transformar em trabalho — MESMO caminho do Painel Corporativo.
  const transformar = async (d, destino) => {
    // 🗺️ o mapa não é transformação: nada é criado, nada sai da caixa. Só
    // leva o pensamento pra ser desenhado. Por isso sai antes de tudo.
    if (destino === 'mapa') {
      setAbrindo(null);
      onAbrirNoMapa?.(d);
      return;
    }
    setSalvando(true);
    let tarefaId = null; let cardId = null;
    try {
      if (destino !== 'quadro') {
        // a tarefa nasce HOJE: a demanda que o dono está olhando agora é a que
        // ele quer fazer agora. Reagendar é um toque no quadro, depois.
        const { data: jaNoDia } = await supabase
          .from('metodo_tarefas').select('id').eq('user_id', uid).eq('data', hojeISO);
        const ordem = Array.isArray(jaNoDia) ? jaNoDia.length : 0;
        const linha = tarefaDaDemanda({ ...d, pessoa_id: uid }, { dia: hojeISO, ordem });
        const { data, error } = await supabase.from('metodo_tarefas').insert(linha).select();
        if (error) throw error;
        tarefaId = (Array.isArray(data) ? data[0] : data)?.id || null;
      }
      if (destino !== 'dia') {
        const linha = cardDaDemanda({ ...d, pessoa_id: uid }, { tarefaId, responsavelNome: nome });
        const { data } = await supabase.from('metodo_quadro').insert(linha).select();
        cardId = (Array.isArray(data) ? data[0] : data)?.id || null;
      }
      // 🔒 só sai da caixa DEPOIS de virar trabalho de verdade. Marcar antes
      // deixaria a demanda sumir sem nada ter sido criado.
      await supabase.from('xperf_demandas').update({
        status: 'agendada',
        agendada_para: destino === 'quadro' ? null : hojeISO,
        tarefa_id: tarefaId, card_id: cardId,
        updated_at: new Date().toISOString(),
      }).eq('id', d.id);

      toast.success(destino === 'quadro' ? `"${d.titulo}" foi pro quadro` : `"${d.titulo}" entrou na sua jornada de hoje`);
      setAbrindo(null);
      await carregar();
      onMudou?.();
    } catch {
      toast.error('Não consegui transformar — tenta de novo');
    } finally {
      setSalvando(false);
    }
  };

  const descartar = async (d) => {
    if (!window.confirm(`Descartar "${d.titulo}"?`)) return;
    await supabase.from('xperf_demandas')
      .update({ status: 'devolvida', devolvida_motivo: 'descartada pelo dono', updated_at: new Date().toISOString() })
      .eq('id', d.id);
    await carregar();
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-16 text-white/50" data-teste="demandas-carregando">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!esperando) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center" data-teste="demandas-vazio">
        <Inbox className="mx-auto h-8 w-8 text-white/25" />
        <p className="mt-3 text-sm font-bold text-white/80">Sua mente está vazia</p>
        <p className="mt-1 text-xs text-white/45">
          O que você anotar no Mapa — ou o que te pedirem — aparece aqui, pelo dia em que foi anotado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-teste="demandas-lista">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-nz-verde-neon">
        {esperando} {esperando === 1 ? 'demanda esperando' : 'demandas esperando'}
      </p>

      {grupos.map(({ dia, demandas }) => (
        <section key={dia || 'sem-data'} data-teste="demandas-dia">
          <h3 className="mb-2 text-xs font-bold text-white/55">{rotuloDoDia(dia, hojeISO)}</h3>
          <ul className="space-y-1.5">
            {demandas.map((d) => (
              <li key={d.id} className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5" data-teste="demanda">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-white">{d.titulo}</p>
                    <p className="mt-0.5 text-[10.5px] text-white/40">{rotuloDaOrigem(d.origem)}</p>
                  </div>
                  <button
                    type="button" onClick={() => descartar(d)} title="descartar"
                    className="shrink-0 rounded p-1 text-white/30 hover:bg-white/10 hover:text-nz-fogo-claro"
                    data-teste="demanda-descartar"
                  ><X className="h-3.5 w-3.5" /></button>
                </div>

                {abrindo === d.id ? (
                  <div className="mt-2 flex flex-wrap gap-1.5" data-teste="demanda-destinos">
                    {DESTINOS.map(({ id, rotulo, Icone, dica }) => (
                      <button
                        key={id} type="button" disabled={salvando}
                        onClick={() => transformar(d, id)} title={dica}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-nz-verde-neon/40 bg-nz-verde-neon/10 px-2.5 py-1.5 text-[11px] font-bold text-nz-verde-neon hover:bg-nz-verde-neon/20 disabled:opacity-50"
                      ><Icone className="h-3 w-3" />{rotulo}</button>
                    ))}
                    <button
                      type="button" onClick={() => setAbrindo(null)}
                      className="rounded-lg px-2 py-1.5 text-[11px] text-white/40 hover:text-white/70"
                    >cancelar</button>
                  </div>
                ) : (
                  <button
                    type="button" onClick={() => setAbrindo(d.id)}
                    className="mt-1.5 text-[11px] font-bold text-nz-verde-neon hover:text-white"
                    data-teste="demanda-transformar"
                  >transformar em tarefa →</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
