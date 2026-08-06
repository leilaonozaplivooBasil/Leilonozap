import React from 'react';
import { Check } from 'lucide-react';

// 🔐 Gate de 3 degraus — mostra em que estágio o Parceiro está.
// 1) NDA · 2) Operação por dentro · 3) Plano contratado.
export default function ParceiroPainelGate({ ndaAssinado, contratoAssinado, onIrPara }) {
  const degraus = [
    {
      id: 'nda',
      numero: '01',
      titulo: 'Termo de confidencialidade',
      texto: 'Assinatura do NDA para liberar a operação por dentro (Cláusula 12).',
      concluido: !!ndaAssinado,
      destino: 'nda',
    },
    {
      id: 'operacao',
      numero: '02',
      titulo: 'Conhecer a operação',
      texto: 'Como compramos, como precificamos e como vendemos — com os números reais.',
      concluido: !!ndaAssinado,
      destino: 'operacao',
    },
    {
      id: 'plano',
      numero: '03',
      titulo: 'Plano contratado',
      texto: 'Aceite eletrônico do Contrato de Parceria Comercial e aporte do capital.',
      concluido: !!contratoAssinado,
      destino: 'contrato',
    },
  ];

  return (
    <section className="mb-8 border border-pc-borda bg-pc-preto-2">
      <div className="border-b border-pc-borda px-5 py-4 sm:px-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Seu estágio na parceria</p>
      </div>
      <ol className="grid grid-cols-1 divide-y divide-pc-borda sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {degraus.map((d) => (
          <li key={d.id} className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-[0.15em] text-pc-ouro">{d.numero}</span>
              {d.concluido ? (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-pc-ouro">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> Concluído
                </span>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-pc-tinta-fraca">
                  Pendente
                </span>
              )}
            </div>
            <h3 className="mt-3 text-base font-bold text-pc-tinta">{d.titulo}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-pc-tinta-fraca">{d.texto}</p>
            <button
              type="button"
              onClick={() => onIrPara(d.destino)}
              className="mt-4 flex min-h-[44px] w-full items-center justify-center border border-pc-ouro px-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto"
            >
              {d.concluido ? 'Revisar' : 'Abrir'}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}