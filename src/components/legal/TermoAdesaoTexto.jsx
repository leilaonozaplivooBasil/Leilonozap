import React from 'react';

/**
 * FONTE DE VERDADE do texto jurídico do Termo de Adesão (PONTO 70 — 01/08/2026).
 *
 * Revisão PONTO 70: o texto agora descreve a mecânica REAL do sistema —
 * o lance DEBITA na hora e VOLTA na hora quando o participante é superado.
 * Removidas as cláusulas de prazo de 1h30 e de suspensão por inadimplência
 * (não existe inadimplência quando o débito é imediato).
 *
 * NÃO alterar palavra alguma sem autorização expressa.
 */

const CLAUSULAS = [
  {
    n: '1',
    titulo: 'NATUREZA DA COMPETIÇÃO',
    itens: [
      'Estratégia de marketing e vendas operada pela COMPRAS FULL COMÉRCIO LTDA (CNPJ 51.544.091/0001-67). NÃO é leilão público oficial, não é regida pela Lei nº 21.981/2024 nem por normas de leilões judiciais ou extrajudiciais.',
    ],
  },
  {
    n: '2',
    titulo: 'CRÉDITO DE PARTICIPAÇÃO',
    itens: [
      'Depósito antecipado mínimo de R$ 100,00 via PIX ou Cartão, creditado como crédito de consumo na carteira digital. Depósitos de R$ 100 ou mais recebem +10% de bônus na hora.',
    ],
  },
  {
    n: '3',
    titulo: 'COMO FUNCIONA O LANCE (débito e devolução imediatos)',
    destaque: true,
    itens: [
      '3.1. Cada lance é uma declaração de intenção de compra e altera o preço do produto disputado.',
      '3.2. Ao dar o lance, o valor é DEBITADO IMEDIATAMENTE da sua carteira.',
      '3.3. Se outro participante der um lance maior, o valor VOLTA NA HORA para a sua carteira, integralmente, de forma automática.',
      '3.4. Você só permanece com o valor comprometido enquanto estiver liderando.',
    ],
  },
  {
    n: '4',
    titulo: 'SE VOCÊ ARREMATAR',
    itens: [
      '4.1. O valor já debitado é abatido do preço final do produto.',
      '4.2. O bônus de 10% é recolhido do saldo, pois o valor pago virou compra.',
    ],
  },
  {
    n: '5',
    titulo: 'SE VOCÊ NÃO ARREMATAR',
    itens: [
      'O saldo permanece integralmente na carteira, sem prazo de validade, e pode ser usado na Loja Virtual com o desconto garantido da plataforma.',
    ],
  },
  {
    n: '6',
    titulo: 'ORIGEM DOS PRODUTOS',
    itens: [
      'Arremates de lotes, devoluções e mostruário — testados e 100% funcionais. Sem garantia original do fabricante.',
    ],
  },
  {
    n: '7',
    titulo: 'TROCAS E DEVOLUÇÕES',
    itens: [
      'Concluída a aquisição, não são admitidas trocas ou devoluções, salvo vício oculto nos termos do CDC.',
    ],
  },
  {
    n: '8',
    titulo: 'USO INDEVIDO',
    itens: [
      'Fraude, uso de contas falsas ou manipulação de disputas implica suspensão da participação nos canais da COMPRAS FULL COMÉRCIO LTDA.',
    ],
  },
];

export default function TermoAdesaoTexto() {
  return (
    <div className="rounded-xl border border-nz-borda bg-nz-verde-fundo/70 p-3 sm:p-4 max-h-[40vh] overflow-y-auto">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-nz-verde">
        Termo de adesão e participação
      </p>
      <p className="text-sm font-bold text-nz-tinta mt-0.5 mb-3">
        Competição de Preços Leilão NoZap
      </p>

      <div className="space-y-4">
        {CLAUSULAS.map((cl) => (
          <div key={cl.n} className={cl.destaque ? 'rounded-lg border border-nz-verde/25 bg-white p-3' : ''}>
            <p className="text-[13px] font-bold text-nz-tinta leading-snug">
              <span className="text-nz-verde">{cl.n}.</span> {cl.titulo}
            </p>
            <div className="mt-1.5 space-y-1.5">
              {cl.itens.map((txt, i) => (
                <p key={i} className="text-[13px] leading-relaxed text-nz-tinta-fraca">{txt}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Texto oficial da Declaração de Ciência — obrigatório junto ao checkbox
export const DECLARACAO_CIENCIA =
  'Declaro que li, compreendi e concordo integralmente com todos os termos, reconhecendo que se trata de uma estratégia de marketing e que este não é um leilão oficial.';