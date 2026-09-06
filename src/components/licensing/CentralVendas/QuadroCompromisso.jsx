import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, CalendarPlus, AlertTriangle } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { plataforma } from '@/api/plataformaAdapter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useArrastavel from '@/hooks/useArrastavel';
import {
  COLUNAS_QUADRO, moverCartao, tarefaDoCartao, resumoDoQuadro,
} from '@/lib/quadroCompromisso';
import { ferramentaDaTarefa } from '@/lib/ferramentaDaTarefa';
import { HABITOS } from '@/lib/metodo';

// 🗂️ O NOSSO QUADRO — a mesa de trabalho dentro do Compromisso (Hábito 2).
//
// Ordem do dono (06/09/2026): "a gente precisa de um ambiente dentro da
// organização que lembre um Trello, só que mais fluido... e a gente fazer o
// nosso Trello, o nosso, ALI." É o ambiente da tarefa das 10:30 — prioridades,
// pipeline, contratos, pendências.
//
// O QUE FAZ ELE SER "MAIS FLUIDO" E NÃO UM TRELLO A MAIS:
//   • as colunas são HORIZONTES (Hoje · Esta semana · Depois · Feito), que é a
//     pergunta que a pessoa faz de manhã — e não etapas, que obrigam a mover a
//     mesma coisa três vezes;
//   • escrever é uma linha só, sem abrir modal: o atrito de cadastrar é o que
//     mata quadro de organização pessoal;
//   • o cartão LEVA PRA FERRAMENTA do Hábito dele, igual à linha da tarefa;
//   • e vira tarefa do dia em um clique, que é a frase do dono ("já vai entrar
//     na minha reunião do dia").

function Cartao({ cartao, onMover, onExcluir, onVirarTarefa, onIr }) {
  const [sobre, setSobre] = useState(null);
  const { arrastando, alcas, engolirCliqueDoArrasto } = useArrastavel({
    aoSoltar: ({ x, y }) => {
      const alvo = document.elementFromPoint(x, y)?.closest('[data-coluna-quadro]');
      setSobre(null);
      const destino = alvo?.getAttribute('data-coluna-quadro');
      if (destino && destino !== cartao.coluna) onMover(cartao, destino);
    },
    aoMover: ({ x, y }) => {
      const alvo = document.elementFromPoint(x, y)?.closest('[data-coluna-quadro]');
      setSobre(alvo?.getAttribute('data-coluna-quadro') || null);
    },
  });

  const habito = HABITOS.find((h) => h.n === cartao.habito);
  // a ferramenta vem do Hábito marcado no cartão; se não tiver, tenta pelo
  // título — a mesma régua da linha da tarefa, pra não existirem duas
  const ferramenta = habito
    ? { secao: habito.id, rotulo: habito.completo, habito: habito.n }
    : ferramentaDaTarefa(cartao.titulo);
  const jaVirou = !!cartao.virou_tarefa_id;

  return (
    <div
      {...alcas}
      onClickCapture={engolirCliqueDoArrasto}
      data-teste="cartao-quadro"
      className={`rounded-xl border p-2.5 text-left transition-all ${
        arrastando ? 'border-nz-verde/60 opacity-80 scale-[1.02]' : 'border-nz-borda hover:border-nz-verde/40'
      }`}
      style={{ background: 'var(--nz-cartao, rgba(255,255,255,0.04))', cursor: arrastando ? 'grabbing' : 'grab' }}
    >
      <p className="text-[13px] font-bold leading-snug text-nz-tinta">{cartao.titulo}</p>
      {cartao.detalhe && <p className="mt-1 text-[11px] leading-snug text-nz-tinta-fraca">{cartao.detalhe}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
        {habito && <span className="rounded-full bg-nz-verde/15 px-2 py-0.5 font-bold text-nz-verde">Hábito {habito.n}</span>}
        {cartao.responsavel_nome && <span className="rounded-full bg-nz-borda/40 px-2 py-0.5 text-nz-tinta-fraca">{cartao.responsavel_nome}</span>}
        {cartao.prazo && <span className="rounded-full bg-nz-borda/40 px-2 py-0.5 text-nz-tinta-fraca">até {String(cartao.prazo).slice(8, 10)}/{String(cartao.prazo).slice(5, 7)}</span>}
        {jaVirou && <span className="rounded-full bg-nz-verde/15 px-2 py-0.5 font-bold text-nz-verde">✓ no dia</span>}
      </div>

      {sobre && sobre !== cartao.coluna && (
        <p className="mt-1.5 text-[10px] font-bold text-nz-verde">
          soltar em “{COLUNAS_QUADRO.find((c) => c.id === sobre)?.nome}”
        </p>
      )}

      <div className="mt-2 flex items-center gap-2.5">
        {ferramenta && (
          <button
            type="button"
            onClick={() => onIr?.(ferramenta.secao, ferramenta.sub)}
            title={`Abrir ${ferramenta.rotulo}`}
            className="text-[11px] font-semibold text-nz-verde hover:text-nz-verde-claro"
          >🔗 abrir →</button>
        )}
        {cartao.coluna !== 'feito' && (
          <button
            type="button"
            disabled={jaVirou}
            onClick={() => onVirarTarefa(cartao)}
            title={jaVirou ? 'este cartão já entrou no seu dia' : 'entra na sua Master Task de hoje'}
            className={`text-[11px] font-semibold inline-flex items-center gap-1 ${
              jaVirou ? 'text-nz-tinta-fraca/50 cursor-not-allowed' : 'text-nz-tinta-fraca hover:text-nz-verde'
            }`}
          ><CalendarPlus className="w-3 h-3" /> {jaVirou ? 'já está no dia' : 'pro meu dia'}</button>
        )}
        <button type="button" onClick={() => onExcluir(cartao)} className="ml-auto text-nz-tinta-fraca/50 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function QuadroCompromisso({ currentUser, hojeISO, onIr, onTarefaCriada }) {
  const uid = currentUser?.id || null;
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const [cartoes, setCartoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState('');
  const [coluna, setColuna] = useState('hoje');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    if (!uid) { setCarregando(false); return; }
    const { data, error } = await supabase.from('metodo_quadro')
      .select('*').eq('user_id', uid).order('ordem', { ascending: true });
    // tabela ainda sem migração → mesa vazia, sem quebrar a tela do dia
    setCartoes(error || !Array.isArray(data) ? [] : data);
    setCarregando(false);
  }, [uid]);

  useEffect(() => { carregar(); }, [carregar]);

  const resumo = useMemo(() => resumoDoQuadro(cartoes, hoje), [cartoes, hoje]);

  const criar = async () => {
    const titulo = novo.trim();
    if (!titulo || !uid) return;
    setSalvando(true);
    // o Hábito sai do próprio título — a mesma régua da linha da tarefa, pra
    // a pessoa não ter que classificar nada na mão
    const f = ferramentaDaTarefa(titulo);
    const linha = { user_id: uid, titulo, coluna, habito: f?.habito || null, ordem: cartoes.length };
    const { data, error } = await supabase.from('metodo_quadro').insert(linha).select().single();
    setSalvando(false);
    if (error) { toast.error('Não deu pra salvar o cartão'); return; }
    setCartoes((l) => [...l, data]);
    setNovo('');
  };

  const mover = async (cartao, destino) => {
    setCartoes((l) => moverCartao(l, cartao.id, destino)); // resposta na hora
    const { error } = await supabase.from('metodo_quadro')
      .update({ coluna: destino, updated_at: new Date().toISOString() }).eq('id', cartao.id);
    if (error) { toast.error('Não moveu — recarregando'); carregar(); }
  };

  const excluir = async (cartao) => {
    setCartoes((l) => l.filter((c) => c.id !== cartao.id));
    const { error } = await supabase.from('metodo_quadro').delete().eq('id', cartao.id);
    if (error) { toast.error('Não excluiu — recarregando'); carregar(); }
  };

  // 🔗 a frase do dono: "já vai entrar na minha reunião do dia"
  //
  // ⚠️ A TAREFA É CRIADA PELA ENTIDADE, NÃO PELO SUPABASE DIRETO. A primeira
  // versão deste arquivo fazia `supabase.from('metodo_tarefas').insert(...)` e
  // a prova em navegador pegou: o resto do app inteiro escreve tarefa por
  // `plataforma.entities.MetodoTarefa`, que passa pelo entityWrite. Dois
  // caminhos de escrita pra mesma tabela é como uma regra de servidor passa a
  // valer só metade das vezes. O quadro em si (metodo_quadro) segue no supabase
  // direto, como as tabelas novas do X-Game — essa é a diferença: tabela sem
  // entidade registrada usa o cliente; tabela COM entidade usa a entidade.
  const virarTarefa = async (cartao) => {
    const linha = tarefaDoCartao(cartao, { userId: uid, dataISO: hoje });
    if (!linha) { toast.message('Este cartão já entrou no seu dia.'); return; }
    let criada = null;
    try {
      criada = await plataforma.entities.MetodoTarefa.create(linha);
    } catch (e) {
      console.error(e);
      toast.error('Não deu pra pôr no dia');
      return;
    }
    const carimbo = { virou_tarefa_id: criada?.id || 'sem-id', virou_tarefa_em: new Date().toISOString() };
    setCartoes((l) => l.map((c) => (c.id === cartao.id ? { ...c, ...carimbo } : c)));
    await supabase.from('metodo_quadro').update(carimbo).eq('id', cartao.id);
    toast.success(`"${cartao.titulo}" entrou na sua Master Task de hoje.`);
    onTarefaCriada?.(criada || { ...linha, id: carimbo.virou_tarefa_id });
  };

  if (carregando) {
    return <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-nz-tinta-fraca" /></div>;
  }

  return (
    <div className="space-y-3" data-teste="quadro-compromisso">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-bold text-nz-tinta">🗂️ O nosso quadro</p>
          <p className="text-[11px] text-nz-tinta-fraca">
            a mesa da organização do negócio — prioridades, pipeline, contratos e pendências
          </p>
        </div>
        <p className="text-[11px] text-nz-tinta-fraca tabular-nums">
          {resumo.abertos} abertos
          {resumo.atrasados > 0 && (
            <span className="ml-2 font-bold text-orange-500 inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {resumo.atrasados} passou do prazo
            </span>
          )}
        </p>
      </div>

      {/* escrever é UMA LINHA, sem modal: atrito de cadastro é o que mata
          quadro de organização pessoal */}
      <div className="flex gap-2 flex-wrap">
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') criar(); }}
          placeholder="o que precisa ser organizado? ex.: pegar as pautas da reunião de amanhã"
          className="flex-1 min-w-[220px] bg-white border-nz-borda text-nz-tinta text-sm h-10"
        />
        <select value={coluna} onChange={(e) => setColuna(e.target.value)} className="rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-10 px-3">
          {COLUNAS_QUADRO.filter((c) => c.id !== 'feito').map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <Button onClick={criar} disabled={salvando || !novo.trim()} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-10">
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {COLUNAS_QUADRO.map((c) => {
          const daColuna = cartoes.filter((x) => x.coluna === c.id);
          return (
            <div key={c.id} data-coluna-quadro={c.id}
              className="rounded-xl border border-nz-borda/60 p-2 min-h-[140px] bg-nz-borda/10">
              <p className="text-[11px] font-bold text-nz-tinta">{c.nome} <span className="text-nz-tinta-fraca">{daColuna.length}</span></p>
              <p className="text-[9px] text-nz-tinta-fraca mb-2 leading-snug">{c.ajuda}</p>
              <div className="space-y-2">
                {daColuna.map((cartao) => (
                  <Cartao key={cartao.id} cartao={cartao} onMover={mover} onExcluir={excluir} onVirarTarefa={virarTarefa} onIr={onIr} />
                ))}
                {!daColuna.length && <p className="text-[10px] text-nz-tinta-fraca/50 py-2 text-center">vazio</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
