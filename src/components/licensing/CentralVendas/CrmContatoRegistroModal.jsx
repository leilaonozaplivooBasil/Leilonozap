import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Check, Loader2, PhoneCall, CalendarPlus } from 'lucide-react';
import { RESULTADOS_CONTATO, registroContatoValido, DURACOES_REUNIAO, DIAS_SEMANA } from '@/lib/metodo';
import { agendasVisiveis, agendaPorId, linhaDaAgenda } from '@/lib/agendaEmpresa';

// 📜 DIR-47/48/49 — REGISTRAR O CONTATO + AGENDADOR DE REUNIÃO DE VERDADE.
// Três jeitos de abrir (DIR-49 deixou cada um óbvio):
//  · agendarDireto + contatoInicial → AGENDA em 1 clique, pessoa já escolhida;
//  · contatoInicial sozinho → registra o desfecho (os 5 de sempre);
//  · nada → agendar livre, escolhendo o contato no passo 1.
// O agendado cria o evento DIRETO na Google Agenda da própria pessoa (quando
// ela permitir; fallback honesto é o link de template) e tudo vira histórico
// em customers.contatos_metodo.
//
// 🏛️ DIR-73 — O PASSO 1 GANHOU UMA SEGUNDA PORTA. Metade da agenda de quem
// trabalha aqui não tem um contato do outro lado: mentoria, treinamento,
// evento e reunião de área são compromissos DA CASA. Escolhendo "agenda da
// empresa", o destino da gravação MUDA — vai pra reunioes_empresa (DIR-52) e
// não pro histórico de um contato. Enfiar a agenda da empresa no histórico de
// alguém encheria a ficha de um coitado com a grade inteira da casa.
// A porta só aparece quando o pai passa `onSalvarAgendaEmpresa`, e o pai só
// passa pra quem tem visão total: marcar na agenda de TODO MUNDO continua
// sendo de quem já podia.

// passo numerado do agendador — clareza de "o que falta preencher"
function Passo({ n, titulo, children }) {
  return (
    <div>
      <p className="text-xs font-bold text-nz-tinta uppercase tracking-wide mb-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-nz-verde text-white text-[11px] mr-1.5">{n}</span>
        {titulo}
      </p>
      {children}
    </div>
  );
}

export default function CrmContatoRegistroModal({ aberto, contatoInicial = null, agendarDireto = false, registroInicial = null, contatos = [], onFechar, onSalvar, salvando, criarNoGoogleFn, onSalvarAgendaEmpresa = null, visaoTotal = false, autor = null }) {
  const [contatoSel, setContatoSel] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [quando, setQuando] = useState('');
  const [duracao, setDuracao] = useState(60);
  const [tituloReuniao, setTituloReuniao] = useState('');
  const [local, setLocal] = useState('');
  const [retornarEm, setRetornarEm] = useState('');
  const [obs, setObs] = useState('');
  const [criarNoGoogle, setCriarNoGoogle] = useState(true);
  const [criando, setCriando] = useState(false);
  // 🏛️ DIR-73 — a segunda porta do passo 1
  const [alvo, setAlvo] = useState('contato');        // 'contato' | 'empresa'
  const [agendaId, setAgendaId] = useState('');
  const [recorrencia, setRecorrencia] = useState('semana'); // 'semana' | 'data'
  const [diaSemana, setDiaSemana] = useState(1);
  const [dataUnica, setDataUnica] = useState('');
  const [horaEmpresa, setHoraEmpresa] = useState('19:30');

  const editando = !!registroInicial; // DIR-50 — reabrir o agendador preenchido
  const modoAgendar = editando || agendarDireto || !contatoInicial; // agendador na cara; senão, registro de desfecho
  // a porta 🏛️ só existe no agendar LIVRE: com contato já escolhido (ou
  // editando uma reunião que existe) a pergunta "com quem?" já foi respondida,
  // e oferecer trocar o destino da gravação ali seria uma armadilha.
  const podeAgendaEmpresa = !!onSalvarAgendaEmpresa && modoAgendar && !contatoInicial && !editando;
  const grupos = podeAgendaEmpresa ? agendasVisiveis({ visaoTotal }) : [];
  const agendaSel = alvo === 'empresa' ? agendaPorId(agendaId) : null;

  useEffect(() => {
    if (aberto) {
      setContatoSel(contatoInicial || null);
      setResultado(modoAgendar ? 'agendado' : null);
      setQuando(String(registroInicial?.quando || '').slice(0, 16));
      setDuracao(registroInicial?.duracao_min || 60);
      setTituloReuniao(registroInicial?.titulo_reuniao || '');
      setLocal(registroInicial?.local || '');
      setRetornarEm(''); setObs(registroInicial?.obs || ''); setCriarNoGoogle(true);
      setAlvo('contato'); setAgendaId(''); setRecorrencia('semana'); setDiaSemana(1); setDataUnica(''); setHoraEmpresa('19:30');
    }
  }, [aberto, contatoInicial, modoAgendar, registroInicial]);

  // título sugerido acompanha a pessoa escolhida (mas é editável)
  useEffect(() => {
    if (aberto && contatoSel && !registroInicial) setTituloReuniao(`Reunião — ${contatoSel.full_name || 'contato'} (Leilão NoZap)`);
  }, [aberto, contatoSel, registroInicial]);

  // 🏛️ DIR-73 — escolher a agenda traz a CADÊNCIA DO MERCADO pronta (dia, hora
  // e duração), pra pessoa confirmar em vez de decidir do zero. Tudo segue
  // editável logo abaixo: sugestão que não dá pra mudar vira camisa de força.
  useEffect(() => {
    const a = agendaPorId(agendaId);
    if (!a) return;
    setDiaSemana(a.dia_semana);
    setHoraEmpresa(a.hora);
    setDuracao(a.duracao_min);
    setTituloReuniao(a.nome);
  }, [agendaId]);

  if (!aberto) return null;
  const registro = {
    resultado,
    quando: resultado === 'agendado' ? quando : undefined,
    duracao_min: resultado === 'agendado' ? duracao : undefined,
    titulo_reuniao: resultado === 'agendado' ? tituloReuniao.trim() || undefined : undefined,
    local: resultado === 'agendado' ? local.trim() || undefined : undefined,
    retornar_em: resultado === 'retornar' ? retornarEm : undefined,
    obs: obs.trim() || undefined,
  };
  // 🏛️ DIR-73 — a agenda da empresa tem OUTRO contrato de "pronto": não tem
  // contato nem `quando` ISO; tem uma agenda escolhida e uma recorrência
  // resolvida. Reaproveitar a validação do contato aqui deixaria o botão
  // eternamente desligado.
  const empresaLinha = agendaSel
    ? linhaDaAgenda(agendaSel, {
      recorrencia, dia_semana: diaSemana, data: dataUnica, hora: horaEmpresa,
      duracao_min: duracao, detalhes: obs,
      criadoPorId: autor?.id || null, criadoPorNome: autor?.full_name || '',
    })
    : null;
  const pronto = alvo === 'empresa'
    ? !!empresaLinha && !!empresaLinha.hora && (recorrencia === 'semana' ? empresaLinha.dia_semana !== null : !!empresaLinha.data)
    : !!contatoSel && registroContatoValido(registro);

  const salvar = async () => {
    if (criando) return;
    setCriando(true);
    try {
      if (alvo === 'empresa') { await onSalvarAgendaEmpresa(empresaLinha); return; }
      const reg = { ...registro };
      if (resultado === 'agendado' && criarNoGoogle && criarNoGoogleFn) {
        const link = await criarNoGoogleFn(reg, contatoSel); // null = fallback (link de template segue na agenda)
        if (link) reg.google_event_link = link;
      }
      await onSalvar(contatoSel, reg);
    } finally { setCriando(false); }
  };

  // numeração dos passos: no modo agendar o "com quem" é o passo 1; no
  // registro que virou agendamento a pessoa já está no cabeçalho.
  const p = (n) => (modoAgendar ? n : n - 1);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-nz-borda max-w-lg w-full max-h-[88vh] overflow-hidden flex flex-col">
        <CardContent className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-lg font-bold text-nz-tinta flex items-center gap-2">
                {modoAgendar
                  ? <><CalendarPlus className="w-5 h-5 text-nz-verde" /> {editando ? 'Editar reunião' : 'Agendar reunião'}</>
                  : <><PhoneCall className="w-5 h-5 text-nz-verde" /> Registrar contato</>}
              </p>
              {contatoInicial && <p className="text-sm text-nz-tinta-fraca truncate">{contatoInicial.full_name || 'Sem nome'}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onFechar} disabled={salvando}><X className="w-5 h-5 text-nz-tinta-fraca" /></Button>
          </div>

          {modoAgendar && (
            <Passo n={1} titulo={podeAgendaEmpresa ? 'O que você vai marcar?' : 'Com quem é a reunião?'}>
              {/* 🏛️ DIR-73 — as duas portas. Elas são botões e não um <select>
                  escondido porque a escolha aqui muda ONDE a reunião é gravada:
                  decisão de destino tem que estar na cara, não numa lista. */}
              {podeAgendaEmpresa && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    { id: 'contato', emoji: '👤', label: 'Um contato da lista', ajuda: 'entra no histórico dele' },
                    { id: 'empresa', emoji: '🏛️', label: 'Uma agenda da empresa', ajuda: 'entra na agenda de todo mundo' },
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setAlvo(o.id)}
                      className={`rounded-xl border-2 p-2.5 text-left transition-all ${alvo === o.id ? 'border-nz-verde bg-nz-verde-fundo' : 'border-nz-borda bg-white hover:border-nz-verde/40'}`}
                    >
                      <p className="text-sm font-bold text-nz-tinta">{o.emoji} {o.label}</p>
                      <p className="text-[11px] text-nz-tinta-fraca">{o.ajuda}</p>
                    </button>
                  ))}
                </div>
              )}

              {alvo === 'empresa' ? (
                <>
                  <select
                    value={agendaId}
                    onChange={(e) => setAgendaId(e.target.value)}
                    className="w-full rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-10 px-3"
                  >
                    <option value="">escolha a mentoria, o treinamento ou a reunião...</option>
                    {grupos.map((g) => (
                      <optgroup key={g.id} label={`${g.emoji} ${g.label}`}>
                        {g.itens.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  {agendaSel && (
                    <p className="mt-1.5 text-[11px] text-nz-tinta-fraca">
                      {agendaSel.descricao}
                      {agendaSel.publico === 'diretoria' && <span className="font-bold text-amber-700"> · só a diretoria vê esta na agenda</span>}
                      {agendaSel.xperformance && <span className="font-bold text-nz-verde"> · a pauta dela é o documento do X-Performance</span>}
                    </p>
                  )}
                </>
              ) : contatoInicial ? (
                <p className="rounded-lg border border-nz-verde/40 bg-nz-verde-fundo/50 px-3 py-2 text-sm font-bold text-nz-tinta">
                  👤 {contatoInicial.full_name || 'Sem nome'}{contatoInicial.phone ? ` · ${contatoInicial.phone}` : ''}
                </p>
              ) : (
                <select
                  value={contatoSel?.id || ''}
                  onChange={(e) => setContatoSel(contatos.find((c) => c.id === e.target.value) || null)}
                  className="w-full rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-10 px-3"
                >
                  <option value="">escolha o contato da sua lista...</option>
                  {[...contatos].sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR')).map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name || 'Sem nome'}{c.phone ? ` · ${c.phone}` : ''}</option>
                  ))}
                </select>
              )}
            </Passo>
          )}

          {!modoAgendar && (
            <div>
              <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">O que aconteceu no contato?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {RESULTADOS_CONTATO.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setResultado(r.id)}
                    className={`rounded-xl border-2 p-2.5 text-left transition-all ${resultado === r.id ? 'border-nz-verde bg-nz-verde-fundo' : 'border-nz-borda bg-white hover:border-nz-verde/40'}`}
                  >
                    <p className="text-sm font-bold text-nz-tinta">{r.emoji} {r.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 🏛️ DIR-73 — o "quando" da agenda da empresa é OUTRO: mentoria não
              acontece num instante, acontece TODA TERÇA. Por isso aqui a
              pergunta é recorrência + hora, e não um datetime-local. */}
          {alvo === 'empresa' && agendaSel && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-50/40 p-3 space-y-3">
              <Passo n={2} titulo="Quando ela acontece?">
                <div className="flex gap-2 flex-wrap items-center">
                  <select value={recorrencia} onChange={(e) => setRecorrencia(e.target.value)} className="rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-10 px-3">
                    <option value="semana">toda semana</option>
                    <option value="data">data única</option>
                  </select>
                  {recorrencia === 'semana' ? (
                    <select value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))} className="rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-10 px-3">
                      {DIAS_SEMANA.map((d, i) => <option key={d} value={i}>{d}</option>)}
                    </select>
                  ) : (
                    <Input type="date" value={dataUnica} onChange={(e) => setDataUnica(e.target.value)} className="bg-white border-nz-borda text-nz-tinta w-auto" />
                  )}
                  <Input type="time" value={horaEmpresa} onChange={(e) => setHoraEmpresa(e.target.value)} className="bg-white border-nz-borda text-nz-tinta w-auto" />
                  <select value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} className="rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-10 px-3">
                    {DURACOES_REUNIAO.map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
                <p className="text-[11px] text-nz-tinta-fraca mt-1.5">
                  já veio na cadência que a casa usa — troque se a sua for outra
                </p>
              </Passo>
            </div>
          )}

          {alvo !== 'empresa' && resultado === 'agendado' && (
            <div className="rounded-xl border border-nz-verde/30 bg-nz-verde-fundo/40 p-3 space-y-3">
              <Passo n={p(2)} titulo="Quando?">
                <div className="flex gap-2 flex-wrap">
                  <Input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className="bg-white border-nz-borda text-nz-tinta w-auto" />
                  <select value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} className="rounded-md border border-nz-borda bg-white text-nz-tinta text-sm h-10 px-3">
                    {DURACOES_REUNIAO.map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </Passo>
              <Passo n={p(3)} titulo="Onde e sobre o quê?">
                <div className="space-y-2">
                  <Input value={tituloReuniao} onChange={(e) => setTituloReuniao(e.target.value)} className="bg-white border-nz-borda text-nz-tinta text-sm" />
                  <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="local ou link da chamada (opcional) — ex.: Escritório · Meet/Zoom" className="bg-white border-nz-borda text-nz-tinta text-sm" />
                </div>
              </Passo>
              <Passo n={p(4)} titulo="Google Agenda">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={criarNoGoogle} onChange={(e) => setCriarNoGoogle(e.target.checked)} className="w-4 h-4 accent-green-600" />
                  <span className="text-xs text-nz-tinta font-medium">🗓️ {editando ? 'Atualizar na minha Google Agenda (o evento muda junto)' : 'Criar na minha Google Agenda (o evento entra sozinho na sua agenda)'}</span>
                </label>
              </Passo>
            </div>
          )}
          {alvo !== 'empresa' && resultado === 'retornar' && (
            <div>
              <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">🔁 Retornar em que dia?</p>
              <Input type="date" value={retornarEm} onChange={(e) => setRetornarEm(e.target.value)} className="bg-white border-nz-borda text-nz-tinta w-auto" />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">{alvo === 'empresa' ? 'Detalhes desta agenda (opcional)' : resultado === 'agendado' ? 'Detalhes da reunião (opcional)' : 'Observação (opcional)'}</p>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="ex.: levar os números; cliente quer ver a loja..." className="bg-white border-nz-borda text-nz-tinta text-sm" />
          </div>

          <Button onClick={salvar} disabled={!pronto || salvando || criando} className="w-full h-12 text-base bg-nz-verde hover:bg-nz-verde-claro text-white font-bold">
            {(salvando || criando) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
            {(salvando || criando) ? 'Salvando...' : alvo === 'empresa' ? '🏛️ Marcar na agenda de todo mundo' : editando ? '💾 Salvar alterações' : resultado === 'agendado' ? '📅 Agendar reunião' : 'Salvar registro'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
