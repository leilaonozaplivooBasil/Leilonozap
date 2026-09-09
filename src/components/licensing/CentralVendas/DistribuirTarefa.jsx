import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Send, X, UserRound, GraduationCap, BookmarkPlus, ListChecks, AlarmClock, Brain } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fmtReais, nomeExibicao, categoriaDaTarefa, fixoDoParticipante, pesoReferenciaDe, dataISO, PARTICIPANTE_PADRAO,
} from '@/lib/xgame';
import { distribuirDia, simularNovaTarefa, DIAS_FIXO, PESO_MIN, PESO_MAX } from '@/lib/distribuicaoFixo';
import { MENTALIDADES, mentalidadeDe, mentalidadePadrao, pesoComMentalidade, ensinamentoDaTarefa, habitoDe } from '@/lib/mentalidades';
import { ACOES_PADRAO, catalogoJunto, classificarAcao, jaNoCatalogo, acaoParaGravar, parecidas, montarMentoria, ROTEIRO_MENTORIA, TEMAS, CATEGORIAS_ACAO } from '@/lib/catalogoAcoes';
import { prazoDe, rotuloDoPrazo } from '@/lib/pronto';

// 🎯 DISTRIBUIR TAREFA — o formulário da gestão, agora uma peça só (07/09/2026).
//
// Nasceu dentro do XPerformanceGestao (a ADM X-Game) e saiu de lá porque o dono
// pediu a MESMA coisa no detalhe de cada pessoa da X-Performance: "esse aí
// precisa ficar igual o terceiro, o distribuir do admin — puxar o admin pra cá
// e fazer uma junção da demanda recebida com o enviar a demanda". Um código,
// dois lugares: na ADM X-Game (com o Quadro Geral ao lado) e no Painel
// Corporativo embutido (com a pessoa já escolhida).
//
// O que ele faz (a história inteira está no cabeçalho do XPerformanceGestao):
// pessoa, dia, horário opcional, pronto até, catálogo de ações, o título lido
// pela régua (mentalidade, Hábito, peso, categoria, temas — a leitura viva), o
// ensinamento que a pessoa lê, a mentoria completa (15+45+120), a PRÉVIA do
// valor no fixo do dia, a prioridade e o repetir até sexta. Sempre grava nos
// TRÊS lugares (DIR-130, 09/09/2026 — "tudo automático"): metodo_tarefas
// (origem 'xperf', a Jornada), metodo_quadro (o card, ligado, cai na lista
// dele) e xgame_mensagens (tipo 'demanda', acende o sino da pessoa).
//
// `DistribuirTarefa` é CONTROLADO: quem monta passa a equipe, o cadastro do
// jogo, as tarefas do ciclo e o catálogo (a ADM já tem tudo carregado).
// `DistribuirTarefaSozinho` carrega o que precisa sozinho — é o que o Painel
// Corporativo usa.

/** Próximo dia útil a partir de amanhã (o dono distribui "pra amanhã"). */
export function proximoDiaUtil(hojeISO) {
  const d = new Date(`${hojeISO}T12:00:00`);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return dataISO(d);
}
/** Do dia escolhido até a sexta da mesma semana (dias úteis), incluindo o dia. */
export function diasUteisAteSexta(diaISO) {
  const d = new Date(`${diaISO}T12:00:00`);
  if (Number.isNaN(d.getTime())) return [diaISO];
  const dias = [];
  const x = new Date(d);
  while (x.getDay() !== 6 && x.getDay() !== 0 && dias.length < 6) { dias.push(dataISO(x)); x.setDate(x.getDate() + 1); if (x.getDay() === 6) break; }
  return dias.length ? dias : [diaISO];
}
/** A prioridade vira o prazo do card: alta = no dia, média = +3 dias, baixa = +7. */
export function prazoDaPrioridade(diaISO, prioridade) {
  const d = new Date(`${diaISO}T12:00:00`);
  d.setDate(d.getDate() + (prioridade === 'baixa' ? 7 : prioridade === 'media' ? 3 : 0));
  return dataISO(d);
}
const fmtDia = (iso) => { const d = new Date(`${iso}T12:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }); };
const campo = 'rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-white/40 lista-escura';
// 🌑 `lista-escura` (index.css) é pro <select>: sem ela a LISTA que ele abre
// vira branca com texto branco — o fundo `bg-white/[0.06]` é translúcido, e
// o sistema desenha a lista a partir do fundo do próprio campo.
export const ehProducao = (t) => { const c = categoriaDaTarefa(t); return c !== 'bonus' && c !== 'venda'; };
const NOVA_VAZIA = (categoria = 'mentoria', prazoHora = '18:00') => ({ titulo: '', hora: '', peso: 3, pesoManual: false, categoria, categoriaManual: false, mentalidade: '', habito: '', prazoDia: '', prazoHora });

export default function DistribuirTarefa({
  currentUser, equipe = [], participanteDe, nomeDe, tarefasCiclo = [], carregarTarefas, catalogo = ACOES_PADRAO, acoesDoBanco = [], onAcoesDoBanco = null,
  pessoa, onPessoa, dia, onDia, onAbrirQuadroGeral = null, desfazer = null, moldura = true, legenda = true,
}) {
  const [salvando, setSalvando] = useState(false);
  const [nova, setNova] = useState(() => NOVA_VAZIA());
  const [mentoriaCompleta, setMentoriaCompleta] = useState(false);
  const [prioridade, setPrioridade] = useState('alta');   // alta | media | baixa
  const [repetirSemana, setRepetirSemana] = useState(false);
  const [acaoEscolhida, setAcaoEscolhida] = useState('');
  const [salvandoAcao, setSalvandoAcao] = useState(false);

  const participante = pessoa ? participanteDe(pessoa) : null;
  // a mentalidade: a escolhida; senão a que a régua lê no texto da ação;
  // com o campo vazio, a trilha da pessoa (pelo cargo)
  const lida = classificarAcao(nova.titulo);
  const mentalidadeAtual = nova.mentalidade || (nova.titulo.trim() ? lida.mentalidade : mentalidadePadrao(participante?.cargo));
  const mentalidadeObj = mentalidadeDe(mentalidadeAtual);
  const habitoAtual = nova.habito || (nova.titulo.trim() && !nova.mentalidade ? String(lida.habito || '') : '');
  const categoriaAtual = nova.categoriaManual || !nova.titulo.trim() ? nova.categoria : lida.categoria;
  const ehMentoria = categoriaAtual === 'mentoria';
  const blocosMentoria = ehMentoria && mentoriaCompleta ? montarMentoria({ titulo: nova.titulo, mentalidade: mentalidadeAtual, horaInicio: nova.hora || '09:00' }) : null;
  const sugestoes = nova.titulo.trim() && !acaoEscolhida ? parecidas(catalogo, nova.titulo) : [];
  const noCatalogo = nova.titulo.trim() ? jaNoCatalogo(catalogo, nova.titulo) : true;

  // 📚 escolher uma ação do catálogo preenche tudo
  const escolherAcao = (id) => {
    setAcaoEscolhida(id);
    const a = catalogo.find((x) => x.id === id);
    if (!a) return;
    setNova((n) => ({ ...n, titulo: a.titulo, mentalidade: a.mentalidade, habito: a.habito ? String(a.habito) : '', peso: a.peso, pesoManual: true, categoria: a.categoria || n.categoria, categoriaManual: true }));
  };
  const pesoSugerido = pesoComMentalidade(nova.titulo, mentalidadeAtual);
  const pesoEfetivo = nova.pesoManual ? (Number(nova.peso) || 3) : pesoSugerido.peso;
  // 📚 salvar a ação digitada no catálogo (no banco), com a classificação da tela
  const salvarNoCatalogo = async () => {
    if (!nova.titulo.trim() || noCatalogo) return;
    setSalvandoAcao(true);
    const linha = acaoParaGravar({ titulo: nova.titulo, mentalidade: mentalidadeAtual, habito: habitoAtual, peso: pesoEfetivo, categoria: categoriaAtual, criadoPorId: currentUser?.id });
    const { data, error } = await supabase.from('xperf_acoes').insert(linha).select();
    setSalvandoAcao(false);
    if (error) { toast.error('Não salvou no catálogo — tenta de novo'); return; }
    const gravada = (Array.isArray(data) ? data[0] : data) || { id: `novo:${Date.now()}`, ...linha };
    onAcoesDoBanco?.([...acoesDoBanco, gravada]);
    setAcaoEscolhida(gravada.id);
    toast.success(`"${linha.titulo}" entrou no catálogo (${mentalidadeObj?.nome}, peso ${linha.peso})`);
  };
  const tarefasDoDia = useMemo(
    () => tarefasCiclo.filter((t) => t.user_id === pessoa && String(t.data).slice(0, 10) === dia),
    [tarefasCiclo, pessoa, dia],
  );
  const mudarTitulo = (titulo) => {
    setAcaoEscolhida('');
    setNova((n) => ({ ...n, titulo, mentalidade: '', habito: '', pesoManual: false, categoriaManual: false }));
  };
  const temasTexto = lida.temas.length ? `Temas: ${lida.temas.map((id) => TEMAS.find((t) => t.id === id)?.rotulo || id).join(', ')}.` : '';
  const ensinamento = ensinamentoDaTarefa({ mentalidade: mentalidadeAtual, habito: habitoAtual, detalhe: temasTexto });
  // 🔮 A PRÉVIA: quanto vale a tarefa que está sendo digitada, e o que as outras do dia perdem
  const previa = useMemo(() => {
    if (!participante) return null;
    const producao = tarefasDoDia.filter(ehProducao);
    const dist = distribuirDia({ fixoMes: fixoDoParticipante(participante), pesoReferencia: pesoReferenciaDe(participante), tarefas: producao });
    const entraNoFixo = categoriaAtual !== 'bonus' && categoriaAtual !== 'venda';
    const sim = entraNoFixo
      ? simularNovaTarefa({ fixoMes: fixoDoParticipante(participante), pesoReferencia: pesoReferenciaDe(participante), tarefas: producao, novaPeso: pesoEfetivo })
      : null;
    return { dist, sim, entraNoFixo, fixo: fixoDoParticipante(participante) };
  }, [participante, tarefasDoDia, categoriaAtual, pesoEfetivo]);
  const valoresDoDia = previa?.dist.valores || {};

  // 🗂️ o card do quadro pessoal (DIR-75/76) que a demanda vira, ligado ou não à tarefa
  const cardDaDemanda = (tarefaId) => ({
    user_id: pessoa, titulo: nova.titulo.trim(), detalhe: ensinamento || null, coluna: 'aberto',
    habito: habitoAtual ? Number(habitoAtual) : null, prazo: prazoDaPrioridade(nova.prazoDia || dia, prioridade),
    responsavel_nome: nomeDe(currentUser?.id), virou_tarefa_id: tarefaId, virou_tarefa_em: tarefaId ? new Date().toISOString() : null,
    ordem: 0, checklist: [],
  });
  const limparFormulario = () => {
    setAcaoEscolhida('');
    setRepetirSemana(false);
    setNova(NOVA_VAZIA(nova.categoria, nova.prazoHora || '18:00'));
    carregarTarefas?.();
  };
  const desfazerTarefa = async (t) => {
    if (desfazer) { desfazer(t); return; }
    const { error } = await supabase.from('metodo_tarefas').delete().eq('id', t.id);
    if (error) toast.error('Não apagou — recarregando');
    carregarTarefas?.();
  };

  // 🗂️🔔 09/09/2026 — dono: "já estava entrando automático na jornada e não
  // entrou, precisa entrar. No quadro, tá? Na lista e na jornada. Tudo
  // automático." + "eu mandei essas duas notificações aí, a pessoa ficou
  // com dificuldade de receber, só apareceu no quadro." Os dois lados de
  // "sempre os três lugares" — o card do quadro (ligado à tarefa) e o
  // aviso que acende o sino — numa função só, pra nunca faltar nenhum
  // caminho que distribui tarefa (achado na auditoria noturna: a mentoria
  // completa gravava só a Jornada, os outros dois nunca eram chamados).
  const criarQuadroEAviso = async (tarefaId, tituloParaAviso, prazoEmParaAviso) => {
    const { error: erroQuadro } = await supabase.from('metodo_quadro').insert(cardDaDemanda(tarefaId || null));
    const { error: erroAviso } = await supabase.from('xgame_mensagens').insert({
      remetente_id: currentUser?.id || null,
      remetente_nome: nomeExibicao(currentUser) || currentUser?.full_name || 'a gestão',
      destino_tipo: 'pessoa', destino_id: pessoa, destino_nome: nomeDe(pessoa),
      tipo: 'demanda',
      texto: `📋 nova tarefa: "${tituloParaAviso}" — ${rotuloDoPrazo(prazoEmParaAviso, dia) || 'combine o pronto com a gestão'}.`,
    });
    if (erroQuadro) toast.error('Entrou na jornada, mas o card do quadro não gravou — confere lá');
    if (erroAviso) toast.error('Entrou na jornada, mas o sino não avisou a pessoa — confere lá');
    return { ok: !erroQuadro && !erroAviso };
  };

  const distribuir = async () => {
    if (!pessoa || !nova.titulo.trim()) { toast.error('Escolha a pessoa e diga qual é a tarefa.'); return; }
    setSalvando(true);
    // 🎓 mentoria completa: três blocos encadeados, cada um com o seu ensinamento
    if (blocosMentoria) {
      const linhas = blocosMentoria.map((b, i) => ({
        user_id: pessoa, data: dia, hora: b.hora, titulo: b.titulo, feito: false, ordem: tarefasDoDia.length + i,
        categoria: b.categoria, peso: pesoComMentalidade(b.titulo, mentalidadeAtual).peso,
        origem: 'xperf', criado_por_id: currentUser?.id || null,
        mentalidade: mentalidadeAtual, habito: b.habito,
        detalhe: ensinamentoDaTarefa({ mentalidade: mentalidadeAtual, habito: b.habito, detalhe: `Bloco da mentoria (${b.minutos} min): ${b.tema}.` }),
        prazo_em: prazoDe(nova.prazoDia || dia, nova.prazoHora || '18:00'),
      }));
      const { data: gravadasMentoria, error } = await supabase.from('metodo_tarefas').insert(linhas).select();
      if (error) { setSalvando(false); toast.error('Não distribuiu a mentoria — tenta de novo'); return; }
      const primeiraMentoria = Array.isArray(gravadasMentoria) ? gravadasMentoria[0] : gravadasMentoria;
      const { ok } = await criarQuadroEAviso(primeiraMentoria?.id, `Mentoria: ${linhas[0].titulo}`, linhas[0].prazo_em);
      setSalvando(false);
      toast.success(`Mentoria distribuída pra ${nomeDe(pessoa)}: ${linhas.length} blocos, das ${linhas[0].hora} às ${linhas[2].hora} (+2h)${ok ? ' — jornada, quadro e sino avisados' : ''}`);
      setMentoriaCompleta(false);
      limparFormulario();
      return;
    }
    const linha = {
      user_id: pessoa, data: dia, hora: nova.hora || null, titulo: nova.titulo.trim(),
      feito: false, ordem: tarefasDoDia.length, categoria: categoriaAtual, peso: pesoEfetivo,
      origem: 'xperf', criado_por_id: currentUser?.id || null,
      mentalidade: mentalidadeAtual, habito: habitoAtual ? Number(habitoAtual) : null,
      detalhe: ensinamento || null,
      prazo_em: prazoDe(nova.prazoDia || dia, nova.prazoHora || '18:00'),
    };
    // 📅 repetir nos dias úteis até a sexta desta semana
    const diasAlvo = repetirSemana ? diasUteisAteSexta(dia) : [dia];
    const linhas = diasAlvo.map((d) => ({ ...linha, data: d, prazo_em: prazoDe(d === dia ? (nova.prazoDia || d) : d, nova.prazoHora || '18:00') }));
    const { data: gravadas, error } = await supabase.from('metodo_tarefas').insert(linhas).select();
    if (error) { setSalvando(false); toast.error('Não distribuiu a tarefa — tenta de novo'); return; }
    const primeira = Array.isArray(gravadas) ? gravadas[0] : gravadas;
    const { ok } = await criarQuadroEAviso(primeira?.id, linha.titulo, linha.prazo_em);
    setSalvando(false);
    if (diasAlvo.length > 1) toast.success(`${diasAlvo.length} dias: "${linha.titulo}" de ${fmtDia(diasAlvo[0])} a ${fmtDia(diasAlvo.at(-1))}`);
    // a ação do catálogo (do banco) conta um uso — é o que sobe na lista
    const usada = catalogo.find((a) => a.id === acaoEscolhida);
    if (usada && !usada.padrao) supabase.from('xperf_acoes').update({ usos: (Number(usada.usos) || 0) + 1 }).eq('id', usada.id).then(() => {});
    const valor = previa?.sim?.valorNova;
    // 🐛 09/09/2026 — achado na auditoria noturna: este toast disparava
    // incondicional, dizendo "jornada, quadro e sino avisados" mesmo quando
    // um dos dois tinha acabado de falhar (toast de erro logo acima). Agora
    // só promete o que de fato aconteceu.
    toast.success(
      valor != null
        ? `Tarefa distribuída pra ${nomeDe(pessoa)}: vale ${fmtReais(valor)}${ok ? ' — jornada, quadro e sino avisados' : ''}`
        : `Tarefa distribuída pra ${nomeDe(pessoa)}${ok ? ' — jornada, quadro e sino avisados' : ''}`,
    );
    limparFormulario();
  };

  const conteudo = !equipe.length ? (
    <p className="mt-3 text-[12px] text-amber-300/80">Ninguém do time corporativo no painel de controle ainda (do Sócio Executivo ao Embaixador).</p>
  ) : (
    <>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
        <label className="text-[10px] text-white/45 uppercase tracking-wider">
          responsável
          <span className="mt-1 flex items-stretch gap-1.5">
            <select value={pessoa || ''} onChange={(e) => onPessoa(e.target.value)} className={`block w-full ${campo}`} data-teste="pessoa">
              {equipe.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}{p.funcao ? ` · ${p.funcao}` : ''}</option>
              ))}
            </select>
            {onAbrirQuadroGeral && (
              <Button size="sm" onClick={() => onAbrirQuadroGeral(pessoa)} disabled={!pessoa}
                className="h-auto shrink-0 bg-white/10 hover:bg-white/20 text-white text-[11px] normal-case tracking-normal" data-teste="abrir-quadro-geral">
                <UserRound className="w-3.5 h-3.5 mr-1" /> Quadro Geral
              </Button>
            )}
          </span>
        </label>
        <label className="text-[10px] text-white/45 uppercase tracking-wider">
          dia
          <input type="date" value={dia} onChange={(e) => onDia(e.target.value)} className={`mt-1 block ${campo}`} data-teste="dia" />
        </label>
        <label className="text-[10px] text-white/45 uppercase tracking-wider">
          horário (opcional)
          <input type="time" value={nova.hora} onChange={(e) => setNova((n) => ({ ...n, hora: e.target.value }))} className={`mt-1 block ${campo}`} data-teste="hora-inicio" />
        </label>
      </div>
      {/* 🕐 09/09/2026 — dono: "ela não tem que entrar na hora que eu coloquei...
          deixando a opção da pessoa escolher o melhor horário pra ela fazer,
          sabendo que ela tem o pronto." Sem horário, a tarefa entra flexível
          na Jornada — perto do prazo, não travada num horário fixo — e a
          própria pessoa escolhe quando fazer, editando o horário por lá. */}
      {!nova.hora && (
        <p className="mt-1 text-[10px] text-white/35" data-teste="hora-flexivel-aviso">
          sem horário: a tarefa entra flexível na Jornada (perto do "pronto até") — a pessoa escolhe/edita quando vai fazer
        </p>
      )}
      {/* ⏰ o pronto: entregar até tal hora (no mesmo dia, ou noutro) */}
      <div className="mt-2 flex items-end gap-2 flex-wrap">
        <label className="text-[10px] text-white/45 uppercase tracking-wider">
          <span className="inline-flex items-center gap-1"><AlarmClock className="w-3 h-3" /> pronto até</span>
          <span className="mt-1 flex items-center gap-1.5">
            <input type="date" value={nova.prazoDia || dia} onChange={(e) => setNova((n) => ({ ...n, prazoDia: e.target.value }))} className={campo} data-teste="prazo-dia" />
            <input type="time" value={nova.prazoHora} onChange={(e) => setNova((n) => ({ ...n, prazoHora: e.target.value }))} className={campo} data-teste="prazo-hora" />
          </span>
        </label>
        <span className="text-[10px] text-white/35 pb-2">a pessoa vê "{rotuloDoPrazo(prazoDe(nova.prazoDia || dia, nova.prazoHora || '18:00'), dia) || 'pronto até'}" na tarefa e dá o pronto; você confere ou devolve na fila abaixo</span>
      </div>
      {/* 📚 o catálogo: o que tem pra fazer, já com mentalidade, Hábito e peso */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
        <label className="text-[10px] text-white/45 uppercase tracking-wider">
          <span className="inline-flex items-center gap-1"><ListChecks className="w-3 h-3" /> o que tem pra fazer (catálogo)</span>
          <select value={acaoEscolhida} onChange={(e) => escolherAcao(e.target.value)} className={`mt-1 block w-full ${campo}`} data-teste="catalogo">
            <option value="">escolha uma ação… ou escreva a sua abaixo</option>
            {MENTALIDADES.map((m) => (
              <optgroup key={m.id} label={`${m.nome} — ${m.lema}`}>
                {catalogo.filter((a) => a.mentalidade === m.id).map((a) => (
                  <option key={a.id} value={a.id}>{a.titulo} · peso {a.peso}{a.habito ? ` · H${a.habito}` : ''}{a.padrao ? '' : ' · sua'}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <span className="text-[10px] text-white/35 pb-2">{catalogo.length} ações · {acoesDoBanco.length} sua{acoesDoBanco.length === 1 ? '' : 's'}</span>
      </div>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
        <label className="text-[10px] text-white/45 uppercase tracking-wider">
          qual é a tarefa{nova.titulo.trim() && !nova.mentalidade && !acaoEscolhida && <span className="normal-case text-white/30" data-teste="mentalidade-lida"> · a régua leu: {mentalidadeObj?.nome} ({lida.porqueMentalidade})</span>}
          <Input
            value={nova.titulo}
            onChange={(e) => mudarTitulo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') distribuir(); }}
            placeholder='ex.: "Pegar as pautas da reunião de amanhã"'
            className="mt-1 h-9 border-white/15 bg-white/[0.06] text-white placeholder:text-white/30"
            data-teste="titulo"
          />
        </label>
        <label className="text-[10px] text-white/45 uppercase tracking-wider" title={nova.pesoManual ? 'peso escolhido por você' : `gerado pelo título e pela mentalidade: ${pesoSugerido.porque}`}>
          peso {nova.pesoManual
            ? <button type="button" onClick={() => setNova((n) => ({ ...n, pesoManual: false }))} className="normal-case text-nz-verde hover:underline" data-teste="peso-auto">(voltar ao automático)</button>
            : <span className="normal-case text-white/30" data-teste="peso-motivo">{nova.titulo.trim() ? `· ${pesoSugerido.porque}` : '(automático)'}</span>}
          <select value={pesoEfetivo} onChange={(e) => setNova((n) => ({ ...n, peso: Number(e.target.value), pesoManual: true }))} className={`mt-1 block ${campo}`} data-teste="peso">
            {Array.from({ length: PESO_MAX - PESO_MIN + 1 }, (_, i) => PESO_MIN + i).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="text-[10px] text-white/45 uppercase tracking-wider" title={nova.categoriaManual ? 'escolhida por você' : 'lida do texto'}>
          categoria {!nova.categoriaManual && nova.titulo.trim() && <span className="normal-case text-white/30">(auto)</span>}
          <select value={categoriaAtual} onChange={(e) => setNova((n) => ({ ...n, categoria: e.target.value, categoriaManual: true }))} className={`mt-1 block ${campo}`} data-teste="categoria">
            {CATEGORIAS_ACAO.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </label>
      </div>

      {/* 🎓 a mentalidade e o Hábito — o ensinamento que vai junto */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-[auto_auto_1fr] gap-2 items-start">
        <label className="text-[10px] text-white/45 uppercase tracking-wider">
          mentalidade
          <select value={mentalidadeAtual} onChange={(e) => setNova((n) => ({ ...n, mentalidade: e.target.value, habito: '' }))} className={`mt-1 block ${campo}`} data-teste="mentalidade">
            {MENTALIDADES.map((m) => <option key={m.id} value={m.id}>{m.nome}{m.acrescimo ? ` (+${m.acrescimo} no peso)` : ''}</option>)}
          </select>
        </label>
        <label className="text-[10px] text-white/45 uppercase tracking-wider" title={nova.habito ? 'Hábito escolhido por você' : `automático: ${lida.porqueHabito}`}>
          hábito {!nova.habito && nova.titulo.trim() && <span className="normal-case text-white/30" data-teste="habito-motivo">· {lida.porqueHabito}</span>}
          <select value={habitoAtual} onChange={(e) => setNova((n) => ({ ...n, habito: e.target.value }))} className={`mt-1 block ${campo}`} data-teste="habito">
            <option value="">—</option>
            {(mentalidadeObj?.foco || []).map((n) => { const h = habitoDe(n); return <option key={n} value={n}>{n} · {h?.completo || ''}</option>; })}
          </select>
        </label>
        <div className="rounded-lg border border-white/10 px-2.5 py-2 text-[11px] text-white/60 whitespace-pre-line sm:mt-4" style={{ background: 'rgba(255,255,255,0.03)' }} data-teste="ensinamento">
          <span className="inline-flex items-center gap-1 text-white/40 text-[10px] uppercase tracking-wider"><GraduationCap className="w-3 h-3" /> o que a pessoa vai ler embaixo da tarefa</span>
          {'\n'}{ensinamento}
        </div>
      </div>

      {/* 🧠 a leitura viva: o que a régua reconheceu, palavra por palavra */}
      {nova.titulo.trim() && !acaoEscolhida && (
        <div className="mt-2 rounded-lg border border-white/10 px-2.5 py-2 text-[11px]" style={{ background: 'rgba(255,255,255,0.03)' }} data-teste="leitura-viva">
          <p className="inline-flex items-center gap-1 text-white/40 text-[10px] uppercase tracking-wider"><Brain className="w-3 h-3" /> leitura viva — muda a cada palavra</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-white/80" data-teste="leitura-mentalidade">{mentalidadeObj?.nome} <span className="text-white/40">· {lida.porqueMentalidade}</span></span>
            {habitoAtual && <span className="rounded-full border border-white/20 px-2 py-0.5 text-white/80" data-teste="leitura-habito">Hábito {habitoAtual} · {habitoDe(habitoAtual)?.completo} <span className="text-white/40">· {nova.habito ? 'escolhido por você' : lida.porqueHabito}</span></span>}
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-white/80" data-teste="leitura-categoria">{CATEGORIAS_ACAO.find(([v]) => v === categoriaAtual)?.[1]} <span className="text-white/40">· {nova.categoriaManual ? 'escolhida por você' : 'lida do texto'}</span></span>
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-white/80">peso {pesoEfetivo} <span className="text-white/40">· {nova.pesoManual ? 'escolhido por você' : pesoSugerido.porque}</span></span>
            {lida.temas.map((id) => <span key={id} className="rounded-full bg-white/10 px-2 py-0.5 text-white/60" data-teste="leitura-tema">#{TEMAS.find((t) => t.id === id)?.rotulo || id}</span>)}
          </div>
          {sugestoes.length > 0 && (
            <p className="mt-1.5 text-white/45" data-teste="parece-com">
              parece com:{' '}
              {sugestoes.map((a) => (
                <button key={a.id} type="button" onClick={() => escolherAcao(a.id)} className="mr-2 underline decoration-white/30 hover:text-white">{a.titulo}</button>
              ))}
            </p>
          )}
        </div>
      )}

      {/* 🎓 a mentoria com roteiro: 15 + 45 + 120 minutos */}
      {ehMentoria && nova.titulo.trim() && (
        <label className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-[11px] text-white/70 cursor-pointer" style={{ background: 'rgba(255,255,255,0.03)' }} data-teste="mentoria-completa">
          <input type="checkbox" checked={mentoriaCompleta} onChange={(e) => setMentoriaCompleta(e.target.checked)} className="mt-0.5 accent-green-600" data-teste="mentoria-caixa" />
          <span>
            <span className="font-bold text-white">Distribuir como mentoria completa</span> — {ROTEIRO_MENTORIA.map((b) => `${b.minutos} min de ${b.bloco === 'reuniao' ? 'reunião' : b.bloco}`).join(' · ')}, encadeados a partir do horário{nova.hora ? ` (${nova.hora})` : ' (09:00 — nenhum escolhido acima)'}.
            {blocosMentoria && (
              <span className="mt-1 block space-y-0.5" data-teste="mentoria-blocos">
                {blocosMentoria.map((b) => <span key={b.bloco} className="block text-white/55">{b.hora} · {b.titulo} <span className="text-white/35">· H{b.habito} · peso {pesoComMentalidade(b.titulo, mentalidadeAtual).peso}</span></span>)}
              </span>
            )}
          </span>
        </label>
      )}

      {/* 🔮 a prévia */}
      {previa && (
        <div className="mt-3 rounded-lg border border-white/10 p-3 text-[12px]" style={{ background: 'rgba(255,255,255,0.03)' }} data-teste="previa">
          <p className="text-white/60">
            {fmtDia(dia)} de <span className="text-white font-bold">{nomeDe(pessoa)}</span> vale{' '}
            <span className="text-white font-bold tabular-nums" data-teste="valor-dia">{fmtReais(previa.dist.valorDia)}</span>
            <span className="text-white/35"> (fixo {fmtReais(previa.fixo)} ÷ {DIAS_FIXO} dias de operação)</span>
            {!participante?.temFixo && <span className="text-amber-300/80" data-teste="sem-fixo"> · sem fixo definido: usando a verba padrão — defina no modal da pessoa</span>}
            {' · '}{tarefasDoDia.length} tarefa{tarefasDoDia.length === 1 ? '' : 's'} no dia
          </p>
          {previa.entraNoFixo ? (
            <>
              <p className="mt-1.5 text-white">
                Esta tarefa (peso {pesoEfetivo}) vale{' '}
                <span className="font-extrabold text-nz-verde tabular-nums" data-teste="valor-nova">{fmtReais(previa.sim.valorNova)}</span>
              </p>
              {previa.sim.quedas.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-[11px] text-white/55" data-teste="quedas">
                  {previa.sim.quedas.slice(0, 6).map((q) => {
                    const t = tarefasDoDia.find((x) => x.id === q.id);
                    return (
                      <li key={q.id} className="flex items-center gap-2">
                        <span className="truncate">{t?.titulo || q.id}</span>
                        <span className="ml-auto shrink-0 tabular-nums">
                          {fmtReais(q.de)} <span className="text-white/30">→</span>{' '}
                          <span className={q.para < q.de ? 'text-amber-300' : 'text-nz-verde'}>{fmtReais(q.para)}</span>
                        </span>
                      </li>
                    );
                  })}
                  {previa.sim.quedas.length > 6 && <li className="text-white/35">+ {previa.sim.quedas.length - 6} outras recalculadas</li>}
                </ul>
              )}
              {previa.sim.pesoFalta > 0 ? (
                <p className="mt-1 text-[11px] text-amber-300/90" data-teste="faltam">
                  Com ela o dia paga {fmtReais(previa.sim.pagoDepois)} de {fmtReais(previa.sim.valorDia)}: o dia completo é a Rotina Perfeita (peso {previa.dist.pesoReferencia}) e ainda falta peso {previa.sim.pesoFalta} — o resto fica em aberto.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-white/45" data-teste="dia-completo">Dia completo: o fixo do dia inteiro está repartido — esta tarefa tira a fatia dela das outras.</p>
              )}
            </>
          ) : (
            <p className="mt-1.5 text-white/60">Bônus não sai do fixo: reparte a verba de bônus do dia entre as tarefas de estudo.</p>
          )}
        </div>
      )}

      {/* 🗂️ 09/09/2026 — dono: "no quadro, tá? Na lista e na jornada. Tudo
          automático." A escolha de destino saiu: toda tarefa distribuída
          agora sempre cai nos três (Jornada, Quadro e a primeira Lista dele),
          ligados — só a prioridade (o prazo do card) e o repetir continuam
          escolha do gestor. */}
      <div className="mt-3 flex items-center gap-3 flex-wrap text-[10px] text-white/45 uppercase tracking-wider" data-teste="destino-bloco">
        <span className="normal-case text-white/35" data-teste="destino-fixo">entra automático na jornada, no quadro e na lista dele</span>
        <label>prioridade
          <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} className={`ml-1 ${campo} normal-case`} data-teste="prioridade">
            <option value="alta">alta · card pra hoje</option><option value="media">média · card em 3 dias</option><option value="baixa">baixa · card em 7 dias</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-1 normal-case">
          <input type="checkbox" checked={repetirSemana} onChange={(e) => setRepetirSemana(e.target.checked)} className="accent-green-600" data-teste="repetir-semana" />
          repetir nos dias úteis até sexta ({diasUteisAteSexta(dia).length} dia{diasUteisAteSexta(dia).length === 1 ? '' : 's'})
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={distribuir} disabled={salvando || !nova.titulo.trim()} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 text-[11px]" data-teste="distribuir">
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
          Distribuir tarefa
        </Button>
        <span className="text-[10px] text-white/35">entra na Jornada, no Quadro e na Lista dele, e acende o sino — no dia escolhido</span>
        {nova.titulo.trim() && !noCatalogo && (
          <Button size="sm" variant="ghost" onClick={salvarNoCatalogo} disabled={salvandoAcao} className="ml-auto h-8 text-[11px] text-white/70 hover:text-white hover:bg-white/10" title="guarda esta ação no menu, com a mentalidade, o Hábito e o peso de agora" data-teste="salvar-catalogo">
            {salvandoAcao ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <BookmarkPlus className="w-3.5 h-3.5 mr-1" />}
            salvar no catálogo
          </Button>
        )}
      </div>

      {/* as tarefas do dia escolhido, já com o valor de cada uma */}
      {tarefasDoDia.length > 0 && (
        <ul className="mt-3 space-y-1" data-teste="tarefas-dia">
          {tarefasDoDia.map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px]" style={{ background: 'rgba(255,255,255,0.02)' }} data-origem={t.origem || ''}>
              <span className="text-white/40 tabular-nums w-10 shrink-0">{t.hora ? String(t.hora).slice(0, 5) : '—'}</span>
              <span className={`truncate ${t.feito ? 'line-through text-white/40' : 'text-white/85'}`}>{t.titulo}</span>
              {t.mentalidade && <span className="shrink-0 rounded-full border border-white/15 px-1.5 text-[9px] uppercase tracking-wider text-white/50" title={mentalidadeDe(t.mentalidade)?.nome}>{t.mentalidade}{t.habito ? ` · H${t.habito}` : ''}</span>}
              {t.prazo_em && <span className="shrink-0 text-[10px] text-white/45" data-teste="prazo-linha">⏰ {rotuloDoPrazo(t.prazo_em, String(t.data).slice(0, 10))}</span>}
              <span className="text-white/30 shrink-0">peso {t.peso ?? 3}</span>
              <span className="ml-auto shrink-0 font-bold tabular-nums text-white/80">{ehProducao(t) ? fmtReais(valoresDoDia[t.id] || 0) : 'bônus'}</span>
              {t.origem === 'xperf' && (
                <button type="button" onClick={() => desfazerTarefa(t)} title="desfazer (só tarefa distribuída aqui)" className="text-white/30 hover:text-red-300" aria-label={`desfazer ${t.titulo}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <div className={moldura ? 'rounded-xl border border-white/15 p-3 sm:p-4' : ''} style={moldura ? { background: 'rgba(255,255,255,0.04)' } : undefined} data-teste="distribuir-tarefa">
      {legenda && (
        <>
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-nz-verde" />
            <p className="text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">Distribuir tarefa</p>
          </div>
          <p className="mt-1 text-[11px] text-white/40">
            Escolhe quem, o dia e a tarefa. Antes de gravar, a prévia diz quanto ela vale e o que as outras do dia perdem — a soma do dia nunca passa do fixo.
          </p>
        </>
      )}
      {conteudo}
    </div>
  );
}

/**
 * 🧩 A versão que se carrega sozinha — pro Painel Corporativo (X-Performance).
 * Recebe a equipe (quem monta já tem) e a pessoa aberta; busca o cadastro do
 * jogo, o catálogo e as tarefas do dia escolhido.
 */
export function DistribuirTarefaSozinho({ currentUser, hojeISO, equipe = [], pessoaFixa = null, onDistribuiu = null, moldura = false, legenda = false }) {
  const hoje = hojeISO || dataISO();
  const [pessoa, setPessoa] = useState(pessoaFixa || equipe[0]?.id || '');
  const [dia, setDia] = useState(() => proximoDiaUtil(hoje));
  const [participantes, setParticipantes] = useState([]);
  const [acoesDoBanco, setAcoesDoBanco] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  useEffect(() => { if (pessoaFixa) setPessoa(pessoaFixa); }, [pessoaFixa]);
  useEffect(() => { if (!pessoa && equipe[0]?.id) setPessoa(equipe[0].id); }, [equipe, pessoa]);
  useEffect(() => {
    Promise.all([
      supabase.from('xgame_participantes').select('*').eq('ativo', true),
      supabase.from('xperf_acoes').select('*').order('titulo'),
    ]).then(([p, a]) => { setParticipantes(p.data || []); setAcoesDoBanco(a.data || []); }).catch(() => {});
  }, []);
  const carregarTarefas = useCallback(async () => {
    if (!pessoa || !dia) { setTarefas([]); return; }
    const { data } = await supabase.from('metodo_tarefas')
      .select('id,user_id,data,hora,titulo,peso,categoria,feito,conferido,origem,mentalidade,habito,prazo_em,pronto_em,devolvida_motivo,devolvida_em')
      .eq('user_id', pessoa).eq('data', dia).order('hora');
    setTarefas(data || []);
  }, [pessoa, dia]);
  useEffect(() => { carregarTarefas(); }, [carregarTarefas]);
  const catalogo = useMemo(() => catalogoJunto(ACOES_PADRAO, acoesDoBanco), [acoesDoBanco]);
  const nomeDe = useCallback((id) => { const p = equipe.find((x) => x.id === id); return p ? p.nome : (id === currentUser?.id ? nomeExibicao(currentUser) : (id ? String(id).slice(0, 6) : '—')); }, [equipe, currentUser]);
  const participanteDe = useCallback((id) => {
    const p = participantes.find((x) => x.user_id === id);
    if (p) return { ...PARTICIPANTE_PADRAO, ...p, temFixo: p.fixo_mes !== null && p.fixo_mes !== undefined };
    const membro = equipe.find((x) => x.id === id);
    return { ...PARTICIPANTE_PADRAO, user_id: id, cargo: membro?.cargo || 'executivo', temFixo: false, semCadastro: true };
  }, [participantes, equipe]);
  return (
    <DistribuirTarefa
      currentUser={currentUser} equipe={equipe} participanteDe={participanteDe} nomeDe={nomeDe}
      tarefasCiclo={tarefas} carregarTarefas={() => { carregarTarefas(); onDistribuiu?.(); }}
      catalogo={catalogo} acoesDoBanco={acoesDoBanco} onAcoesDoBanco={setAcoesDoBanco}
      pessoa={pessoa} onPessoa={setPessoa} dia={dia} onDia={setDia} moldura={moldura} legenda={legenda}
    />
  );
}
