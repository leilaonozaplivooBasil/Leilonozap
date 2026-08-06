import React from 'react';

// 📜 "Como funciona" — texto FIEL ao Contrato de Parceria Comercial.
// ⚠️ PROIBIDO aqui: retorno garantido, rendimento, juros, risco zero, projeção
// de lucro para o parceiro (Cláusula 3.2). A participação é sobre o LUCRO
// LÍQUIDO APURADO nas operações (Cláusula 7.1).
const ITENS = [
  {
    titulo: 'Curadoria e controle de qualidade',
    texto:
      'Todos os produtos passam por curadoria e controle de qualidade em nosso centro no Rio de Janeiro, com metodologia de curva ABC, análise de liquidez e cálculo de rentabilidade (Cláusulas 1.2 e 5.1).',
  },
  {
    titulo: 'Participação no resultado',
    texto:
      'Cota de participação sobre o lucro líquido apurado nas operações comerciais, conforme percentual definido no momento da adesão (Cláusula 7.1). Não constitui rendimento financeiro, juros ou remuneração garantida sobre capital.',
  },
  {
    titulo: 'Acompanhamento e prestação de contas',
    texto:
      'Registro detalhado das operações, prestação de contas e demonstrativo de resultados disponíveis neste painel digital exclusivo (Cláusulas 5.3 e 7.4).',
  },
  {
    titulo: 'Riscos operacionais',
    texto:
      'Adotamos critérios rigorosos de seleção, controle e gestão para mitigar riscos. Toda operação comercial envolve variáveis de mercado, logística e fornecedores, podendo o resultado operacional sofrer oscilações (Cláusulas 11.1 e 11.2).',
  },
];

export default function ParceiroComoFunciona() {
  return (
    <section className="border border-pc-borda bg-pc-preto-2 p-5 sm:p-8">
      <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Instrumento particular</p>
      <h2 className="mt-2 text-xl font-bold text-pc-tinta sm:text-2xl">Como funciona a parceria</h2>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {ITENS.map((i) => (
          <div key={i.titulo} className="border-t border-pc-ouro/25 pt-4">
            <h3 className="text-sm font-bold text-pc-tinta">{i.titulo}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-pc-tinta-fraca">{i.texto}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 border-t border-pc-borda pt-5 text-[10px] leading-relaxed text-pc-tinta-fraca sm:text-xs">
        Parceria comercial de participação em operação estruturada de venda de produtos. Não é
        aplicação financeira, produto de renda fixa ou variável, mútuo, oferta pública de valores
        mobiliários nem promessa de rendimento ou remuneração garantida sobre capital (Cláusula 3.2).
      </p>
    </section>
  );
}