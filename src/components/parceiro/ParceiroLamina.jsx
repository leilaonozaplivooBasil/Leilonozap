import React from 'react';

// 🖼️ Lâmina visual — imagem larga da operação com UMA frase por cima.
// Serve de respiro entre os blocos densos: a imagem entrega a mensagem, a frase confirma.
// O texto completo NUNCA sai da página — ele vive na camada ParceiroDetalhe.
export default function ParceiroLamina({ imagem, alt, selo, frase }) {
  return (
    <div className="relative overflow-hidden border border-pc-borda">
      <img
        src={imagem}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-[240px] w-full object-cover sm:h-[340px] lg:h-[420px]"
      />
      {/* véu escuro: garante leitura da frase sobre qualquer parte da foto */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(10,10,11,0.92) 0%, rgba(10,10,11,0.72) 45%, rgba(10,10,11,0.25) 100%)',
        }}
      />
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:justify-center sm:p-10 lg:p-14">
        <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">{selo}</p>
        <p className="mt-3 max-w-xl text-xl font-bold leading-tight text-pc-tinta sm:text-3xl lg:text-4xl">
          {frase}
        </p>
      </div>
    </div>
  );
}