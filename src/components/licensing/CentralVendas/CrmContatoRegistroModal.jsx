import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Check, Loader2, PhoneCall, CalendarPlus } from 'lucide-react';
import { RESULTADOS_CONTATO, registroContatoValido, linkGoogleAgenda } from '@/lib/metodo';

// 📜 DIR-47 — REGISTRAR O CONTATO: depois de falar com a pessoa, o executivo
// marca o desfecho. Reunião agendada pede data/hora e já oferece o botão do
// GOOGLE AGENDA (link de template oficial — o mesmo do Hábito 5); pedido de
// retorno pede a data. Tudo vira histórico em customers.contatos_metodo.
export default function CrmContatoRegistroModal({ contato, onFechar, onSalvar, salvando }) {
  const [resultado, setResultado] = useState(null);
  const [quando, setQuando] = useState('');
  const [retornarEm, setRetornarEm] = useState('');
  const [obs, setObs] = useState('');

  useEffect(() => {
    if (contato) { setResultado(null); setQuando(''); setRetornarEm(''); setObs(''); }
  }, [contato]);

  if (!contato) return null;
  const registro = {
    resultado,
    quando: resultado === 'agendado' ? quando : undefined,
    retornar_em: resultado === 'retornar' ? retornarEm : undefined,
    obs: obs.trim() || undefined,
  };
  const pronto = registroContatoValido(registro);
  const linkAgenda = resultado === 'agendado' && quando
    ? linkGoogleAgenda({ titulo: `Reunião — ${contato.full_name || 'contato'} (Leilão NoZap)`, inicio: quando, duracaoMin: 60, detalhes: 'Apresentação de sucesso — marcada pelo Contato e Convite' })
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-nz-borda max-w-lg w-full max-h-[88vh] overflow-hidden flex flex-col">
        <CardContent className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-lg font-bold text-nz-tinta flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-nz-verde" /> Registrar contato
              </p>
              <p className="text-sm text-nz-tinta-fraca truncate">{contato.full_name || 'Sem nome'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onFechar} disabled={salvando}><X className="w-5 h-5 text-nz-tinta-fraca" /></Button>
          </div>

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

          {resultado === 'agendado' && (
            <div>
              <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">📅 Quando é a reunião?</p>
              <div className="flex gap-2 flex-wrap items-center">
                <Input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className="bg-white border-nz-borda text-nz-tinta w-auto" />
                {linkAgenda && (
                  <a href={linkAgenda} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="border-nz-borda text-nz-tinta h-9"><CalendarPlus className="w-4 h-4 mr-1" /> Google Agenda</Button>
                  </a>
                )}
              </div>
            </div>
          )}
          {resultado === 'retornar' && (
            <div>
              <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">🔁 Retornar em que dia?</p>
              <Input type="date" value={retornarEm} onChange={(e) => setRetornarEm(e.target.value)} className="bg-white border-nz-borda text-nz-tinta w-auto" />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">Observação (opcional)</p>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="ex.: pediu os números; mandar a apresentação antes..." className="bg-white border-nz-borda text-nz-tinta text-sm" />
          </div>

          <Button onClick={() => onSalvar(contato, registro)} disabled={!pronto || salvando} className="w-full bg-nz-verde hover:bg-nz-verde-claro text-white font-bold">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            {salvando ? 'Salvando...' : 'Salvar registro'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
