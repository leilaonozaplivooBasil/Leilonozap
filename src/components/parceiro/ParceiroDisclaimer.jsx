import React from 'react';

// Rodapé legal — texto integral do material oficial de captação privada.
export default function ParceiroDisclaimer() {
  return (
    <footer className="border-t border-pc-borda bg-pc-preto-2">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="sm:flex sm:gap-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-pc-tinta-fraca sm:w-32 sm:flex-shrink-0 sm:text-xs">
            Disclaimer
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-pc-tinta-fraca sm:mt-0 sm:text-xs">
            Material confidencial, de uso exclusivo em negociação privada e direta, sem qualquer
            caráter de oferta pública. Os valores eventualmente apresentados em ambiente restrito são
            estimativas de cenário baseadas no histórico operacional da plataforma e{' '}
            <strong className="font-semibold text-pc-tinta">
              não constituem promessa, garantia ou expectativa fixa de rendimento
            </strong>
            . O resultado decorre exclusivamente do lucro líquido apurado nas operações de compra e
            venda de produtos e pode oscilar conforme variáveis de mercado, logística e fornecedores.
            Toda operação comercial envolve risco. Prevalecem, em qualquer hipótese, os termos do
            Contrato de Parceria Comercial e Participação em Operação Estruturada de Venda de Produtos
            firmado entre as partes.
          </p>
        </div>

        <div className="mt-10 border-t border-pc-borda pt-6 sm:flex sm:items-center sm:justify-between">
          <p className="text-[11px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
            COMPRAS FULL COMÉRCIO LTDA · CNPJ 51.544.091/0001-67
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-pc-tinta-fraca sm:mt-0 sm:text-xs">
            www.leilaonozap.net
          </p>
        </div>
      </div>
    </footer>
  );
}