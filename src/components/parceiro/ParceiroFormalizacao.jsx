import React from 'react';
import ParceiroSecao from './ParceiroSecao';

const ITENS = [
  { titulo: 'Como se assina', texto: 'Aceite eletrônico ou assinatura manual, com validade jurídica reconhecida pela Lei 14.063/2020 e pela MP 2.200-2/2001.' },
  { titulo: 'Sigilo', texto: 'Confidencialidade recíproca por cinco anos sobre tudo o que for compartilhado entre as partes.' },
  { titulo: 'Foro', texto: 'Comarca do Rio de Janeiro/RJ, conforme eleito no instrumento de parceria.' },
  { titulo: 'Condições comerciais', texto: 'Prazos, cota-alvo de participação no resultado apurado e demais condições são apresentados em ambiente restrito, após identificação do interessado.' },
];

// Bloco 09 — como se formaliza. Sem valores e sem dados bancários.
export default function ParceiroFormalizacao() {
  return (
    <ParceiroSecao numero="08" rotulo="Formalização" referencia="Captação privada" fundo="preto-2">
      <h2 className="max-w-2xl text-2xl font-bold leading-tight text-pc-tinta sm:text-4xl">
        Como a parceria se <span className="text-pc-ouro">formaliza</span>
      </h2>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITENS.map((item) => (
          <div key={item.titulo} className="border-t border-pc-borda pt-5">
            <h3 className="text-base font-bold text-pc-tinta sm:text-lg">{item.titulo}</h3>
            <p className="mt-3 text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">{item.texto}</p>
          </div>
        ))}
      </div>
    </ParceiroSecao>
  );
}