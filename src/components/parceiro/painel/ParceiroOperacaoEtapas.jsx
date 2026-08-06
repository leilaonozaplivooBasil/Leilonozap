import React from 'react';
import { Gavel, PackageSearch, Tags, Store } from 'lucide-react';

// 🏭 As quatro etapas reais da operação, na ordem em que acontecem.
// Texto operacional, sem número de resultado — os números vivem nos documentos.
const ETAPAS = [
  {
    icone: Gavel,
    numero: '01',
    titulo: 'Como compramos',
    resumo: 'Arremate de lotes com nota, a uma fração do valor de mercado.',
    detalhe:
      'Trabalhamos com leilões de devolução e de estoque encalhado de grandes varejistas. A compra é sempre por lote fechado, com nota de arrematação — nunca informal. O critério de entrada é o valor recuperável estimado do lote frente ao preço do arremate: se a conta não fecha com margem, o lote é recusado. É a Cláusula 4.1 do Contrato de Parceria em prática: o capital vira estoque com documento.',
  },
  {
    icone: PackageSearch,
    numero: '02',
    titulo: 'Recebimento e conferência',
    resumo: 'Item a item, classificado por grade de condição.',
    detalhe:
      'O lote chega ao depósito e é conferido peça por peça. Cada item recebe uma grade de condição — de novo lacrado a item para peças — porque essa classificação define preço, canal de venda e prazo de saída. É aqui que se descobre o valor real do lote, e não na planilha do leiloeiro.',
  },
  {
    icone: Tags,
    numero: '03',
    titulo: 'Precificação',
    resumo: 'Preço abaixo do mercado, por decisão, para girar rápido.',
    detalhe:
      'Consultamos o preço praticado no mercado para o mesmo item e precificamos deliberadamente abaixo dele. A vantagem fica com o comprador, e o retorno para a operação vem da velocidade: estoque parado custa capital, estoque que gira multiplica o mesmo capital várias vezes no mês. A precificação respeita um piso por grade, para nenhum item ser vendido abaixo do custo.',
  },
  {
    icone: Store,
    numero: '04',
    titulo: 'Cadastro e venda',
    resumo: 'Canais próprios — leilão, loja virtual e rede de vendas.',
    detalhe:
      'O item é cadastrado com foto e descrição e entra nos canais próprios: leilão ao vivo, loja virtual e a rede de vendas remunerada por comissão. Não dependemos de um único canal para escoar, e a rede só é remunerada quando vende — é custo variável, que não pesa em mês fraco.',
  },
];

export default function ParceiroOperacaoEtapas() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ETAPAS.map(({ icone: Icone, numero, titulo, resumo, detalhe }) => (
        <article key={numero} className="border border-pc-borda bg-pc-preto-2 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Icone className="h-5 w-5 shrink-0 text-pc-ouro" strokeWidth={1.5} />
            <span className="text-[10px] font-bold tracking-[0.2em] text-pc-ouro">{numero}</span>
          </div>
          <h3 className="mt-3 text-base font-bold text-pc-tinta">{titulo}</h3>
          <p className="mt-1.5 text-xs font-medium text-pc-tinta-fraca">{resumo}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-pc-tinta-fraca/85">{detalhe}</p>
        </article>
      ))}
    </div>
  );
}