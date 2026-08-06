import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Truck, Share2 } from 'lucide-react';
import CarrinhoEntrega from '@/components/catalog/CarrinhoEntrega';
import { toast } from 'sonner';
import { copyLink } from '@/lib/clipboard';
import SeloCargo from '@/components/network/SeloCargo';
import { cargoDoParceiro, podeFalarComigo } from '@/lib/contatoParceiro';
import { levelName } from '@/lib/careerLevels';

/**
 * 🏪 CartaoLojaVirtual — assinatura compacta do dono da loja no catálogo.
 * "Loja Virtual" em cima, nome embaixo, selo oficial do cargo ao lado.
 *
 * "Falar Comigo" NÃO vai direto pro WhatsApp: passa pela página de aviso
 * antifraude (/falar-com-parceiro) e só aparece a partir de Vendedor oficial.
 */
export default function CartaoLojaVirtual({ parceiro }) {
  const nome = parceiro?.name || null;
  const cargo = cargoDoParceiro(parceiro);
  const mostrarContato = podeFalarComigo(parceiro);
  const ref = parceiro?.referral_code || null;

  const compartilhar = async () => {
    const url = `${window.location.origin}/Loja-Virtual${ref ? `?ref=${ref}` : ''}`;
    const titulo = nome ? `Loja Virtual ${nome}` : 'Loja Virtual Leilão NoZap';
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: `${titulo} — produtos com desconto no Leilão NoZap`, url });
        return;
      } catch { /* usuário cancelou ou não suportado: cai na cópia */ }
    }
    const ok = await copyLink(url);
    ok ? toast.success('Link da loja copiado!') : toast.error('Não consegui copiar. Copie da barra de endereço.');
  };

  return (
    <section
      className="relative mb-6 flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-800/50 p-2.5 sm:p-3"
      aria-label="Loja virtual"
    >
      {/* 🛒 carrinho de entrega atravessando o cartão (decorativo) */}
      <CarrinhoEntrega />
      {/* Foto */}
      {parceiro?.photo ? (
        <img
          src={parceiro.photo}
          alt={nome || 'Loja Virtual'}
          className="w-11 h-11 rounded-xl object-cover border border-green-500/40 shrink-0"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-lg font-black shrink-0">
          {(nome || 'L').charAt(0).toUpperCase()}
        </div>
      )}

      {/* Loja Virtual em cima · nome embaixo, com o selo chapado colado no nome */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-green-400 font-bold leading-none">Loja Virtual</p>
        <div className="mt-1 flex items-center gap-2.5 min-w-0">
          <h3 className="text-white font-bold text-sm sm:text-base truncate leading-tight">
            {nome || 'Especial'}
          </h3>
          {/* Selo chapado: redondo (sem o quadrado branco atrás), no tamanho da foto */}
          {cargo && (
            <span className="block w-11 h-11 shrink-0 overflow-hidden rounded-full">
              <SeloCargo cargo={cargo} title={levelName(cargo)} />
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-x-4 text-[10.5px] text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Truck className="w-3 h-3 text-green-400 shrink-0" />Envio para todo Brasil
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Compartilhar no padrão do leilão: quadradinho verde, só o ícone */}
        <button
          type="button"
          onClick={compartilhar}
          aria-label="Compartilhar loja"
          title="Compartilhar loja"
          className="grid h-9 w-9 place-items-center rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors active:scale-95"
        >
          <Share2 className="w-4 h-4" />
        </button>
        {mostrarContato && (
          <Link
            to={`/falar-com-parceiro${ref ? `?ref=${ref}` : ''}`}
            className="min-h-[44px] flex items-center gap-1.5 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Falar Comigo</span>
          </Link>
        )}
      </div>
    </section>
  );
}