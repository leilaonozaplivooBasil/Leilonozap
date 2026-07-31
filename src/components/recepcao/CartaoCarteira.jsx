import React from 'react';

// Cartão da Carteira NoZap em perspectiva, com o nome do usuário gravado
// quando houver sessão salva. Puramente visual — não lê saldo nem API.
export default function CartaoCarteira({ nome }) {
  return (
    <div className="flex w-full justify-center px-5 pb-2 [perspective:1200px]">
      <div
        className="nz-float w-full max-w-[440px] rounded-[22px] p-6 text-left shadow-[0_28px_60px_rgba(12,31,22,0.22)]"
        style={{
          background: 'linear-gradient(135deg, #F8FBF9 0%, #E4EFE8 55%, #CFE3D7 100%)',
          transform: 'rotateX(9deg) rotateY(-13deg)',
        }}
      >
        <div className="flex items-start justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-nz-verde">
            Carteira NoZap
          </span>
          <span className="h-6 w-8 rounded-[5px] bg-gradient-to-br from-[#C9A227] to-[#E8D08A]" />
        </div>

        <div className="mt-10 text-[15px] tracking-[0.28em] text-nz-tinta-fraca">
          •••• •••• •••• 4402
        </div>

        <div className="mt-6 text-[15px] font-medium tracking-wide text-nz-tinta">
          {nome || 'Seu nome aqui'}
        </div>
      </div>
    </div>
  );
}