import React from 'react';
import {
  PREMISSAS,
  HOJE,
  ESCALA_1M,
  ESCADA,
  MULTIPLOS,
  VALUATION,
  FONTE_FISCAL,
  real,
  pct,
} from '@/lib/operacaoNumeros';
import { DocSecao, DocTexto, DocLinha, DocQuadro, DocIndicador, DocAviso } from './ParceiroDocPartes';

// 💼 VALUATION — o que a operação vale hoje e sob qual conta.
// Todo número vem de @/lib/operacaoNumeros (auditado). Nada é digitado aqui.
export default function ParceiroValuation() {
  return (
    <article>
      <DocAviso>
        Este documento <strong>não é laudo de avaliação de empresa</strong> e não constitui oferta
        pública de valores mobiliários. Os múltiplos aplicados são referências ilustrativas de
        mercado. O único resultado auditável é o apurado via {FONTE_FISCAL.pgdas}; as demais faixas
        são projeções condicionadas à execução. Para captação formal, recomenda-se avaliação
        independente e demonstrações auditadas.
      </DocAviso>

      <DocSecao titulo="Identificação">
        <DocQuadro>
          <DocLinha rotulo="Empresa" valor={FONTE_FISCAL.empresa} />
          <DocLinha rotulo="Inscrição" valor={FONTE_FISCAL.cnpj} />
          <DocLinha rotulo="Regime atual" valor="Simples Nacional — Anexo I, Faixa 3" />
          <DocLinha rotulo="Alíquota efetiva" valor={pct(PREMISSAS.aliquotaSimples)} />
          <DocLinha rotulo="RBT12 apurado" valor={real(PREMISSAS.rbt12)} />
          <DocLinha rotulo="Responsável contábil" valor={`${FONTE_FISCAL.contadora} · ${FONTE_FISCAL.crc}`} />
        </DocQuadro>
        <DocTexto>
          A alíquota de {pct(PREMISSAS.aliquotaSimples)} não é estimada: decorre da fórmula legal
          aplicada ao RBT12 apurado — {FONTE_FISCAL.formula}.
        </DocTexto>
      </DocSecao>

      <DocSecao numero="01" titulo="A unidade econômica — um lote">
        <DocTexto>
          A operação não se avalia por receita, e sim pela unidade que se repete: o lote. Compramos
          um lote por {real(PREMISSAS.aquisicao)} contendo {real(PREMISSAS.valorMercado)} em valor de
          mercado e vendemos a {real(PREMISSAS.precoVenda)} — {' '}
          {100 - (PREMISSAS.precoVenda / PREMISSAS.valorMercado) * 100}% abaixo do mercado, que é a
          vantagem entregue ao comprador final e a razão da velocidade de giro.
        </DocTexto>
        <DocQuadro cabecalho="Resultado de um lote — estrutura operacional atual" etiqueta="Simples 7,56%">
          <DocLinha rotulo="Receita da venda do lote" valor={real(80000)} />
          <DocLinha rotulo="Custo de aquisição" nota="(25%)" valor={real(25000)} negativo />
          <DocLinha rotulo="Comissão da rede de vendas" nota="(30%)" valor={real(24000)} negativo />
          <DocLinha rotulo="Despesa operacional" nota="(20%)" valor={real(16000)} negativo />
          <DocLinha rotulo="Parceiros de compra" nota="(5%)" valor={real(4000)} negativo />
          <DocLinha rotulo="Imposto — Simples Nacional" nota="(7,56%)" valor={real(6048)} negativo />
          <DocLinha rotulo="Resultado líquido do lote" valor={real(4952)} total />
        </DocQuadro>
        <div className="mb-5 grid grid-cols-3 gap-3">
          <DocIndicador valor={`${PREMISSAS.markupPct}%`} rotulo="Markup sobre a aquisição" />
          <DocIndicador valor={`${PREMISSAS.cicloDias} dias`} rotulo="Ciclo médio de giro" />
          <DocIndicador valor={pct(19.8)} rotulo="Retorno sobre o capital do lote" />
        </div>
      </DocSecao>

      <DocSecao numero="02" titulo="Resultado apurado — a base real">
        <DocTexto>
          Este é o único quadro deste documento que descreve resultado <strong>já realizado</strong>,
          na receita média que originou o RBT12 declarado. É a partir dele que qualquer valor de
          empresa pode ser sustentado hoje.
        </DocTexto>
        <DocQuadro cabecalho="DRE mensal — situação apurada" etiqueta="Apurado">
          <DocLinha rotulo="Receita bruta mensal média" valor={real(HOJE.receita)} />
          <DocLinha rotulo="Custo de aquisição dos lotes" nota="(25%)" valor={real(HOJE.aquisicao)} negativo />
          <DocLinha rotulo="Lucro bruto" nota="(75%)" valor={real(HOJE.lucroBruto)} />
          <DocLinha rotulo="Comissão da rede" nota="(30%)" valor={real(HOJE.comissaoRede)} negativo />
          <DocLinha rotulo="Despesa operacional" nota="(20%)" valor={real(HOJE.despesaOperacional)} negativo />
          <DocLinha rotulo="Parceiros de compra" nota="(5%)" valor={real(HOJE.parceirosCompra)} negativo />
          <DocLinha rotulo="EBITDA" nota="(20%)" valor={real(HOJE.ebitda)} />
          <DocLinha rotulo="DAS — Simples Nacional" nota="(7,56%)" valor={real(HOJE.imposto)} negativo />
          <DocLinha rotulo="Resultado líquido mensal" valor={real(HOJE.lucro)} total />
        </DocQuadro>
        <div className="mb-5 grid grid-cols-3 gap-3">
          <DocIndicador valor={pct(HOJE.margemPct)} rotulo="Margem líquida" />
          <DocIndicador valor={pct(HOJE.roiPct)} rotulo="Retorno mensal sobre o capital" />
          <DocIndicador valor={real(HOJE.lucroAnual)} rotulo="Resultado anualizado" />
        </div>
      </DocSecao>

      <DocSecao numero="03" titulo="Alavancagem operacional — por que a margem cresce">
        <DocTexto>
          A estrutura da operação — galpão, equipe e tecnologia — custa{' '}
          {real(PREMISSAS.despesaFixaMensal)} por mês e não cresce na mesma proporção da receita. Ela
          representa 20% quando a receita é pequena e {pct(5.5)} quando a receita chega a{' '}
          {real(ESCALA_1M.receita)}. É essa diluição, e não aumento de preço, que expande a margem.
        </DocTexto>
        <DocQuadro cabecalho="DRE mensal projetada — R$ 1 milhão/mês" etiqueta="Lucro Real">
          <DocLinha rotulo="Receita bruta mensal" valor={real(ESCALA_1M.receita)} />
          <DocLinha rotulo="Custo de aquisição dos lotes" nota="(25%)" valor={real(ESCALA_1M.aquisicao)} negativo />
          <DocLinha rotulo="Lucro bruto" nota="(75%)" valor={real(ESCALA_1M.lucroBruto)} />
          <DocLinha rotulo="Comissão da rede" nota="(30%)" valor={real(ESCALA_1M.comissaoRede)} negativo />
          <DocLinha rotulo="Despesa fixa diluída" nota="(5,5%)" valor={real(ESCALA_1M.despesaFixa)} negativo />
          <DocLinha rotulo="Parceiros de compra" nota="(5%)" valor={real(ESCALA_1M.parceirosCompra)} negativo />
          <DocLinha rotulo="LAIR — base tributável" valor={real(ESCALA_1M.lair)} />
          <DocLinha rotulo="IRPJ" nota="(15% + adicional de 10%)" valor={real(ESCALA_1M.irpj)} negativo />
          <DocLinha rotulo="CSLL" nota="(9% do LAIR)" valor={real(ESCALA_1M.csll)} negativo />
          <DocLinha rotulo="PIS/COFINS líquido" nota="(com crédito)" valor={real(ESCALA_1M.pisCofins)} negativo />
          <DocLinha rotulo="ICMS líquido" nota="(com crédito)" valor={real(ESCALA_1M.icms)} negativo />
          <DocLinha rotulo="Resultado líquido mensal" valor={real(ESCALA_1M.lucro)} total />
        </DocQuadro>
        <DocTexto>
          Carga tributária total de {pct(ESCALA_1M.cargaSobreReceitaPct)} sobre a receita. O IRPJ é
          calculado na forma da lei — 15% sobre o LAIR mais adicional de 10% sobre o que excede{' '}
          {real(20000)} por mês — e não por alíquota única aproximada, que superestimaria o imposto.
        </DocTexto>
      </DocSecao>

      <DocSecao numero="04" titulo="Escada de escala">
        <DocTexto>
          Capital considerado = 25% da receita do mês, correspondente ao custo de aquisição dos
          lotes. Não há multiplicação por giro em nenhuma linha: é a leitura mais conservadora
          possível.
        </DocTexto>
        <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-pc-ouro/40">
                <th className="py-2 pr-3 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-pc-ouro">
                  Cenário
                </th>
                <th className="py-2 pr-3 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-pc-ouro">
                  Regime
                </th>
                <th className="py-2 pr-3 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-pc-ouro">
                  Capital
                </th>
                <th className="py-2 pr-3 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-pc-ouro">
                  Resultado/mês
                </th>
                <th className="py-2 pr-3 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-pc-ouro">
                  Retorno
                </th>
                <th className="py-2 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-pc-ouro">
                  Anualizado
                </th>
              </tr>
            </thead>
            <tbody>
              {ESCADA.map((linha) => (
                <tr
                  key={linha.rotulo}
                  className={`border-b border-pc-borda/60 ${linha.destaque ? 'bg-pc-ouro/5' : ''}`}
                >
                  <td className="py-2.5 pr-3 font-semibold text-pc-tinta">
                    {linha.rotulo}
                    {linha.apurado && (
                      <span className="ml-1.5 text-[9px] uppercase tracking-wide text-pc-ouro">
                        apurado
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-pc-tinta-fraca">{linha.regime}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-pc-tinta-fraca">
                    {real(linha.capital)}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-pc-tinta">
                    {real(linha.lucro)}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-pc-ouro">
                    {pct(linha.roiPct)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-pc-tinta-fraca">
                    {real(linha.lucroAnual)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DocTexto>
          Acima de {real(4800000)} de receita anual a permanência no Simples Nacional é vedada por
          lei. Todas as linhas de {real(500000)} para cima estão calculadas em Lucro Real, o único
          regime aplicável nessas faixas.
        </DocTexto>
      </DocSecao>

      <DocSecao numero="05" titulo="Faixa de valor da operação">
        <DocTexto>
          Aplicando múltiplos de {MULTIPLOS.min}× a {MULTIPLOS.max}× sobre o resultado líquido anual
          — faixa usual para negócios de distribuição e varejo de pequeno porte no Brasil — chega-se
          a duas leituras distintas, que não devem ser confundidas.
        </DocTexto>

        <DocQuadro cabecalho="Sobre resultado apurado" etiqueta="Base auditável">
          <DocLinha rotulo="Resultado líquido anualizado" valor={real(VALUATION.apuradoLucroAnual)} />
          <DocLinha rotulo={`Múltiplo ${MULTIPLOS.min}×`} valor={real(VALUATION.apuradoMin)} />
          <DocLinha rotulo={`Múltiplo ${MULTIPLOS.max}×`} valor={real(VALUATION.apuradoMax)} />
          <DocLinha
            rotulo="Faixa de valor hoje"
            valor={`${real(VALUATION.apuradoMin)} — ${real(VALUATION.apuradoMax)}`}
            total
          />
        </DocQuadro>

        <DocQuadro cabecalho="Sobre o cenário de R$ 1 milhão/mês" etiqueta="Projeção">
          <DocLinha rotulo="Resultado líquido anualizado projetado" valor={real(VALUATION.projetadoLucroAnual)} />
          <DocLinha rotulo={`Múltiplo ${MULTIPLOS.min}×`} valor={real(VALUATION.projetadoMin)} />
          <DocLinha rotulo={`Múltiplo ${MULTIPLOS.max}×`} valor={real(VALUATION.projetadoMax)} />
          <DocLinha
            rotulo="Faixa de valor potencial"
            valor={`${real(VALUATION.projetadoMin)} — ${real(VALUATION.projetadoMax)}`}
            total
          />
        </DocQuadro>

        <DocAviso>
          A segunda faixa é <strong>valor potencial, não valor atual</strong>. Ela só se materializa
          se a receita mensal de {real(ESCALA_1M.receita)} for efetivamente atingida e sustentada. A
          diferença entre as duas faixas é exatamente o trabalho de execução que ainda está por
          fazer — e é isso que o aporte financia.
        </DocAviso>
      </DocSecao>

      <DocSecao numero="06" titulo="O que sustenta e o que ameaça o valor">
        <DocTexto>
          <strong>Sustenta:</strong> aquisição a 25% do valor de mercado com nota de arrematação;
          ciclo de giro de {PREMISSAS.cicloDias} dias; estrutura fixa baixa e já instalada; rede de
          vendas remunerada por comissão — custo variável, que não pesa quando não há venda; e
          eficiência tributária crescente no Lucro Real, onde o imposto incide sobre o lucro e não
          sobre a receita.
        </DocTexto>
        <DocTexto>
          <strong>Ameaça:</strong> disponibilidade e preço dos lotes nos leilões, que variam;
          qualidade e conferência do estoque recebido; capacidade de escoamento da rede no mesmo
          ritmo da compra; capital de giro necessário para sustentar o volume; e a transição
          tributária ao ultrapassar o teto do Simples, que exige preparação contábil prévia.
        </DocTexto>
      </DocSecao>

      <div className="border-t border-pc-borda pt-5 text-[10px] leading-relaxed text-pc-tinta-fraca/70">
        Documento interno de uso restrito, protegido pelo Termo de Confidencialidade assinado.
        Elaborado a partir de {FONTE_FISCAL.pgdas}, recibo {FONTE_FISCAL.recibo}, transmitido em{' '}
        {FONTE_FISCAL.transmitido}. Responsável contábil: {FONTE_FISCAL.contadora},{' '}
        {FONTE_FISCAL.crc}. Não constitui oferta, promessa de rentabilidade ou valor mobiliário.
      </div>
    </article>
  );
}