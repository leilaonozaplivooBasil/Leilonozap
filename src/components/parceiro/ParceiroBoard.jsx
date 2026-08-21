import React from 'react';
import ParceiroSecao from './ParceiroSecao';

// 📸 Fotos oficiais fornecidas pela diretoria (não vêm do cadastro do sistema).
const FOTO_LUIZ = '/midia/49c03d768_image.png';
const FOTO_LUCIANO = '/midia/9e425bee8_image.png';
const FOTO_DIOGO = '/midia/59c89b643_image.png';

const MEMBROS = [
  {
    cargo: 'Fundador e CEO',
    nome: "Luiz Sant'Anna",
    bio: "Fuzileiro Naval da Reserva, com trajetória em Sky e Nextel. Originou mais de R$ 100M no mercado financeiro e captou R$ 22M em ambiente digital. Fundador da X-EOS. Representante legal signatário dos contratos.",
    foto: FOTO_LUIZ,
  },
  {
    cargo: 'Diretor de Operação Estruturada',
    vinculo: 'Sócio fundador',
    nome: 'Luciano Pinheiro',
    // ⚠️ 06/08/2026 — pedido da diretoria: a menção à indústria parceira saiu da
    // lâmina pública (não pode constar). O vínculo institucional citado agora é o
    // Orizen Group. Não acrescentar nomes de terceiros aqui sem autorização.
    bio: 'Sócio da Trino Instituição de Pagamentos e do Orizen Group. Histórico em negociação e estruturação de contratos B2B de grande porte com indústria e varejo. Responde pela governança financeira da operação.',
    foto: FOTO_LUCIANO,
  },
  {
    cargo: 'Diretor de Tecnologia',
    vinculo: 'Sócio fundador',
    nome: 'Diogo Archanjo',
    bio: 'CMO da Phizchat, CEO da Ingoobrasil e CEO da Livoo Live. Responsável pela arquitetura tecnológica, escalabilidade de tráfego e pela esteira digital que sustenta os canais próprios de venda.',
    foto: FOTO_DIOGO,
  },
];

export default function ParceiroBoard() {
  return (
    <ParceiroSecao numero="08" rotulo="Quem opera" referencia="Board executivo">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <h2 className="text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
          O board <span className="text-pc-ouro">executivo</span>
        </h2>
        <p className="text-sm leading-relaxed text-pc-tinta-fraca lg:text-right">
          Liderança com histórico em estruturação financeira,
          <br className="hidden sm:block" /> operação institucional e tecnologia.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 border-l border-pc-borda pl-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
        {MEMBROS.map((m) => (
          <div key={m.nome}>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border border-pc-ouro bg-pc-preto-2">
                <img
                  src={m.foto}
                  alt={m.nome}
                  className="h-full w-full object-cover object-top grayscale"
                  loading="lazy"
                  decoding="async"
                  width={160}
                  height={160}
                />
              </div>
              <div>
                <p className="text-[10px] uppercase leading-relaxed tracking-[0.2em] text-pc-ouro">{m.cargo}</p>
                <h3 className="mt-1 text-lg font-bold text-pc-tinta sm:text-xl">{m.nome}</h3>
                {m.vinculo && (
                  <p className="mt-0.5 text-[11px] text-pc-tinta-fraca">{m.vinculo}</p>
                )}
              </div>
            </div>
            <p className="mt-5 border-t border-pc-borda pt-5 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
              {m.bio}
            </p>
          </div>
        ))}
      </div>
    </ParceiroSecao>
  );
}