import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { nomeExibicao } from '@/lib/xgame';
import { timeCorporativo } from '@/lib/timeCorporativo';
import { laudoDoDia, resumoDoLaudo, linhaTecnica, diasComComprovacao } from '@/lib/relatorioComprovacoes';
import { podeVerLaudo } from '@/lib/quemVeOLaudo';
import BotaoLaudoPdf from './PdfComprovacoes';

// 📄 A TELA SÓ-LAUDO — 10/09/2026.
//
// Dono, escolhendo entre os três caminhos: "3. A" — uma tela só de laudo pra
// quem precisa atender a reclamação, sem a fila do gestor.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ELA EXISTE EM VEZ DE ABRIR A FILA
// ═══════════════════════════════════════════════════════════════════════════
// O painel de comprovações do gestor traz, no mesmo lugar, a fila inteira E
// os botões de APROVAR e REPROVAR. Liberar aquilo pra quem só precisa LER um
// laudo daria, de brinde, o poder de mudar o dia de qualquer pessoa — e
// reprovar devolve a tarefa pro pendente, ou seja, mexe no placar dela.
//
// Aqui: escolhe a pessoa, escolhe o dia, lê e leva o PDF. Não existe botão de
// decisão nenhum, e esta tela NUNCA escreve no banco. Um teste garante isso.
//
// 🔴 O LIMITE HONESTO, MEDIDO EM 10/09/2026
// Isto é uma porta mais estreita, não um cofre. `metodo_tarefas` está com RLS
// ligada mas com policy `USING (true)` pra `public` no SELECT, no UPDATE e no
// DELETE — e todo navegador fala com o Supabase como `anon`. Ou seja: os
// dados já estão ao alcance de qualquer sessão logada, com ou sem esta tela.
// O que esta tela faz é não ENTREGAR o poder de decisão junto com a leitura.
// Fechar aquilo de verdade é outro trabalho, no servidor, e está anotado.

export default function PainelLaudo({ currentUser = null, hojeISO = null }) {
  const [usuarios, setUsuarios] = useState([]);
  const [pessoa, setPessoa] = useState('');
  const [dia, setDia] = useState('');
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const liberado = podeVerLaudo(currentUser);

  useEffect(() => {
    if (!liberado) return;
    supabase.from('app_users').select('id,full_name,nickname,role,career_levels,primary_career_level').order('full_name')
      .then(({ data }) => setUsuarios(data || []));
  }, [liberado]);

  const equipe = useMemo(() => timeCorporativo(usuarios, nomeExibicao), [usuarios]);
  const nomeDe = useCallback((id) => {
    const u = usuarios.find((x) => x.id === id);
    return u ? nomeExibicao(u) : (id ? String(id).slice(0, 6) : '—');
  }, [usuarios]);

  useEffect(() => { if (!pessoa && equipe.length) setPessoa(equipe[0].id); }, [equipe, pessoa]);

  // As comprovações da pessoa escolhida — só dela, e só leitura. O recorte de
  // 60 dias existe porque a reclamação é sempre recente; puxar o histórico
  // inteiro só encheria a tela e o limite de 1000 linhas do Supabase.
  useEffect(() => {
    if (!liberado || !pessoa) { setItens([]); return; }
    let cancelado = false;
    setCarregando(true);
    const hoje = hojeISO || new Date().toISOString().slice(0, 10);
    const de = new Date(`${hoje}T12:00:00`);
    de.setDate(de.getDate() - 60);
    supabase.from('metodo_tarefas')
      .select('id,user_id,data,hora,titulo,feito,comprovacao')
      .eq('user_id', pessoa)
      .not('comprovacao', 'is', null)
      .gte('data', de.toISOString().slice(0, 10))
      .order('data', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (cancelado) return;
        setItens(data || []);
        setCarregando(false);
      });
    return () => { cancelado = true; };
  }, [liberado, pessoa, hojeISO]);

  const dias = useMemo(() => diasComComprovacao(itens), [itens]);
  useEffect(() => { setDia((d) => (dias.includes(d) ? d : (dias[0] || ''))); }, [dias]);

  const doDia = useMemo(() => itens.filter((t) => String(t.data).slice(0, 10) === dia), [itens, dia]);
  const laudo = useMemo(() => laudoDoDia({ itens: doDia, data: dia, pessoaId: pessoa, nome: nomeDe(pessoa) }), [doDia, dia, pessoa, nomeDe]);

  if (!liberado) return null;

  const COR = { erro_do_sistema: 'text-red-300', olhar: 'text-amber-300', sem_rastro: 'text-white/40', normal: 'text-nz-verde' };

  return (
    <div className="rounded-xl border border-white/15 p-3 sm:p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.04)' }} data-teste="painel-laudo">
      <div className="flex items-center gap-2 flex-wrap">
        <FileText className="w-4 h-4 text-nz-verde" />
        <p className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">Laudo de comprovações</p>
        <span className="text-[10px] text-white/35">· só leitura — pra conferir se foi erro do sistema ou não</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          value={pessoa}
          onChange={(e) => setPessoa(e.target.value)}
          className="h-7 text-[11px] rounded-lg border border-white/10 bg-white/[0.04] text-white px-1.5"
          data-teste="laudo-pessoa"
        >
          {equipe.map((p) => <option key={p.id} value={p.id}>{nomeDe(p.id)}</option>)}
        </select>
        <select
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          disabled={!dias.length}
          className="h-7 text-[11px] rounded-lg border border-white/10 bg-white/[0.04] text-white px-1.5 disabled:opacity-40"
          data-teste="laudo-dia"
        >
          {dias.length ? dias.map((d) => <option key={d} value={d}>{`${d.slice(8, 10)}/${d.slice(5, 7)}`}</option>) : <option value="">sem comprovação</option>}
        </select>
        <span className="ml-auto"><BotaoLaudoPdf itens={doDia} data={dia} pessoaId={pessoa} nome={nomeDe(pessoa)} /></span>
      </div>

      {carregando ? (
        <p className="text-[11px] text-white/40"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> carregando…</p>
      ) : !doDia.length ? (
        <p className="text-[11px] text-white/35" data-teste="laudo-vazio">Nenhuma comprovação nesse dia.</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[11px] text-white/60">{resumoDoLaudo(laudo)}</p>
          {/* a mesma frase que vai impressa — a tela não inventa uma leitura própria */}
          <p className={`text-[11px] font-bold ${COR[laudo.veredito.sinal] || 'text-white/70'}`} data-teste="laudo-veredito" data-sinal={laudo.veredito.sinal}>
            {laudo.veredito.texto}
          </p>
          <ul className="space-y-1">
            {laudo.linhas.map((l, i) => (
              <li key={l.id || i} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px]" style={{ background: 'rgba(255,255,255,0.02)' }} data-teste="laudo-linha" data-sinal={l.leitura?.sinal}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider ${COR[l.leitura?.sinal] || 'text-white/50'}`}>{l.rotulo}</span>
                  <span className="text-white/70 truncate">{l.titulo}</span>
                  <span className="text-white/35 shrink-0">{l.hora ? String(l.hora).slice(0, 5) : ''}{l.concluidaAs ? ` · concluída ${l.concluidaAs}` : ''}</span>
                </div>
                {l.motivo && <p className="text-white/50 mt-0.5">motivo: {l.motivo}</p>}
                <p className="text-white/35 mt-0.5">técnico: {linhaTecnica(l)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
