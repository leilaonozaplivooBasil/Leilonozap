import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Check, Loader2, Star } from 'lucide-react';
import {
  PRODUTOS_APRESENTACAO, DIMENSOES_QUALIFICACAO, QUALIFICACOES,
  probabilidadeFechamento,
} from '@/lib/metodo';

// 🤝 DIR-46 — QUALIFICAR UM CONTATO DA LISTA DE NETWORK: o executivo escolhe
// QUAL produto está apresentando (Parceiro de Compra ou Licenças) e dá as 3
// notas de 1 a 5 (confiança em mim · condição financeira · apetite ao
// produto). O total e a probabilidade de fechamento aparecem AO VIVO — a
// mesma régua testada que a lista usa (fonte única em metodo.js).
export default function CrmNetworkQualificacaoModal({ contato, onFechar, onSalvar, salvando }) {
  const [produto, setProduto] = useState(null);
  const [notas, setNotas] = useState({});

  useEffect(() => {
    if (contato) {
      const q = contato.qualificacao_network || {};
      setProduto(q.produto || null);
      setNotas({ confianca: q.confianca, financeiro: q.financeiro, apetite: q.apetite });
    }
  }, [contato]);

  if (!contato) return null;
  const quali = { produto, ...notas };
  const prob = probabilidadeFechamento(quali);
  const pronto = !!produto && !!prob;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-nz-borda max-w-lg w-full max-h-[88vh] overflow-hidden flex flex-col">
        <CardContent className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-lg font-bold text-nz-tinta flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" /> Qualificar contato
              </p>
              <p className="text-sm text-nz-tinta-fraca truncate">{contato.full_name || 'Sem nome'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onFechar} disabled={salvando}><X className="w-5 h-5 text-nz-tinta-fraca" /></Button>
          </div>

          <div>
            <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">Qual produto você está apresentando?</p>
            <div className="grid grid-cols-2 gap-2">
              {PRODUTOS_APRESENTACAO.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProduto(p.id)}
                  className={`rounded-xl border-2 p-3 text-center transition-all ${produto === p.id ? 'border-nz-verde bg-nz-verde-fundo' : 'border-nz-borda bg-white hover:border-nz-verde/40'}`}
                >
                  <p className="text-sm font-bold text-nz-tinta">{p.emoji} {p.label}</p>
                </button>
              ))}
            </div>
          </div>

          {DIMENSOES_QUALIFICACAO.map((d) => (
            <div key={d.id}>
              <p className="text-xs font-semibold text-nz-tinta-fraca uppercase tracking-wide mb-1.5">{d.emoji} {d.label} <span className="normal-case font-normal">— de 1 a 5</span></p>
              <div className="grid grid-cols-5 gap-2">
                {QUALIFICACOES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNotas((prev) => ({ ...prev, [d.id]: n }))}
                    className={`rounded-lg border-2 py-2 text-sm font-bold transition-all ${notas[d.id] === n ? 'border-nz-verde bg-nz-verde text-white' : 'border-nz-borda bg-white text-nz-tinta hover:border-nz-verde/40'}`}
                  >{n}</button>
                ))}
              </div>
            </div>
          ))}

          <div className={`rounded-xl border p-3 text-center ${prob ? 'border-nz-verde/40 bg-nz-verde-fundo' : 'border-dashed border-nz-borda'}`}>
            {prob ? (
              <p className="text-sm font-bold text-nz-tinta">
                Total {prob.total}/15 · Probabilidade de fechamento <span className="text-nz-verde">{prob.pct}%</span> {prob.faixa.emoji} {prob.faixa.label}
              </p>
            ) : (
              <p className="text-xs text-nz-tinta-fraca">Escolha o produto e dê as 3 notas pra ver a probabilidade.</p>
            )}
          </div>

          <Button onClick={() => onSalvar(contato, quali)} disabled={!pronto || salvando} className="w-full bg-nz-verde hover:bg-nz-verde-claro text-white font-bold">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            {salvando ? 'Salvando...' : 'Salvar qualificação'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
