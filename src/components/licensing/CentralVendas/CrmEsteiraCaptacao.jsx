import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GitBranch, Plus, X, Save, Trophy, Search, History, HelpCircle, ArrowLeftRight, Trash2, AlertTriangle } from 'lucide-react';
import StatInfoTooltip from './StatInfoTooltip';
import TourGuiado from './TourGuiado';
import { possiveisDuplicatas,
  ESTAGIOS_ESTEIRA, MOTIVOS_PERDA, estagioDe, pendenciasParaEstagio,
  resumoEsteira, conversaoPorResponsavel, diasNoEstagio, dinheiroNaConta,
  aporteExternoValido, BANCOS_APORTE_EXTERNO,
  semPPV, OBJECOES_METODO,
  DIAS_PARADA_ATENCAO, DIAS_PARADA_CRITICO,
} from '@/lib/esteiraCaptacao';
import { buscarPessoas } from '@/lib/buscaPessoa';
import { parseValorBR } from '@/lib/money';
import { getLevel } from '@/lib/careerLevels';
import { ESCADA_LICENCAS } from '@/lib/escadaLicencas';
import { META_CAPTACAO } from '@/lib/captacaoParceiros';
import { probabilidadeFechamento, ultimoContato } from '@/lib/metodo';

// 🛤️ DIR-34 (30/08/2026) — ESTEIRA DE CAPTAÇÃO: do agendamento da reunião ao
// contrato assinado, pelos 8 estágios oficiais do dono. Kanban com valor por
// coluna, forecast ponderado contra a meta de R$ 1 mi, ranking do time com %
// de conversão, e o 100% se provando contra o dinheiro REAL (chip âmbar
// quando o aporte declarado ainda não entrou). Regra: src/lib/esteiraCaptacao.js.
const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtData = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');

const TIPOS = [
  { id: 'aporte_parceiro', label: 'Aporte de Parceiro de Compra' },
  ...ESCADA_LICENCAS.filter((n) => n.investimento > 0).map((n) => ({ id: `licenca_${n.id}`, label: `Licença ${n.label}` })),
];
const tipoLabel = (id) => TIPOS.find((t) => t.id === id)?.label || id;

const FORM_VAZIO = {
  cliente_nome: '', cliente_email: '', cliente_telefone: '',
  tipo: 'aporte_parceiro', valor_previsto: '', estagio: 'reuniao_agendada',
  motivo_perda: '', reuniao_em: '', recontato_em: '', anotacoes: '',
};

export default function CrmEsteiraCaptacao({ oportunidades = [], sales = [], clientes = [], clientesManuais = [], executivos = [], usuariosApp = [], currentUser, visaoTotal, onSalvar, onRegistrarAporteExterno, onApagar, podeApagar = false, podeRegistrarAporte = false, clientePreenchido, onClientePreenchidoConsumido, oportunidadeParaAbrir, onOportunidadeParaAbrirConsumida, onIr, iniciarTour = false, onTourIniciado }) {
  const [editando, setEditando] = useState(null); // null | 'nova' | oportunidade
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  // 🔁 09/09/2026 — candidatas a duplicata seguradas na frente do salvar.
  // null = não perguntei ainda; array = estou perguntando.
  const [duplicatas, setDuplicatas] = useState(null);
  const [apagando, setApagando] = useState(null);
  // 🖐️ 08/09/2026 — a mãozinha da Esteira: abre sozinha na PRIMEIRA visita
  // (a marca fica no localStorage — nunca mais incomoda sozinha depois
  // disso), e sempre pode ser reaberta pelo botão "Como funciona".
  const [tourAberto, setTourAberto] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem('tour_esteira_visto')) setTourAberto(true); } catch { /* localStorage indisponível — sem tour automático, sem quebrar a tela */ }
  }, []);
  // 🖐️ 09/09/2026 — DIR-124: a Esteira era a ÚNICA das 8 sub-telas do
  // Hábito 6 com um botão "Como funciona" PRÓPRIO, desconectado do botão
  // global do topo (ComoFuncionaModal/pedidoDeTour.js) — quem clicava
  // "Fazer o tour guiado desta tela" aqui não via nada acontecer. Agora
  // esta tela também aceita o pedido de fora, igual às outras 7.
  useEffect(() => {
    if (iniciarTour) { setTourAberto(true); onTourIniciado?.(); }
  }, [iniciarTour, onTourIniciado]);
  const fecharTour = () => {
    setTourAberto(false);
    try { localStorage.setItem('tour_esteira_visto', '1'); } catch { /* idem */ }
  };
  // 💵 DIR-40 — registro de aporte que entrou POR FORA (Santander/Itaú)
  const [aporteForm, setAporteForm] = useState(null); // null | {banco, valor, data}
  // 🔎 DIR-36 — busca de cliente EXISTENTE na nova oportunidade (nada de
  // redigitar quem o CRM já conhece; e amarra cliente_user_id de verdade).
  const [buscaCliente, setBuscaCliente] = useState('');
  // 🧬 DIR-39 — busca de quem INDICOU (só gente cadastrada no app: indicação
  // sem cadastro não existe).
  const [buscaIndicacao, setBuscaIndicacao] = useState('');
  // 🪜 confirma que sabe que está pulando Lista/Contato/Agenda (ex.: aporte
  // direto de investidor, que nunca passa pelo funil de rede) — sem isso,
  // "Salvar" fica bloqueado quando falta alguma etapa do Método.
  const [pulaEtapas, setPulaEtapas] = useState(false);

  const resumo = useMemo(() => resumoEsteira(oportunidades), [oportunidades]);
  const ranking = useMemo(() => conversaoPorResponsavel(oportunidades), [oportunidades]);
  const sugestoesCliente = useMemo(
    () => (buscaCliente.trim().length >= 2 ? buscarPessoas(clientes, buscaCliente).slice(0, 6) : []),
    [clientes, buscaCliente]
  );
  const sugestoesIndicacao = useMemo(
    () => (buscaIndicacao.trim().length >= 2 ? buscarPessoas(usuariosApp, buscaIndicacao).slice(0, 6) : []),
    [usuariosApp, buscaIndicacao]
  );
  // DIR-39: o responsável SEMPRE é um executivo do topo — quem cria só entra
  // como padrão se for do topo.
  const souExecutivo = executivos.some((e) => e.user.id === currentUser?.id);

  const abrirNova = () => {
    setForm({
      ...FORM_VAZIO,
      responsavel_id: souExecutivo ? currentUser?.id : null,
      responsavel_nome: souExecutivo ? currentUser?.full_name : '',
    });
    setBuscaCliente('');
    setBuscaIndicacao('');
    setAporteForm(null);
    setPulaEtapas(false);
    setEditando('nova');
  };
  const abrirEdicao = (o) => {
    setForm({
      ...o,
      valor_previsto: o.valor_previsto ?? '',
      reuniao_em: o.reuniao_em ? String(o.reuniao_em).slice(0, 16) : '',
      recontato_em: o.recontato_em ? String(o.recontato_em).slice(0, 10) : '',
    });
    setBuscaCliente('');
    setBuscaIndicacao('');
    setAporteForm(null);
    setPulaEtapas(false);
    setEditando(o);
  };
  const escolherCliente = (c) => {
    setForm((f) => ({
      ...f,
      cliente_nome: c.full_name || '',
      cliente_email: c.email || '',
      cliente_telefone: c.phone || '',
      cliente_user_id: c.user_id || null,
    }));
    setBuscaCliente('');
  };

  // 🛤️ DIR-36 — "Criar oportunidade" vindo do modal do cliente: chega aqui
  // com o formulário pronto e amarrado ao cadastro.
  useEffect(() => {
    if (!clientePreenchido) return;
    setForm({
      ...FORM_VAZIO,
      ...clientePreenchido,
      responsavel_id: souExecutivo ? currentUser?.id : null,
      responsavel_nome: souExecutivo ? currentUser?.full_name : '',
    });
    setBuscaCliente('');
    setBuscaIndicacao('');
    setAporteForm(null);
    setPulaEtapas(false);
    setEditando('nova');
    onClientePreenchidoConsumido?.();
  }, [clientePreenchido]);

  // 🔗 08/09/2026 — dono: "eu estou com dificuldade de ver aonde é o
  // contato pra entrar na esteira". Chega aqui vindo de fora (a fila "Quem
  // contatar hoje", ou o cliente com negociação existente): abre DIRETO o
  // card pra editar — mesmo jeito do "abrirEdicao" de clicar no kanban.
  useEffect(() => {
    if (!oportunidadeParaAbrir) return;
    abrirEdicao(oportunidadeParaAbrir);
    onOportunidadeParaAbrirConsumida?.();
  }, [oportunidadeParaAbrir]);

  // grava de verdade, sem perguntar nada (já perguntei, ou não havia o que perguntar)
  const gravar = async () => {
    setSalvando(true);
    try {
      await onSalvar(editando === 'nova' ? null : editando, form);
      setEditando(null);
      setDuplicatas(null);
    } finally {
      setSalvando(false);
    }
  };

  // 🔁 09/09/2026 — A CONFERÊNCIA DE DUPLICATA, antes de criar.
  //
  // Relato do admin: ele lançou o fechamento do Luciano pela conta de admin, o
  // Luciano lançou de novo pela dele, e ficaram dois cards de R$ 200.000 —
  // somando R$ 400.000 no painel, com o forecast a 304% da meta.
  //
  // ⚠️ AVISA, NÃO PROÍBE. O mesmo cliente aportando duas vezes é receita, não
  // erro. Trava dura mataria isso em silêncio, que é o pior desfecho. Aqui a
  // pessoa vê o que já existe e escolhe: abrir aquele, ou criar mesmo assim.
  const salvar = async () => {
    if (editando === 'nova' && duplicatas === null) {
      const achadas = possiveisDuplicatas(oportunidades, form, null);
      if (achadas.length) { setDuplicatas(achadas); return; }
    }
    await gravar();
  };

  // REL-34.2: valor digitado em português — "200.000" é duzentos mil
  const valorDigitado = parseValorBR(form.valor_previsto);
  const faltamNoEstagio = pendenciasParaEstagio(
    { ...form, valor_previsto: valorDigitado },
    form.estagio
  );
  const NOMES_CAMPO = { valor_previsto: 'valor do aporte', motivo_perda: 'motivo da perda', reuniao_em: 'data da reunião', recontato_em: 'data de recontato' };

  // 🪜 08/09/2026 — dono: "não faz sentido botar direto ali porque o cara
  // tem que listar, tem que qualificar, tem que dizer se contatou, se
  // agendou... se ele for colocar pelo atalho, ele tem que fazer o segundo,
  // terceiro, quarto e quinto hábito." O atalho "Nova oportunidade" não
  // pode pular a Lista (Hábito 3) → Contato (Hábito 4) → Agenda. Acha a
  // MESMA pessoa na Lista do Método (por e-mail/telefone/cadastro) e avisa
  // o que falta — quem já veio do botão "🚀 Esteira" do Contato (Hábito 4)
  // chega aqui com tudo isso já feito, então o aviso nem aparece.
  const pessoaDoMetodo = useMemo(() => {
    const email = String(form.cliente_email || '').trim().toLowerCase();
    const tel = String(form.cliente_telefone || '').replace(/\D/g, '');
    if (!email && !tel && !form.cliente_user_id) return null;
    return clientesManuais.find((c) => (
      (form.cliente_user_id && c.user_id === form.cliente_user_id)
      || (email && String(c.email || '').trim().toLowerCase() === email)
      || (tel && tel.length >= 8 && String(c.phone || '').replace(/\D/g, '') === tel)
    )) || null;
  }, [clientesManuais, form.cliente_email, form.cliente_telefone, form.cliente_user_id]);
  const statusMetodo = useMemo(() => {
    const naLista = !!pessoaDoMetodo;
    const qualificado = naLista && !!probabilidadeFechamento(pessoaDoMetodo.qualificacao_network);
    const ultimo = naLista ? ultimoContato(pessoaDoMetodo) : null;
    const contatado = !!ultimo;
    const agendado = ultimo?.resultado === 'agendado';
    return { naLista, qualificado, contatado, agendado, completo: naLista && qualificado && contatado };
  }, [pessoaDoMetodo]);
  // só pergunta quando já tem COMO identificar alguém (nome sozinho não amarra a ninguém)
  const identificavel = !!(form.cliente_email || form.cliente_telefone || form.cliente_user_id);

  return (
    <>
    <Card className="bg-white border-nz-borda mb-4 sm:mb-6" data-teste="esteira-painel">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-nz-tinta flex items-center gap-2" data-teste="esteira-titulo">
            <GitBranch className="w-4 h-4 text-nz-verde" />
            Esteira de Captação — do agendamento à assinatura
            <StatInfoTooltip text="Cada negociação de aporte ou licença acompanhada pelos 8 estágios oficiais, com a probabilidade de fechamento de cada um. O forecast pondera valor × probabilidade; o Fechado 100% se prova contra o dinheiro real (se o aporte não entrou na conta, o cartão avisa em âmbar). Cada responsável vê e move a própria carteira; a visão total vê tudo e o ranking do time." />
          </p>
          <span className="flex items-center gap-2">
            {/* 🖐️ 08/09/2026 — dono: "a plataforma tem que ensinar ela
                direto, não só o guia". Reabre o tour guiado quando quiser,
                sem precisar esperar a primeira visita. */}
            <button
              type="button"
              onClick={() => setTourAberto(true)}
              className="inline-flex items-center gap-1 rounded-full border border-nz-borda px-2.5 py-1.5 text-xs font-semibold text-nz-tinta-fraca hover:text-nz-verde hover:border-nz-verde/40"
              data-teste="esteira-como-funciona"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Como funciona
            </button>
            <Button size="sm" onClick={abrirNova} className="bg-nz-verde hover:bg-nz-verde-claro text-white" data-teste="esteira-nova">
              <Plus className="w-4 h-4 mr-1" /> Nova oportunidade
            </Button>
          </span>
        </div>

        {/* Forecast */}
        <div className="grid grid-cols-3 gap-2 mb-4 mt-2" data-teste="esteira-forecast">
          <div className="rounded-lg border border-nz-borda bg-nz-cinza-fundo p-2.5">
            <p className="text-[11px] text-nz-tinta-fraca">Em esteira (ponderado)</p>
            <p className="text-base font-bold text-nz-tinta">{fmtBRL(resumo.pipelinePonderado)}</p>
            <p className="text-[10px] text-nz-tinta-fraca">{resumo.ativas} negociações ativas</p>
          </div>
          <div className="rounded-lg border border-nz-verde/40 bg-nz-verde-fundo p-2.5">
            <p className="text-[11px] text-nz-tinta-fraca">Fechado (100%)</p>
            <p className="text-base font-bold text-nz-verde">{fmtBRL(resumo.fechado)}</p>
          </div>
          <div className="rounded-lg border border-nz-borda bg-nz-cinza-fundo p-2.5">
            <p className="text-[11px] text-nz-tinta-fraca">Fechado + esteira vs meta</p>
            <p className="text-base font-bold text-nz-tinta">{(((resumo.fechado + resumo.pipelinePonderado) / META_CAPTACAO) * 100).toFixed(1).replace('.', ',')}%</p>
            <p className="text-[10px] text-nz-tinta-fraca">da meta de {fmtBRL(META_CAPTACAO)}</p>
          </div>
        </div>

        {/* Kanban dos 8 estágios */}
        {/* 👆 dono: "a esteira... está vazando no celular" — o Kanban é largo
            demais pro celular de propósito (8 estágios lado a lado), então
            SEMPRE precisou rolar de lado; sem esse aviso, quem só usa touch
            achava que estava quebrado. Só aparece abaixo de `sm` (no desktop
            as 8 colunas já cabem sem rolar). */}
        <p className="sm:hidden text-[10px] text-nz-tinta-fraca flex items-center gap-1 mb-1" data-teste="esteira-dica-arrastar">
          <ArrowLeftRight className="w-3 h-3" /> arraste pra ver os outros estágios
        </p>
        <div className="overflow-x-auto pb-2" data-teste="esteira-kanban">
          <div className="flex gap-2 min-w-[1100px]">
            {ESTAGIOS_ESTEIRA.map((est) => {
              const doEstagio = oportunidades.filter((o) => o.estagio === est.id);
              const valorCol = doEstagio.reduce((s, o) => s + (Number(o.valor_previsto) || 0), 0);
              return (
                <div key={est.id} className={`flex-1 min-w-[135px] rounded-xl border ${est.id === 'sem_interesse' ? 'border-nz-borda bg-nz-cinza-fundo/40 opacity-80' : 'border-nz-borda bg-nz-cinza-fundo/60'}`}>
                  <div className="p-2 border-b border-nz-borda">
                    <p className="text-[11px] font-semibold text-nz-tinta leading-tight">{est.label}</p>
                    <p className="text-[10px] text-nz-tinta-fraca">{doEstagio.length} · {fmtBRL(valorCol)}{est.id !== 'sem_interesse' && est.prob < 100 ? ` · ${est.prob}%` : ''}</p>
                  </div>
                  <div className="p-1.5 space-y-1.5 max-h-[360px] overflow-y-auto">
                    {doEstagio.map((o) => {
                      const dias = diasNoEstagio(o);
                      const parada = o.estagio !== 'sem_interesse' && o.estagio !== 'fechado_100' && dias >= DIAS_PARADA_ATENCAO;
                      const provado = o.estagio === 'fechado_100' ? dinheiroNaConta(o, sales) : null;
                      return (
                        /* 🗑️ 09/09/2026 — o card virou div com DOIS botões: o
                           corpo (abre a edição) e o apagar no canto. Antes o
                           card inteiro era um <button>, e botão dentro de botão
                           é HTML inválido — o clique de apagar seria engolido
                           pelo de abrir. */
                        <div key={o.id} className="relative group">
                        {podeApagar && (
                          <button
                            type="button"
                            onClick={() => setApagando(o)}
                            title="apagar este card da esteira"
                            aria-label={`Apagar a oportunidade de ${o.cliente_nome}`}
                            data-teste="apagar-oportunidade"
                            className="absolute top-1 right-1 z-10 rounded p-1 text-nz-tinta-fraca/50 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => abrirEdicao(o)}
                          className="w-full text-left rounded-lg border border-nz-borda bg-white p-2 hover:border-nz-verde/50 transition-colors"
                        >
                          <p className="text-xs font-semibold text-nz-tinta truncate">{o.cliente_nome}</p>
                          <p className="text-[10px] text-nz-tinta-fraca truncate">{tipoLabel(o.tipo)}</p>
                          {Number(o.valor_previsto) > 0 && <p className="text-[11px] font-bold text-nz-verde">{fmtBRL(o.valor_previsto)}</p>}
                          {o.reuniao_em && <p className="text-[10px] text-nz-tinta-fraca">📅 {fmtData(o.reuniao_em)}</p>}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {o.responsavel_nome && <span className="px-1 py-0.5 rounded bg-nz-cinza-fundo text-[9px] text-nz-tinta-fraca border border-nz-borda truncate max-w-full">{o.responsavel_nome.split(' ')[0]}</span>}
                            {o.indicacao_nome && <span className="px-1 py-0.5 rounded bg-nz-verde/10 text-[9px] text-nz-verde border border-nz-verde/20 truncate max-w-full">via {String(o.indicacao_nome).split(' ')[0]}</span>}
                            {parada && <span className={`px-1 py-0.5 rounded text-[9px] font-semibold ${dias >= DIAS_PARADA_CRITICO ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{dias}d parada</span>}
                            {semPPV(o) && <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-600 border border-red-200">⚠️ sem PPV</span>}
                            {provado === true && <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-nz-verde/10 text-nz-verde border border-nz-verde/30">💰 na conta{aporteExternoValido(o) ? ` (${BANCOS_APORTE_EXTERNO.find((b) => b.id === o.aporte_externo.banco)?.label})` : ''}</span>}
                            {provado === false && <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">⚠️ sem dinheiro na conta</span>}
                          </div>
                        </button>
                        </div>
                      );
                    })}
                    {doEstagio.length === 0 && <p className="text-[10px] text-center text-nz-tinta-fraca py-2">vazio</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking do time — % de conversão (só visão total) */}
        {visaoTotal && ranking.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-nz-tinta-fraca mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Conversão do time
              <StatInfoTooltip text="Win rate = fechadas ÷ (fechadas + perdidas), o padrão de mercado — mede a pontaria de quem negocia. Conversão do funil = fechadas ÷ todas as oportunidades. Quem não encerrou nenhuma ainda aparece sem taxa (não inventamos número)." />
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-nz-borda bg-nz-cinza-fundo">
                    <th className="text-left p-2 font-semibold text-nz-tinta">Responsável</th>
                    <th className="text-center p-2 font-semibold text-nz-tinta">Oportunidades</th>
                    <th className="text-right p-2 font-semibold text-nz-tinta">Em esteira</th>
                    <th className="text-right p-2 font-semibold text-nz-tinta">Fechado</th>
                    <th className="text-center p-2 font-semibold text-nz-tinta">Win rate</th>
                    <th className="text-center p-2 font-semibold text-nz-tinta">Conversão do funil</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r) => (
                    <tr key={r.chave} className="border-b border-nz-borda hover:bg-nz-cinza-fundo">
                      <td className="p-2 text-nz-tinta font-medium">{r.nome}</td>
                      <td className="p-2 text-center text-nz-tinta-fraca">{r.total}</td>
                      <td className="p-2 text-right text-nz-tinta">{fmtBRL(r.valorEmEsteira)}</td>
                      <td className="p-2 text-right text-nz-verde font-semibold">{fmtBRL(r.valorFechado)}</td>
                      <td className="p-2 text-center font-semibold text-nz-tinta">{r.winRate === null ? '—' : `${r.winRate.toFixed(0)}%`}</td>
                      <td className="p-2 text-center text-nz-tinta-fraca">{r.conversaoFunil.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal nova/editar */}
        {/* 🔁 AVISO DE DUPLICATA — segura o salvar e mostra o que já existe.
            Avisa, não proíbe: cliente que aporta duas vezes é receita. */}
        {duplicatas !== null && duplicatas.length > 0 && (
          <div className="fixed inset-0 z-[95] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" data-teste="aviso-duplicata">
            <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-4 sm:p-5 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-base font-bold text-nz-tinta">Já existe {duplicatas.length === 1 ? 'uma oportunidade' : `${duplicatas.length} oportunidades`} desse cliente</p>
                  <p className="text-[12px] text-nz-tinta-fraca mt-0.5">
                    Se for a mesma negociação, abra a que já está na esteira em vez de criar outra —
                    dois cards do mesmo negócio <strong className="text-nz-tinta">somam em dobro</strong> no fechado e no forecast.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {duplicatas.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setDuplicatas(null); abrirEdicao(d); }}
                    data-teste="abrir-a-existente"
                    className="w-full text-left rounded-lg border border-nz-borda hover:border-nz-verde p-2.5 transition-colors"
                  >
                    <p className="text-[13px] font-semibold text-nz-tinta">{d.cliente_nome}</p>
                    <p className="text-[11px] text-nz-tinta-fraca">
                      {estagioDe(d.estagio).label}
                      {Number(d.valor_previsto) > 0 ? ` · ${fmtBRL(d.valor_previsto)}` : ''}
                      {d.responsavel_nome ? ` · ${String(d.responsavel_nome).split(' ')[0]}` : ''}
                    </p>
                    {aporteExternoValido(d) && <p className="text-[10px] font-semibold text-nz-verde mt-0.5">💰 já tem o dinheiro registrado na conta</p>}
                    <p className="text-[10px] text-nz-verde font-semibold mt-1">abrir esta →</p>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" onClick={() => setDuplicatas(null)} className="flex-1">Voltar</Button>
                {/* ⚠️ o caminho de criar mesmo assim existe de propósito: mesmo
                    cliente aportando de novo é negócio novo, não engano. */}
                <Button onClick={gravar} disabled={salvando} data-teste="criar-assim-mesmo" className="flex-1 bg-nz-verde hover:bg-nz-verde-claro text-white">
                  {salvando ? 'Criando...' : 'É outra negociação — criar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 🗑️ APAGAR — a confirmação DIZ O QUE SE PERDE. No caso do Renan, um
            dos cards carregava o registro dos R$ 200.000 no Santander; apagar o
            errado apagaria o comprovante. */}
        {apagando && (
          <div className="fixed inset-0 z-[95] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" data-teste="confirmar-apagar">
            <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-4 sm:p-5 space-y-3">
              <p className="text-base font-bold text-nz-tinta">Apagar da esteira?</p>
              <div className="rounded-lg border border-nz-borda p-2.5">
                <p className="text-[13px] font-semibold text-nz-tinta">{apagando.cliente_nome}</p>
                <p className="text-[11px] text-nz-tinta-fraca">
                  {estagioDe(apagando.estagio).label}
                  {Number(apagando.valor_previsto) > 0 ? ` · ${fmtBRL(apagando.valor_previsto)}` : ''}
                </p>
              </div>
              {aporteExternoValido(apagando) && (
                <p className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-2 text-[12px] text-amber-800">
                  ⚠️ <strong>Este card é o que guarda a prova do dinheiro</strong>
                  {` (${BANCOS_APORTE_EXTERNO.find((b) => b.id === apagando.aporte_externo?.banco)?.label || 'banco'})`}.
                  Se o duplicado for o outro, apague o outro.
                </p>
              )}
              <p className="text-[11px] text-nz-tinta-fraca">Fica registrado quem apagou, e o conteúdo é guardado no log — dá pra reconstruir se for engano.</p>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setApagando(null)} className="flex-1">Cancelar</Button>
                <Button
                  onClick={async () => { const alvo = apagando; setApagando(null); await onApagar?.(alvo); }}
                  data-teste="confirmar-apagar-botao"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Apagar
                </Button>
              </div>
            </div>
          </div>
        )}

        {editando !== null && (
          // 🎨 08/09/2026 — dono: "o fundo transparente está deixando meio
          // confuso... não pode disputar a leitura." De 50% pra 80% + um
          // leve desfoque — o formulário se separa do que está atrás sem
          // perder a sensação de "página por cima", só ficando mais sólido.
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="bg-white border-nz-borda max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-bold text-nz-tinta">{editando === 'nova' ? 'Nova oportunidade' : `Editar — ${form.cliente_nome}`}</p>
                  <Button variant="ghost" size="icon" onClick={() => setEditando(null)}><X className="w-5 h-5 text-nz-tinta-fraca" /></Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editando === 'nova' && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-nz-tinta-fraca mb-1 flex items-center gap-1"><Search className="w-3 h-3" /> Buscar cliente do CRM (preenche e amarra sozinho)</p>
                      <Input
                        value={buscaCliente}
                        onChange={(e) => setBuscaCliente(e.target.value)}
                        placeholder="nome, e-mail ou telefone de quem já está no CRM..."
                        className="bg-white border-nz-borda text-nz-tinta"
                      />
                      {sugestoesCliente.length > 0 && (
                        <div className="mt-1 border border-nz-borda rounded-lg overflow-hidden divide-y divide-nz-borda">
                          {sugestoesCliente.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={() => escolherCliente(c)}
                              className="w-full text-left px-3 py-2 bg-white hover:bg-nz-verde-fundo"
                            >
                              <p className="text-sm text-nz-tinta font-medium truncate">{c.full_name || c.email || 'Sem nome'}</p>
                              <p className="text-xs text-nz-tinta-fraca truncate">{[c.email, c.phone].filter(Boolean).join(' · ')}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <p className="text-xs text-nz-tinta-fraca mb-1">Nome do cliente *{form.cliente_user_id ? ' · 🔗 amarrado ao cadastro' : ''}</p>
                    <Input value={form.cliente_nome || ''} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} className="bg-white border-nz-borda text-nz-tinta" />
                  </div>
                  <div>
                    <p className="text-xs text-nz-tinta-fraca mb-1">E-mail</p>
                    <Input value={form.cliente_email || ''} onChange={(e) => setForm({ ...form, cliente_email: e.target.value })} className="bg-white border-nz-borda text-nz-tinta" />
                  </div>
                  <div>
                    <p className="text-xs text-nz-tinta-fraca mb-1">Telefone (WhatsApp)</p>
                    <Input value={form.cliente_telefone || ''} onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })} className="bg-white border-nz-borda text-nz-tinta" />
                  </div>

                  {/* 🪜 08/09/2026 — dono: "não faz sentido botar direto ali...
                      ele tem que listar, tem que qualificar, tem que dizer se
                      contatou, se agendou." Só aparece em oportunidade NOVA,
                      com alguém já identificável, e com alguma etapa faltando
                      — quem veio do "🚀 Esteira" do Contato já chega com tudo
                      feito, então não vê nada disto. */}
                  {editando === 'nova' && identificavel && !statusMetodo.completo && (
                    <div className="sm:col-span-2 rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                      <p className="text-xs font-bold text-amber-900">🪜 Antes da esteira, o caminho do Método:</p>
                      <ul className="space-y-1 text-xs text-amber-900">
                        <li className="flex items-center gap-1.5">
                          {statusMetodo.naLista && statusMetodo.qualificado ? '✅' : '❌'} Está na Lista, qualificada (Hábito 3)
                          {!(statusMetodo.naLista && statusMetodo.qualificado) && (
                            <button type="button" onClick={() => onIr?.('lista')} className="font-semibold text-amber-700 hover:text-amber-900 underline">ir qualificar →</button>
                          )}
                        </li>
                        <li className="flex items-center gap-1.5">
                          {statusMetodo.contatado ? '✅' : '❌'} Já registrou o contato (Hábito 4)
                          {!statusMetodo.contatado && (
                            <button type="button" onClick={() => onIr?.('contato')} className="font-semibold text-amber-700 hover:text-amber-900 underline">ir registrar →</button>
                          )}
                        </li>
                        <li className="flex items-center gap-1.5">
                          {statusMetodo.agendado ? '✅' : '❌'} Já tem reunião marcada
                        </li>
                      </ul>
                      <label className="flex items-start gap-2 pt-1 border-t border-amber-200 cursor-pointer">
                        <input type="checkbox" checked={pulaEtapas} onChange={(e) => setPulaEtapas(e.target.checked)} className="mt-0.5" />
                        <span className="text-[11px] text-amber-900">Não é um contato da rede (ex.: aporte de investidor direto) — seguir mesmo sem essas etapas.</span>
                      </label>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-nz-tinta-fraca mb-1">O que está sendo negociado</p>
                    <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full bg-white text-nz-tinta rounded-md px-3 py-2 border border-nz-borda">
                      {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-nz-tinta-fraca mb-1">Valor do aporte (R$)</p>
                    {/* texto + inputMode: aceita "200.000" e "200.000,50" do jeito brasileiro */}
                    <Input type="text" inputMode="decimal" placeholder="ex.: 200.000" value={form.valor_previsto} onChange={(e) => setForm({ ...form, valor_previsto: e.target.value })} className="bg-white border-nz-borda text-nz-tinta" />
                    {valorDigitado > 0 && (
                      <p className="text-[11px] text-nz-verde mt-0.5">= R$ {valorDigitado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    )}
                  </div>
                  {/* 🏛️ DIR-39 — responsável de contrato SEMPRE é executivo do topo */}
                  <div>
                    <p className="text-xs text-nz-tinta-fraca mb-1">Executivo responsável *</p>
                    <select
                      value={form.responsavel_id || ''}
                      onChange={(e) => {
                        const ex = executivos.find((x) => x.user.id === e.target.value);
                        setForm({ ...form, responsavel_id: e.target.value || null, responsavel_nome: ex?.user.full_name || form.responsavel_nome || '' });
                      }}
                      className="w-full bg-white text-nz-tinta rounded-md px-3 py-2 border border-nz-borda"
                    >
                      <option value="">— Selecione o executivo —</option>
                      {executivos.map((ex) => (
                        <option key={ex.user.id} value={ex.user.id}>
                          {ex.user.full_name || ex.user.email} ({getLevel(ex.funcaoPrincipal).name})
                        </option>
                      ))}
                      {/* registro antigo com responsável fora do topo: aparece pra não sumir, mas o novo padrão é o topo */}
                      {form.responsavel_id && !executivos.some((x) => x.user.id === form.responsavel_id) && (
                        <option value={form.responsavel_id}>{form.responsavel_nome || 'Responsável atual'}</option>
                      )}
                    </select>
                  </div>
                  {/* 🧬 DIR-39 — indicação rastreada: só gente cadastrada no app */}
                  <div>
                    <p className="text-xs text-nz-tinta-fraca mb-1">Indicação da estrutura (opcional)</p>
                    {form.indicacao_user_id ? (
                      <div className="flex items-center justify-between gap-2 bg-nz-verde-fundo border border-nz-verde/30 rounded-md px-3 py-2">
                        <p className="text-sm text-nz-tinta truncate">🔗 {form.indicacao_nome}</p>
                        <button type="button" onClick={() => setForm({ ...form, indicacao_user_id: null, indicacao_nome: null })} className="text-nz-tinta-fraca hover:text-nz-tinta text-xs">remover</button>
                      </div>
                    ) : (
                      <>
                        <Input
                          value={buscaIndicacao}
                          onChange={(e) => setBuscaIndicacao(e.target.value)}
                          placeholder="quem indicou? (precisa estar cadastrado)"
                          className="bg-white border-nz-borda text-nz-tinta"
                        />
                        {sugestoesIndicacao.length > 0 && (
                          <div className="mt-1 border border-nz-borda rounded-lg overflow-hidden divide-y divide-nz-borda">
                            {sugestoesIndicacao.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onMouseDown={() => { setForm({ ...form, indicacao_user_id: u.id, indicacao_nome: u.full_name || u.email }); setBuscaIndicacao(''); }}
                                className="w-full text-left px-3 py-2 bg-white hover:bg-nz-verde-fundo"
                              >
                                <p className="text-sm text-nz-tinta font-medium truncate">{u.full_name || u.email}</p>
                                <p className="text-xs text-nz-tinta-fraca truncate">{[u.email, u.phone].filter(Boolean).join(' · ')}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-nz-tinta-fraca mb-1">Objeção atual (método — Hábito 6)</p>
                    <select value={form.objecao || ''} onChange={(e) => setForm({ ...form, objecao: e.target.value || null })} className="w-full bg-white text-nz-tinta rounded-md px-3 py-2 border border-nz-borda">
                      <option value="">— Sem objeção no momento —</option>
                      {OBJECOES_METODO.map((ob) => <option key={ob.id} value={ob.id}>{ob.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-nz-tinta-fraca mb-1">Estágio</p>
                    <select value={form.estagio} onChange={(e) => setForm({ ...form, estagio: e.target.value })} className="w-full bg-white text-nz-tinta rounded-md px-3 py-2 border border-nz-borda">
                      {ESTAGIOS_ESTEIRA.map((est) => <option key={est.id} value={est.id}>{est.label} ({est.prob}%)</option>)}
                    </select>
                  </div>
                  {form.estagio === 'sem_interesse' && (
                    <div>
                      <p className="text-xs text-nz-tinta-fraca mb-1">Motivo da perda *</p>
                      <select value={form.motivo_perda || ''} onChange={(e) => setForm({ ...form, motivo_perda: e.target.value })} className="w-full bg-white text-nz-tinta rounded-md px-3 py-2 border border-nz-borda">
                        <option value="">— Selecione —</option>
                        {MOTIVOS_PERDA.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </div>
                  )}
                  {form.estagio === 'interesse_futuro' && (
                    <div>
                      <p className="text-xs text-nz-tinta-fraca mb-1">Voltar a falar em *</p>
                      <Input type="date" value={form.recontato_em || ''} onChange={(e) => setForm({ ...form, recontato_em: e.target.value })} className="bg-white border-nz-borda text-nz-tinta" />
                    </div>
                  )}
                  {estagioDe(form.estagio).exige.includes('reuniao_em') && (
                    <div>
                      <p className="text-xs text-nz-tinta-fraca mb-1">{form.estagio === 'fechado_99' ? 'Reunião de assinatura *' : 'Reunião *'}</p>
                      <Input type="datetime-local" value={form.reuniao_em || ''} onChange={(e) => setForm({ ...form, reuniao_em: e.target.value })} className="bg-white border-nz-borda text-nz-tinta" />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <p className="text-xs text-nz-tinta-fraca mb-1">Anotações</p>
                    <Textarea value={form.anotacoes || ''} onChange={(e) => setForm({ ...form, anotacoes: e.target.value })} rows={2} className="bg-white border-nz-borda text-nz-tinta" placeholder="O que foi conversado, objeções, próximos passos..." />
                  </div>
                </div>

                {faltamNoEstagio.length > 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Pra ficar em "{estagioDe(form.estagio).label}" falta: {faltamNoEstagio.map((c) => NOMES_CAMPO[c] || c).join(', ')}.
                  </p>
                )}

                {/* 📜 DIR-36 — a CRONOLOGIA da negociação: cada movimento, quem e quando */}
                {editando !== 'nova' && Array.isArray(form.historico) && form.historico.length > 0 && (
                  <div className="rounded-lg border border-nz-borda p-3">
                    <p className="text-xs font-semibold text-nz-tinta mb-2 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-nz-verde" /> Linha do tempo
                      <span className="font-normal text-nz-tinta-fraca">· há {diasNoEstagio(form)} dia(s) no estágio atual</span>
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {[...form.historico].reverse().map((h, i) => (
                        <p key={i} className="text-xs text-nz-tinta-fraca">
                          <span className="text-nz-tinta font-medium">{h.em ? new Date(h.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                          {' · '}
                          {h.de ? `${estagioDe(h.de).label} → ` : 'Criada em '}{estagioDe(h.para).label}
                          {h.por ? ` · ${h.por}` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 💵 DIR-40 — o dinheiro entrou POR FORA (Santander/Itaú) */}
                {editando !== 'nova' && form.estagio === 'fechado_100' && aporteExternoValido(form) && (
                  <div className="rounded-lg border border-nz-verde/40 bg-nz-verde-fundo p-3">
                    <p className="text-sm font-semibold text-nz-verde">💵 Aporte recebido por fora — {BANCOS_APORTE_EXTERNO.find((b) => b.id === form.aporte_externo.banco)?.label}</p>
                    <p className="text-xs text-nz-tinta mt-0.5">
                      {fmtBRL(Number(form.aporte_externo.valor))} · {fmtData(form.aporte_externo.data)} · registrado por {form.aporte_externo.registrado_por || '—'}
                      {form.aporte_externo.em ? ` em ${new Date(form.aporte_externo.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
                    </p>
                  </div>
                )}
                {editando !== 'nova' && form.estagio === 'fechado_100' && !dinheiroNaConta(form, sales) && podeRegistrarAporte && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs text-amber-800">
                      ⚠️ Sem dinheiro rastreado na conta pra este contrato. Se o aporte entrou pelo app, amarre o cliente certo acima. Se entrou por transferência direto na conta da empresa:
                    </p>
                    {!aporteForm ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAporteForm({ banco: 'santander', valor: form.valor_previsto || '', data: new Date().toISOString().slice(0, 10) })}
                        className="border-amber-300 text-amber-800 hover:bg-amber-100"
                      >
                        💵 Dinheiro entrou por fora (Santander/Itaú)
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <p className="text-[11px] text-amber-800 mb-1">Conta que recebeu *</p>
                            <select value={aporteForm.banco} onChange={(e) => setAporteForm({ ...aporteForm, banco: e.target.value })} className="w-full bg-white text-nz-tinta rounded-md px-2 py-1.5 border border-amber-300 text-sm">
                              {BANCOS_APORTE_EXTERNO.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <p className="text-[11px] text-amber-800 mb-1">Valor recebido (R$) *</p>
                            <Input type="text" inputMode="decimal" value={aporteForm.valor} onChange={(e) => setAporteForm({ ...aporteForm, valor: e.target.value })} className="bg-white border-amber-300 text-nz-tinta text-sm" />
                            {parseValorBR(aporteForm.valor) > 0 && <p className="text-[10px] text-nz-verde mt-0.5">= {fmtBRL(parseValorBR(aporteForm.valor))}</p>}
                          </div>
                          <div>
                            <p className="text-[11px] text-amber-800 mb-1">Data da entrada *</p>
                            <Input type="date" value={aporteForm.data} onChange={(e) => setAporteForm({ ...aporteForm, data: e.target.value })} className="bg-white border-amber-300 text-nz-tinta text-sm" />
                          </div>
                        </div>
                        <p className="text-[10px] text-amber-800">
                          Fica registrado com seu nome, data e hora. Atenção: se este aporte também for ativado como plano manual no painel de parceiro, ele contaria DUAS vezes na captação — registre num lugar só.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={salvando || !(parseValorBR(aporteForm.valor) > 0) || !aporteForm.data}
                            onClick={async () => {
                              setSalvando(true);
                              try {
                                await onRegistrarAporteExterno(editando, { banco: aporteForm.banco, valor: parseValorBR(aporteForm.valor), data: aporteForm.data });
                                setEditando(null);
                              } finally { setSalvando(false); }
                            }}
                            className="bg-nz-verde hover:bg-nz-verde-claro text-white"
                          >
                            {salvando ? 'Registrando...' : 'Confirmar recebimento'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setAporteForm(null)} className="border-nz-borda text-nz-tinta">Cancelar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!form.responsavel_id && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Todo contrato precisa de um <strong>executivo responsável</strong> do topo (Sócio Executivo → Fundador).
                  </p>
                )}
                {/* 🪜 etapa do Método faltando + atalho novo + sem marcar "seguir mesmo assim" → trava o Salvar */}
                <Button
                  onClick={salvar}
                  disabled={salvando || !String(form.cliente_nome || '').trim() || !form.responsavel_id || faltamNoEstagio.length > 0 || (editando === 'nova' && identificavel && !statusMetodo.completo && !pulaEtapas)}
                  className="w-full bg-nz-verde hover:bg-nz-verde-claro text-white"
                >
                  <Save className="w-4 h-4 mr-2" /> {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
    <TourGuiado ativo={tourAberto} passos={PASSOS_TOUR_ESTEIRA} onFechar={fecharTour} />
    </>
  );
}

// 🖐️ os passos da mãozinha da Esteira — a mesma história que a análise
// pediu pra ficar clara: a fila avisa, o card é onde você atualiza, e o
// forecast mostra se está indo bem.
const PASSOS_TOUR_ESTEIRA = [
  {
    alvo: 'esteira-titulo',
    titulo: 'Essa é a Esteira de Captação',
    texto: 'Toda negociação de aporte ou licença mora aqui, do agendamento da reunião até a assinatura. 8 estágios oficiais, cada um com a probabilidade de fechar.',
  },
  {
    alvo: 'esteira-nova',
    titulo: 'Comece por aqui',
    texto: 'Toque em "Nova oportunidade" assim que agendar a primeira reunião com alguém — mesmo sem valor fechado ainda.',
  },
  {
    alvo: 'esteira-kanban',
    titulo: 'Cada coluna é um estágio',
    texto: 'Toque em qualquer card pra abrir e atualizar: o que aconteceu na reunião, pra qual estágio a negociação foi, a próxima data. É sempre aqui que você mexe — e assim que uma reunião acontece, ela também te cutuca na fila "Quem contatar hoje" (aba Clientes), levando direto pra este mesmo card.',
  },
  {
    alvo: 'esteira-forecast',
    titulo: 'E aqui você vê se está indo bem',
    texto: 'O forecast pondera valor × probabilidade de cada estágio, e mostra o quanto falta pra meta. Sobe sozinho conforme você mantém a esteira atualizada.',
  },
];
