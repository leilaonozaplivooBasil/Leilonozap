import React, { useState } from 'react';
import { Factory, TrendingUp, BookOpen } from 'lucide-react';
import ParceiroOperacaoEtapas from './ParceiroOperacaoEtapas';
import ParceiroDocumentoCard from './ParceiroDocumentoCard';
import ParceiroDocumentoModal from './ParceiroDocumentoModal';
import ParceiroValuation from './ParceiroValuation';
import ParceiroMemorando from './ParceiroMemorando';
import { PREMISSAS, real } from '@/lib/operacaoNumeros';

// 🏭 TELA "A OPERAÇÃO POR DENTRO" — liberada após a assinatura do termo de sigilo.
// Mostra a mecânica real da operação e dá acesso aos dois documentos
// institucionais, que abrem em modal NESTA tela (o parceiro nunca sai do site).
export default function ParceiroOperacaoPorDentro() {
  const [documentoAberto, setDocumentoAberto] = useState(null);

  return (
    <>
      <header className="mb-8 border-b border-pc-borda pb-6">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-pc-ouro">
          <Factory className="h-3.5 w-3.5" strokeWidth={1.5} />
          Documento interno · uso restrito
        </span>
        <h1 className="mt-3 text-2xl font-bold leading-tight text-pc-tinta sm:text-3xl">
          A operação por dentro
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">
          Como o capital entra, vira estoque e volta como resultado. Compramos lotes a{' '}
          {real(PREMISSAS.aquisicao)} com {real(PREMISSAS.valorMercado)} em valor de mercado,
          vendemos a {real(PREMISSAS.precoVenda)} e giramos em {PREMISSAS.cicloDias} dias. Abaixo,
          etapa por etapa — e, em seguida, os dois documentos com as contas abertas.
        </p>
      </header>

      <ParceiroOperacaoEtapas />

      <section className="mt-10">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-pc-tinta">
          Documentos da operação
        </h2>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-pc-tinta-fraca">
          Abrem aqui mesmo, nesta tela. Não há download nem link externo — o conteúdo é confidencial
          e protegido pelo termo que você assinou.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ParceiroDocumentoCard
            icone={TrendingUp}
            etiqueta="Valuation"
            titulo="Valor da operação"
            descricao="Resultado apurado, DRE mensal, alavancagem operacional, escada de escala e a faixa de valor da empresa — com a conta de cada número à vista."
            onAbrir={() => setDocumentoAberto('valuation')}
          />
          <ParceiroDocumentoCard
            icone={BookOpen}
            etiqueta="Investment Memorandum"
            titulo="Memorando da parceria"
            descricao="A tese, o destino do capital aportado, a economia por lote, as condições contratuais da participação e a seção de riscos, sem maquiagem."
            onAbrir={() => setDocumentoAberto('memorando')}
          />
        </div>
      </section>

      <p className="mt-8 border-t border-pc-borda pt-5 text-[11px] leading-relaxed text-pc-tinta-fraca/70">
        Parceria comercial em compra e revenda de mercadorias. Não é investimento financeiro, não é
        valor mobiliário e não há garantia de retorno. A participação incide sobre resultado
        efetivamente apurado, demonstrado em prestação de contas por ciclo.
      </p>

      <ParceiroDocumentoModal
        aberto={documentoAberto === 'valuation'}
        titulo="Valuation — Valor da Operação"
        subtitulo="Documento confidencial"
        onFechar={() => setDocumentoAberto(null)}
      >
        <ParceiroValuation />
      </ParceiroDocumentoModal>

      <ParceiroDocumentoModal
        aberto={documentoAberto === 'memorando'}
        titulo="Investment Memorandum"
        subtitulo="Documento confidencial"
        onFechar={() => setDocumentoAberto(null)}
      >
        <ParceiroMemorando />
      </ParceiroDocumentoModal>
    </>
  );
}