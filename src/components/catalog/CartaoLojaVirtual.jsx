import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Package, Truck, Share2 } from 'lucide-react';
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
export default function CartaoLojaVirtual({ parceiro, productCount = 0 }) {
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
      className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-700 bg-gray-800/50 p-2.5 sm:p-3"
      aria-label="Loja virtual"
    >
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

      {/* Loja Virtual em cima · nome embaixo */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-green-400 font-bold leading-none">Loja Virtual</p>
        <h3 className="text-white font-bold text-sm sm:text-base truncate leading-tight mt-0.5">
          {nome || 'Especial'}
        </h3>
        <div className="mt-0.5 flex items-center gap-x-2.5 text-[10.5px] text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Package className="w-3 h-3 text-green-400 shrink-0" />{productCount} produtos
          </span>
          <span className="text-gray-600 hidden sm:inline">·</span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <Truck className="w-3 h-3 text-green-400 shrink-0" />Envio para todo Brasil
          </span>
        </div>
      </div>

      {/* Selo oficial do cargo, ao lado */}
      {cargo && (
        <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0" title={levelName(cargo)}>
          <SeloCargo cargo={cargo} title={levelName(cargo)} />
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={compartilhar}
          aria-label="Compartilhar loja"
          title="Compartilhar loja"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 px-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-100 text-xs font-semibold transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden lg:inline">Compartilhar</span>
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