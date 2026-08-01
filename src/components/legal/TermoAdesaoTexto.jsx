import React from 'react';

/**
 * FONTE DE VERDADE do texto jurídico do Termo de Adesão (PONTO 67).
 * Texto revisado juridicamente — NÃO alterar palavra alguma sem autorização expressa.
 * Usado pelo GuestRegistrationModal e pelo TermoAdesaoModal (sala de leilão, cadastros).
 */
export default function TermoAdesaoTexto() {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto text-gray-400 space-y-3 text-sm">
      <p className="font-bold text-white">TERMO DE ADESÃO E PARTICIPAÇÃO — COMPETIÇÃO DE PREÇOS LEILÃO NOZAP</p>
      <p>Ao participar, você, doravante denominado PARTICIPANTE, declara estar ciente e concordar expressamente com os seguintes termos:</p>
      <ul className="list-disc list-inside space-y-2">
        <li><strong className="text-orange-400">1. NATUREZA DA COMPETIÇÃO:</strong> A "Competição de Preços Leilão NoZap" constitui exclusivamente uma estratégia de marketing e vendas operada pela COMPRAS FULL COMÉRCIO LTDA (CNPJ 51.544.091/0001-67), não se configurando como leilão público oficial, não sendo regida pela Lei nº 21.981/2024 nem por qualquer norma que discipline leilões judiciais ou extrajudiciais. O PARTICIPANTE declara compreender e aceitar integralmente essa distinção.</li>
        <li><strong className="text-white">2. DEPÓSITO DE PARTICIPAÇÃO OBRIGATÓRIO:</strong> Para habilitar-se à Competição, o PARTICIPANTE deve realizar um depósito antecipado mínimo de R$ 100,00 (cem reais), via PIX ou Cartão de Crédito, creditado em carteira digital vinculada à sua conta na plataforma. Referido depósito constitui reserva de intenção de compra.</li>
        <li><strong className="text-white">3. NATUREZA DO LANCE — INTENÇÃO DE COMPRA:</strong> Cada lance emitido equivale a uma declaração formal de intenção de compra, reconhecendo que sua participação altera dinamicamente o preço do produto disputado. O valor do lance é automaticamente reservado da carteira digital no momento de sua emissão.</li>
        <li><strong className="text-green-400">4. REGRA DE DESCONTO GARANTIDO:</strong> 4.1. Caso vença: o valor depositado será abatido automaticamente do preço final arrematado. 4.2. Caso não vença: o saldo em carteira poderá ser utilizado na Loja Virtual com desconto garantido de 30% sobre o preço de mercado, de forma automática e sem prazo de validade.</li>
        <li><strong className="text-red-500">5. ORIGEM DOS PRODUTOS:</strong> Produtos provenientes de arremates de lotes, devoluções e itens de mostruário, testados e 100% funcionais. Não possuem garantia original do fabricante.</li>
        <li><strong className="text-red-400">6. POLÍTICA DE NÃO DEVOLUÇÃO:</strong> Uma vez concluída a aquisição, não são admitidas trocas ou devoluções, salvo vício oculto nos termos do CDC.</li>
        <li><strong className="text-yellow-500">7. PRAZO DE PAGAMENTO:</strong> O saldo eventualmente devido após o arremate deve ser quitado em <strong className="text-white">1 (uma) hora e 30 (trinta) minutos</strong>. O não cumprimento implica cancelamento automático e manutenção do crédito em carteira.</li>
        <li><strong className="text-red-600 font-bold">8. PENALIDADE POR INADIMPLÊNCIA:</strong> O não pagamento resultará na <strong className="underline">SUSPENSÃO PERMANENTE E IRREVOGÁVEL</strong> do PARTICIPANTE de todos os canais e futuras competições da COMPRAS FULL COMÉRCIO LTDA.</li>
      </ul>
    </div>
  );
}

// Texto oficial do item 9 (Declaração de Ciência) — obrigatório junto ao checkbox
export const DECLARACAO_CIENCIA =
  'Declaro que li, compreendi e concordo integralmente com todos os termos, reconhecendo que se trata de uma estratégia de marketing e que este não é um leilão oficial.';