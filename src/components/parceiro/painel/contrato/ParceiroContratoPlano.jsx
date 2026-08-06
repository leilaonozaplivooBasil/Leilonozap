import React, { useState } from 'react';
import { FileSignature, ShieldCheck, ScrollText, Info, Check } from 'lucide-react';
import { real } from '@/lib/operacaoNumeros';
import ParceiroDocumentoModal from '../ParceiroDocumentoModal';
import ParceiroContratoTexto from '../ParceiroContratoTexto';

// 📄 CONTRATO E PLANO — estado contratual do parceiro, leitura integral do
// contrato (dentro da tela, sem sair do site) e porta de entrada para contratar.
// Sem plano ativo, exibe o MODELO DEMONSTRATIVO de como o contrato fica publicado.
export default function ParceiroContratoPlano({ user, investimento, onContratar }) {
  const [lendo, setLendo] = useState(false);
  const demonstracao = !investimento;

  const aporte = investimento?.amount || 15000;
  const plano = investimento?.plan || 'Plano Sócios de Ouro (modelo)';
  const taxa = investimento?.investmentRate || 3;
  const assinatura = investimento?.startDate || new Date(Date.now() - 38 * 86400000).toISOString();

  const linhas = [
    { r: 'Contratante', v: user?.full_name || '—' },
    { r: 'E-mail do aceite', v: user?.email || '—' },
    { r: 'Plano', v: plano },
    { r: 'Aporte', v: real(aporte) },
    { r: 'Participação no resultado', v: `${String(taxa).replace('.', ',')}% ao mês sobre o apurado` },
    { r: 'Data do aceite', v: new Date(assinatura).toLocaleString('pt-BR') },
    { r: 'Primeiro ciclo', v: 'Fechamento em até 60 dias (Cláusula 8.2)' },
    { r: 'Sigilo', v: '5 anos (Cláusula 12)' },
  ];

  return (
    <section>
      <h1 className="flex items-center gap-2 text-xl font-bold text-pc-tinta sm:text-2xl">
        <FileSignature className="h-5 w-5 text-pc-ouro" strokeWidth={1.8} />
        Contrato de Parceria e plano
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">
        Aqui fica o seu vínculo formal com a operação: o contrato na íntegra, o aceite eletrônico
        registrado e as condições do plano contratado.
      </p>

      {demonstracao && (
        <div className="mt-5 flex items-start gap-2 border border-pc-ouro/40 bg-pc-preto-2 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-pc-ouro" />
          <p className="text-xs leading-relaxed text-pc-tinta-fraca">
            <strong className="text-pc-ouro">MODELO DEMONSTRATIVO.</strong> Nenhum contrato ativo na sua
            conta. Abaixo está exatamente como o seu contrato aparece publicado depois de assinado — com
            o seu nome, o plano, o valor do aporte e o registro do aceite.
          </p>
        </div>
      )}

      {/* Ficha do contrato */}
      <div className="mt-6 border border-pc-borda bg-pc-preto-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pc-borda px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
            Contrato de Parceria Comercial
          </p>
          <span
            className={`flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              demonstracao ? 'border-pc-borda text-pc-tinta-fraca' : 'border-pc-ouro text-pc-ouro'
            }`}
          >
            {demonstracao ? 'Modelo' : (<><Check className="h-3 w-3" strokeWidth={2.5} /> Assinado</>)}
          </span>
        </div>
        <dl className="divide-y divide-pc-borda">
          {linhas.map((l) => (
            <div key={l.r} className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-[11px] uppercase tracking-[0.1em] text-pc-tinta-fraca">{l.r}</dt>
              <dd className="text-sm font-bold text-pc-tinta sm:text-right">{l.v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-3 border-t border-pc-borda p-5 sm:flex-row">
          <button
            type="button"
            onClick={() => setLendo(true)}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 border border-pc-ouro text-[11px] font-bold uppercase tracking-[0.14em] text-pc-ouro transition-colors hover:bg-pc-ouro hover:text-pc-preto"
          >
            <ScrollText className="h-4 w-4" /> Ler o contrato completo
          </button>
          <button
            type="button"
            onClick={onContratar}
            className="min-h-[48px] flex-1 border border-pc-ouro bg-pc-ouro/10 text-[11px] font-bold uppercase tracking-[0.14em] text-pc-ouro transition-colors hover:bg-pc-ouro/20"
          >
            {demonstracao ? 'Contratar meu plano' : 'Contratar novo plano'}
          </button>
        </div>
      </div>

      {/* Validade jurídica */}
      <div className="mt-6 border border-pc-borda bg-pc-preto-2 p-5">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.8} /> Validade do aceite eletrônico
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-pc-tinta-fraca">
          <li>• Assinatura eletrônica com registro de data, hora, IP e identificação do signatário.</li>
          <li>• Amparo legal: Lei nº 14.063/2020 e MP nº 2.200-2/2001 (ICP-Brasil).</li>
          <li>• Uma via idêntica fica arquivada na operação e disponível para consulta a qualquer momento.</li>
          <li>• O aceite não transfere propriedade de cotas societárias — é parceria comercial sobre resultado de operação.</li>
        </ul>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-pc-tinta-fraca">
        Este não é um produto de investimento regulado pela CVM. É contrato de parceria comercial sobre
        operação real de compra e revenda, com resultado apurado e prestação de contas.
      </p>

      {lendo && (
        <ParceiroDocumentoModal
          aberto
          titulo="Contrato de Parceria Comercial"
          subtitulo="Leitura integral"
          onFechar={() => setLendo(false)}
        >
          <div className="text-sm leading-relaxed text-pc-tinta-fraca [&_h2]:text-pc-tinta [&_h3]:text-pc-tinta [&_strong]:text-pc-tinta">
            <ParceiroContratoTexto />
          </div>
        </ParceiroDocumentoModal>
      )}
    </section>
  );
}