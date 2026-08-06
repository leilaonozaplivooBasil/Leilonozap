import React from 'react';
import { ChevronRight } from 'lucide-react';

// 🔗 Estrutura comercial — deixa explícito que Licenciado, Vendedor e
// Influenciador são PAPÉIS DIFERENTES (o memorando fala em 300 licenciados,
// não em 300 vendedores). Leitura institucional, antipirâmide.
// ⚠️ PROIBIDO aqui: percentual de comissão, valor em R$, nível/geração,
// linguagem de "plano de ganhos".
const DEGRAUS = [
  {
    papel: 'Licenciado',
    faz: 'Assume uma praça e responde por ela. Recebe estoque curado e estrutura de operação.',
    ativa: 'Cadastra e sustenta os vendedores da própria praça.',
  },
  {
    papel: 'Vendedor',
    faz: 'Vende o estoque curado na comunidade dele, presencial e pelos canais digitais da empresa.',
    ativa: 'Cadastra influenciadores para ampliar o alcance da praça.',
  },
  {
    papel: 'Influenciador',
    faz: 'Leva audiência própria para o Leilão e para a Loja Virtual com link identificado.',
    ativa: 'Gera o tráfego que alimenta os canais de venda da empresa.',
  },
];

export default function ParceiroEstruturaRede() {
  return (
    <div className="mt-14 border border-pc-borda bg-pc-preto-2 p-6 sm:p-8">
      <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Estrutura comercial</p>
      <h3 className="mt-2 text-xl font-bold text-pc-tinta sm:text-2xl">
        Como a estrutura comercial se organiza
      </h3>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pc-tinta-fraca">
        Três papéis distintos, com função operacional própria. Quando o memorando fala em
        licenciados, fala do primeiro degrau — cada licenciado sustenta os próprios vendedores,
        e cada vendedor amplia o alcance com influenciadores.
      </p>

      <div className="mt-8 grid grid-cols-1 items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {DEGRAUS.map((d, i) => (
          <React.Fragment key={d.papel}>
            <article className="border border-pc-borda bg-pc-preto p-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-pc-ouro">
                {`Degrau ${i + 1}`}
              </span>
              <h4 className="mt-2 text-lg font-bold text-pc-tinta">{d.papel}</h4>
              <p className="mt-3 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">{d.faz}</p>
              <p className="mt-4 border-t border-pc-borda pt-3 text-xs leading-relaxed text-pc-tinta">
                {d.ativa}
              </p>
            </article>
            {i < DEGRAUS.length - 1 && (
              <div className="flex items-center justify-center py-1 md:py-0">
                <ChevronRight
                  className="h-6 w-6 rotate-90 text-pc-ouro md:rotate-0"
                  strokeWidth={1.5}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <p className="mt-8 border-t border-pc-ouro/25 pt-5 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
        <span className="text-pc-tinta">Leitura obrigatória:</span> remuneração vinculada
        exclusivamente à venda de produto real entregue. Não há ganho por cadastro, por adesão de
        pessoas nem por recrutamento.
      </p>
    </div>
  );
}