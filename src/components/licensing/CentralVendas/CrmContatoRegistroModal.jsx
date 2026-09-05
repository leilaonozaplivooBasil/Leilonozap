import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Check, Loader2, PhoneCall, CalendarPlus } from 'lucide-react';
import { RESULTADOS_CONTATO, registroContatoValido, DURACOES_REUNIAO } from '@/lib/metodo';

// 📜 DIR-47/48/49 — REGISTRAR O CONTATO + AGENDADOR DE REUNIÃO DE VERDADE.
// Três jeitos de abrir (DIR-49 deixou cada um óbvio):
//  · agendarDireto + contatoInicial → AGENDA em 1 clique, pessoa já escolhida;
//  · contatoInicial sozinho → registra o desfecho (os 5 de sempre);
//  · nada → agendar livre, escolhendo o contato no passo 1.
// O agendado cria o evento DIRETO na Google Agenda da própria pessoa (quando
// ela permitir; fallback honesto é o link de template) e tudo vira histórico
// em customers.contatos_metodo.

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

export default function CrmContatoRegistroModal({ aberto, contatoInicial = null, agendarDireto = false, contatos = [], onFechar, onSalvar, salvando, criarNoGoogleFn }) {
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

  const modoAgendar = agendarDireto || !contatoInicial; // agendador na cara; senão, registro de desfecho

  useEffect(() => {
    if (aberto) {
      setContatoSel(contatoInicial || null);
      setResultado(modoAgendar ? 'agendado' : null);
      setQuando(''); setDuracao(60); setTituloReuniao(''); setLocal('');
      setRetornarEm(''); setObs(''); setCriarNoGoogle(true);
    }
  }, [aberto, contatoInicial, modoAgendar]);

  // título sugerido acompanha a pessoa escolhida (mas é editável)
  useEffect(() => {
    if (aberto && contatoSel) setTituloReuniao(`Reunião — ${contatoSel.full_name || 'contato'} (Leilão NoZap)`);
  }, [aberto, contatoSel]);

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
  const pronto = !!contatoSel && registroContatoValido(registro);

  const salvar = async () => {
    if (criando) return;
    setCriando(true);
    try {
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
                  ? <><CalendarPlus className="w-5 h-5 text-nz-verde" /> Agendar reunião</>
                  : <><PhoneCall className="w-5 h-5 text-nz-verde" /> Registrar contato</>}
              </p>
              {contatoInicial && <p className="text-sm text-nz-tinta-fraca truncate">{contatoInicial.full_name || 'Sem nome'}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onFechar} disabled={salvando}><X className="w-5 h-5 text-nz-tinta-fraca" /></Button>
          </div>

          {modoAgendar && (
            <Passo n={1} titulo="Com quem é a reunião?">
              {contatoInicial ? (
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

          {resultado === 'agendado' && (
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
                  <span className="text-xs text-nz-tinta font-medium">🗓️ Criar na minha Google Agenda (o evento entra sozinho na sua agenda)</span>
                </label>
              </Passo>
            </div>
          )}
          {resultado === 'retornar' && (
            <div>
              <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">🔁 Retornar em que dia?</p>
              <Input type="date" value={retornarEm} onChange={(e) => setRetornarEm(e.target.value)} className="bg-white border-nz-borda text-nz-tinta w-auto" />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">{resultado === 'agendado' ? 'Detalhes da reunião (opcional)' : 'Observação (opcional)'}</p>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="ex.: levar os números; cliente quer ver a loja..." className="bg-white border-nz-borda text-nz-tinta text-sm" />
          </div>

          <Button onClick={salvar} disabled={!pronto || salvando || criando} className="w-full h-12 text-base bg-nz-verde hover:bg-nz-verde-claro text-white font-bold">
            {(salvando || criando) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
            {(salvando || criando) ? 'Salvando...' : resultado === 'agendado' ? '📅 Agendar reunião' : 'Salvar registro'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
