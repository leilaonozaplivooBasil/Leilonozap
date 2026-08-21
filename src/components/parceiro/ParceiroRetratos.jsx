import React from 'react';

// 🖤 QUEM ESTÁ DOS DOIS LADOS DA MESA — duas lâminas pretas, foto grande e fala curta.
// Sem número financeiro algum (regra da área pública da captação privada).
const RETRATOS = [
  {
    papel: 'Parceiro de compra',
    titulo: 'Quem entra com o capital',
    foto: '/midia/c771970f8_generated_image.png',
    fala:
      'O parceiro aloca capital em uma operação já rodando: lote comprado abaixo do valor de mercado, revendido pelos canais da empresa e resultado apurado no fechamento do ciclo. Ele não opera, não estoca e não vende — acompanha tudo pelo painel.',
  },
  {
    papel: 'Sócios da operação',
    titulo: 'Quem executa a operação',
    foto: '/midia/f4f9f437f_generated_image.png',
    fala:
      'A empresa responde por compra, curadoria, logística, precificação e venda, com estrutura própria e contrato assinado entre as partes. Cada ciclo é prestado em conta aberta: o que entrou, o que saiu e o que foi apurado.',
  },
];

export default function ParceiroRetratos() {
  return (
    <section className="border-t border-pc-borda bg-pc-preto">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 flex items-center gap-3">
          <span className="h-px w-10 bg-pc-ouro" />
          <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">
            Os dois lados da mesa
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {RETRATOS.map((r) => (
            <article key={r.papel} className="border border-pc-borda bg-pc-preto-2">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={r.foto}
                  alt={r.papel}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-pc-preto via-pc-preto/20 to-transparent" />
                <span className="absolute bottom-4 left-4 border border-pc-ouro/60 bg-pc-preto/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-pc-ouro">
                  {r.papel}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-pc-tinta sm:text-lg">{r.titulo}</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
                  {r.fala}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}