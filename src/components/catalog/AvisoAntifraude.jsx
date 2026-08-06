import React from 'react';
import { ShieldAlert, BadgeCheck, CreditCard, XCircle, ShoppingCart } from 'lucide-react';

/**
 * ⚠️ AvisoAntifraude — bloco de segurança exibido antes de mandar a pessoa
 * pro WhatsApp de um parceiro. É o elemento mais visível da página: pagamento
 * SÓ pelos canais oficiais da plataforma.
 */
const ITENS = [
  {
    icone: CreditCard,
    titulo: 'Pague só dentro da plataforma',
    texto: 'O Leilão NoZap já tem os canais de pagamento oficiais dentro do site e do aplicativo. É por ali que sua compra fica registrada e protegida.',
  },
  {
    icone: XCircle,
    titulo: 'Nunca envie dinheiro por fora',
    texto: 'Pix, transferência ou dinheiro na conta pessoal de qualquer pessoa é golpe. Se alguém pedir isso, não pague e nos avise.',
  },
  {
    icone: BadgeCheck,
    titulo: 'Parceiro recebe pela plataforma',
    texto: 'Todos os parceiros recebem a comissão automaticamente pelo sistema. Nenhum parceiro precisa receber dinheiro na conta dele — nem o oficial.',
  },
  {
    icone: ShoppingCart,
    titulo: 'Feche a compra na Loja Virtual',
    texto: 'Use o carrinho oficial da loja. Conversar no WhatsApp é só para tirar dúvidas e escolher o produto.',
  },
];

export default function AvisoAntifraude() {
  return (
    <div className="rounded-2xl border-2 border-amber-500/60 bg-amber-950/30 p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-400/90 leading-none">
            Aviso importante
          </p>
          <h2 className="mt-1 text-amber-300 font-black text-base sm:text-lg uppercase tracking-wide">
            Atenção — leia antes de continuar
          </h2>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ITENS.map(({ icone: Icone, titulo, texto }) => (
          <div key={titulo} className="rounded-xl bg-gray-900/70 border border-amber-500/20 p-3">
            <p className="flex items-center gap-2 text-white font-bold text-[13.5px]">
              <Icone className="w-4 h-4 text-amber-400 shrink-0" />
              {titulo}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-gray-300">{texto}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[12.5px] leading-relaxed text-amber-200/90">
        Ser parceiro oficial significa que a pessoa é cadastrada e validada aqui na plataforma — mas
        isso <strong className="text-amber-300">não autoriza</strong> nenhum pagamento fora dos meios
        oficiais. Enviando dinheiro por fora, você coloca seu dinheiro e sua conta em risco.
      </p>
    </div>
  );
}