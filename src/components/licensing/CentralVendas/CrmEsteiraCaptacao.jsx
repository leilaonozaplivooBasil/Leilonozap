import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GitBranch, Plus, X, Save, Trophy, Search, History } from 'lucide-react';
import StatInfoTooltip from './StatInfoTooltip';
import {
  ESTAGIOS_ESTEIRA, MOTIVOS_PERDA, estagioDe, pendenciasParaEstagio,
  resumoEsteira, conversaoPorResponsavel, diasNoEstagio, dinheiroNaConta,
  DIAS_PARADA_ATENCAO, DIAS_PARADA_CRITICO,
} from '@/lib/esteiraCaptacao';
import { buscarPessoas } from '@/lib/buscaPessoa';
import { parseValorBR } from '@/lib/money';
import { getLevel } from '@/lib/careerLevels';
import { ESCADA_LICENCAS } from '@/lib/escadaLicencas';
import { META_CAPTACAO } from '@/lib/captacaoParceiros';

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

export default function CrmEsteiraCaptacao({ oportunidades = [], sales = [], clientes = [], executivos = [], usuariosApp = [], currentUser, visaoTotal, onSalvar, clientePreenchido, onClientePreenchidoConsumido }) {
  const [editando, setEditando] = useState(null); // null | 'nova' | oportunidade
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  // 🔎 DIR-36 — busca de cliente EXISTENTE na nova oportunidade (nada de
  // redigitar quem o CRM já conhece; e amarra cliente_user_id de verdade).
  const [buscaCliente, setBuscaCliente] = useState('');
  // 🧬 DIR-39 — busca de quem INDICOU (só gente cadastrada no app: indicação
  // sem cadastro não existe).
  const [buscaIndicacao, setBuscaIndicacao] = useState('');

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
    setEditando('nova');
    onClientePreenchidoConsumido?.();
  }, [clientePreenchido]);

  const salvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(editando === 'nova' ? null : editando, form);
      setEditando(null);
    } finally {
      setSalvando(false);
    }
  };

  // REL-34.2: valor digitado em português — "200.000" é duzentos mil
  const valorDigitado = parseValorBR(form.valor_previsto);
  const faltamNoEstagio = pendenciasParaEstagio(
    { ...form, valor_previsto: valorDigitado },
    form.estagio
  );
  const NOMES_CAMPO = { valor_previsto: 'valor do aporte', motivo_perda: 'motivo da perda', reuniao_em: 'data da reunião', recontato_em: 'data de recontato' };

  return (
    <Card className="bg-white border-nz-borda mb-4 sm:mb-6">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-nz-tinta flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-nz-verde" />
            Esteira de Captação — do agendamento à assinatura
            <StatInfoTooltip text="Cada negociação de aporte ou licença acompanhada pelos 8 estágios oficiais, com a probabilidade de fechamento de cada um. O forecast pondera valor × probabilidade; o Fechado 100% se prova contra o dinheiro real (se o aporte não entrou na conta, o cartão avisa em âmbar). Cada responsável vê e move a própria carteira; a visão total vê tudo e o ranking do time." />
          </p>
          <Button size="sm" onClick={abrirNova} className="bg-nz-verde hover:bg-nz-verde-claro text-white">
            <Plus className="w-4 h-4 mr-1" /> Nova oportunidade
          </Button>
        </div>

        {/* Forecast */}
        <div className="grid grid-cols-3 gap-2 mb-4 mt-2">
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
        <div className="overflow-x-auto pb-2">
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
                        <button
                          key={o.id}
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
                            {provado === true && <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-nz-verde/10 text-nz-verde border border-nz-verde/30">💰 na conta</span>}
                            {provado === false && <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">⚠️ sem dinheiro na conta</span>}
                          </div>
                        </button>
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
        {editando !== null && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
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

                {!form.responsavel_id && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Todo contrato precisa de um <strong>executivo responsável</strong> do topo (Sócio Executivo → Fundador).
                  </p>
                )}
                <Button
                  onClick={salvar}
                  disabled={salvando || !String(form.cliente_nome || '').trim() || !form.responsavel_id || faltamNoEstagio.length > 0}
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
  );
}
