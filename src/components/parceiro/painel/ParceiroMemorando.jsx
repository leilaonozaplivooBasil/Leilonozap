import React from 'react';
import {
  PREMISSAS,
  HOJE,
  ESCALA_1M,
  FONTE_FISCAL,
  real,
  pct,
} from '@/lib/operacaoNumeros';
import { DocSecao, DocTexto, DocLinha, DocQuadro, DocIndicador, DocAviso } from './ParceiroDocPartes';

// 📘 INVESTMENT MEMORANDUM — o memorando da parceria.
// Regra institucional: NENHUMA promessa de retorno, nenhuma referência a
// investimento financeiro ou valor mobiliário. É parceria comercial com
// participação em resultado APURADO.
export default function ParceiroMemorando() {
  return (
    <article>
      <DocAviso>
        Documento informativo de parceria comercial. <strong>Não é investimento financeiro, não é
        valor mobiliário e não há retorno garantido.</strong> A participação do parceiro incide sobre
        resultado efetivamente apurado na operação, nos termos do Contrato de Parceria Comercial.
        Distribuição restrita, protegida pelo Termo de Confidencialidade assinado.
      </DocAviso>

      <DocSecao titulo="Sumário da parceria">
        <DocQuadro>
          <DocLinha rotulo="Operação" valor={FONTE_FISCAL.empresa} />
          <DocLinha rotulo="Inscrição" valor={FONTE_FISCAL.cnpj} />
          <DocLinha rotulo="Natureza" valor="Parceria comercial em compra e revenda" />
          <DocLinha rotulo="Instrumento" valor="Contrato de Parceria Comercial" />
          <DocLinha rotulo="Primeiro ciclo" valor="Até 60 dias (Cláusula 8.2)" />
          <DocLinha rotulo="Prestação de contas" valor="Demonstrativo por ciclo (Cláusula 7.4)" />
          <DocLinha rotulo="Sigilo" valor="5 anos (Cláusula 12)" />
        </DocQuadro>
      </DocSecao>

      <DocSecao numero="01" titulo="A tese em um parágrafo">
        <DocTexto>
          Leilões de devolução e de estoque encalhado colocam mercadoria boa no mercado a uma fração
          do valor. Compramos o lote a {real(PREMISSAS.aquisicao)} contendo{' '}
          {real(PREMISSAS.valorMercado)} em valor de mercado, conferimos item a item, precificamos e
          vendemos a {real(PREMISSAS.precoVenda)} — abaixo do mercado, o que faz o estoque sair
          rápido. O ganho não vem de vender caro: vem de <strong>comprar muito barato e girar em{' '}
          {PREMISSAS.cicloDias} dias</strong>. O gargalo nunca foi a venda; é capital para comprar
          mais lotes por mês. É exatamente isso que a parceria destrava.
        </DocTexto>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DocIndicador valor={real(PREMISSAS.aquisicao)} rotulo="Custo do lote" />
          <DocIndicador valor={real(PREMISSAS.valorMercado)} rotulo="Valor de mercado" />
          <DocIndicador valor={real(PREMISSAS.precoVenda)} rotulo="Preço de venda" />
          <DocIndicador valor={`${PREMISSAS.cicloDias} dias`} rotulo="Ciclo de giro" />
        </div>
      </DocSecao>

      <DocSecao numero="02" titulo="Como o dinheiro se movimenta">
        <DocTexto>
          O aporte do parceiro é aplicado na <strong>aquisição de lotes</strong> — não em estrutura,
          não em marketing, não em folha. Cada real entra como estoque com nota de arrematação, que é
          ativo verificável. O ciclo é sempre o mesmo: arremate, recebimento e conferência, cadastro
          e precificação, venda pelos canais próprios, apuração do resultado e prestação de contas.
        </DocTexto>
        <DocQuadro cabecalho="Destino do capital aportado">
          <DocLinha rotulo="Aquisição de lotes em leilão" valor="100% do aporte" />
          <DocLinha rotulo="Estrutura, equipe e tecnologia" valor="Por conta da operação" />
          <DocLinha rotulo="Comissão da rede de vendas" valor="Custo variável da operação" />
          <DocLinha rotulo="Tributos" valor="Por conta da operação" />
        </DocQuadro>
        <DocTexto>
          A operação não cobra do parceiro taxa de administração, taxa de entrada ou mensalidade. A
          remuneração da operação está no resultado da própria revenda.
        </DocTexto>
      </DocSecao>

      <DocSecao numero="03" titulo="A economia por lote">
        <DocQuadro cabecalho="Um lote, do arremate ao resultado" etiqueta="Simples 7,56%">
          <DocLinha rotulo="Receita da venda" valor={real(80000)} />
          <DocLinha rotulo="Custo de aquisição" nota="(25%)" valor={real(25000)} negativo />
          <DocLinha rotulo="Comissão da rede" nota="(30%)" valor={real(24000)} negativo />
          <DocLinha rotulo="Despesa operacional" nota="(20%)" valor={real(16000)} negativo />
          <DocLinha rotulo="Parceiros de compra" nota="(5%)" valor={real(4000)} negativo />
          <DocLinha rotulo="Imposto" nota="(7,56%)" valor={real(6048)} negativo />
          <DocLinha rotulo="Resultado líquido do lote" valor={real(4952)} total />
        </DocQuadro>
        <DocTexto>
          Cada linha desse quadro é custo real da operação, inclusive a comissão de 30% da rede — que
          é o que garante o escoamento rápido do estoque e por isso não é tratada como despesa
          evitável.
        </DocTexto>
      </DocSecao>

      <DocSecao numero="04" titulo="Situação apurada e potencial de escala">
        <DocTexto>
          O quadro à esquerda é o que a operação <strong>já entrega hoje</strong>, com base fiscal
          declarada. O da direita é o que a mesma estrutura entrega com mais capital de compra — sem
          contratar galpão novo, sem dobrar equipe.
        </DocTexto>
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <DocQuadro cabecalho="Hoje" etiqueta="Apurado">
            <DocLinha rotulo="Receita mensal" valor={real(HOJE.receita)} />
            <DocLinha rotulo="Resultado líquido" valor={real(HOJE.lucro)} />
            <DocLinha rotulo="Margem líquida" valor={pct(HOJE.margemPct)} />
            <DocLinha rotulo="Regime" valor="Simples Nacional" />
            <DocLinha rotulo="Resultado anualizado" valor={real(HOJE.lucroAnual)} total />
          </DocQuadro>
          <DocQuadro cabecalho="Escala projetada" etiqueta="Projeção">
            <DocLinha rotulo="Receita mensal" valor={real(ESCALA_1M.receita)} />
            <DocLinha rotulo="Resultado líquido" valor={real(ESCALA_1M.lucro)} />
            <DocLinha rotulo="Margem líquida" valor={pct(ESCALA_1M.margemPct)} />
            <DocLinha rotulo="Regime" valor="Lucro Real" />
            <DocLinha rotulo="Resultado anualizado" valor={real(ESCALA_1M.lucroAnual)} total />
          </DocQuadro>
        </div>
        <DocTexto>
          A margem sobe de {pct(HOJE.margemPct)} para {pct(ESCALA_1M.margemPct)} porque a estrutura
          fixa de {real(PREMISSAS.despesaFixaMensal)} por mês passa a ser diluída em um volume muito
          maior. É ganho de escala, não aumento de preço ao cliente.
        </DocTexto>
      </DocSecao>

      <DocSecao numero="05" titulo="Participação do parceiro">
        <DocTexto>
          A participação é definida no Contrato de Parceria Comercial, calculada sobre o capital
          aportado e paga a partir do <strong>resultado apurado de cada ciclo</strong>. O primeiro
          ciclo se encerra em até 60 dias do aporte (Cláusula 8.2), acompanhado do demonstrativo
          previsto na Cláusula 7.4.
        </DocTexto>
        <DocQuadro cabecalho="Condições contratuais">
          <DocLinha rotulo="Base de cálculo" valor="Capital aportado" />
          <DocLinha rotulo="Origem do pagamento" valor="Resultado apurado do ciclo" />
          <DocLinha rotulo="Prazo do primeiro ciclo" valor="Até 60 dias" />
          <DocLinha rotulo="Prestação de contas" valor="Demonstrativo por ciclo" />
          <DocLinha rotulo="Garantia de retorno" valor="Não há" />
        </DocQuadro>
        <DocAviso>
          A operação <strong>não garante retorno</strong> e não trabalha com rentabilidade fixa. Se o
          resultado do ciclo for menor, a participação é menor; se houver prejuízo no ciclo, não há
          participação a distribuir. Qualquer percentual apresentado em proposta é referência de
          expectativa, condicionada ao resultado real e sempre demonstrada em prestação de contas.
        </DocAviso>
      </DocSecao>

      <DocSecao numero="06" titulo="Riscos — leia esta seção">
        <DocTexto>
          <strong>Disponibilidade de lotes.</strong> Depende da oferta dos leiloeiros. Em meses de
          oferta fraca, entra menos capital em estoque e o ciclo se alonga.
        </DocTexto>
        <DocTexto>
          <strong>Qualidade do lote.</strong> Lote de devolução tem itens avariados. A conferência
          por grade reduz, mas não elimina, a chance de o valor recuperável ficar abaixo do estimado.
        </DocTexto>
        <DocTexto>
          <strong>Velocidade de escoamento.</strong> Se a venda desacelerar, o estoque encalha e o
          capital fica parado em mercadoria — o resultado do ciclo cai.
        </DocTexto>
        <DocTexto>
          <strong>Transição tributária.</strong> Ao ultrapassar {real(4800000)} de receita anual, a
          saída do Simples é obrigatória. A migração para Lucro Real precisa de preparação contábil;
          feita fora de hora, comprime a margem.
        </DocTexto>
        <DocTexto>
          <strong>Concentração operacional.</strong> A operação depende de estrutura, equipe e
          processos próprios. Falha logística ou de conferência afeta diretamente o ciclo.
        </DocTexto>
      </DocSecao>

      <DocSecao numero="07" titulo="Base documental">
        <DocQuadro>
          <DocLinha rotulo="Declaração fiscal" valor={FONTE_FISCAL.pgdas} />
          <DocLinha rotulo="Recibo" valor={FONTE_FISCAL.recibo} />
          <DocLinha rotulo="Transmissão" valor={FONTE_FISCAL.transmitido} />
          <DocLinha rotulo="Alíquota efetiva" valor={pct(PREMISSAS.aliquotaSimples)} />
          <DocLinha rotulo="Responsável contábil" valor={`${FONTE_FISCAL.contadora} · ${FONTE_FISCAL.crc}`} />
        </DocQuadro>
        <DocTexto>
          Cenários de escala calculados em Lucro Real, único regime aplicável acima de{' '}
          {real(4800000)} de receita anual, com IRPJ de 15% mais adicional de 10% sobre o excedente
          mensal de {real(20000)}, CSLL de 9% sobre o LAIR e créditos de PIS/COFINS e ICMS sobre as
          entradas. Para formalização, recomenda-se avaliação independente e demonstrações auditadas.
        </DocTexto>
      </DocSecao>

      <div className="border-t border-pc-borda pt-5 text-[10px] leading-relaxed text-pc-tinta-fraca/70">
        Documento interno de uso restrito, protegido pelo Termo de Confidencialidade assinado
        (sigilo por 5 anos, Cláusula 12). Não constitui oferta pública, promessa de rentabilidade,
        captação de poupança popular ou valor mobiliário. A remuneração de parceiros comerciais
        está vinculada exclusivamente ao resultado da venda de produtos.
      </div>
    </article>
  );
}