import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Share2, Truck } from 'lucide-react';
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
  // 🛒 âncoras da animação de entrega (decorativa): parte da ponta do selo
  // (ou do fim do nome, se não houver cargo) e termina no botão compartilhar
  const cartaoRef = React.useRef(null);
  const inicioRef = React.useRef(null);
  const compartilharRef = React.useRef(null);
  // 📱 17/09/2026 — no celular o carrinho tem uma PISTA própria embaixo do nome.
  // Dono: "o caminhão andando no celular fica feio; equalizar, botar um embaixo
  // do outro". Antes o texto "Envio para todo Brasil" nascia centralizado POR
  // CIMA do nome e o carrinho cruzava a linha do nome até o botão compartilhar
  // — num cartão de 360px isso vira sobreposição. Agora: nome em cima, faixa de
  // entrega embaixo, e o carrinho anda só dentro dessa faixa. No desktop segue
  // como estava (nome largo, carrinho do selo ao compartilhar).
  const pistaInicioRef = React.useRef(null);
  const pistaFimRef = React.useRef(null);
  const [desktop, setDesktop] = React.useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches);
  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const aoMudar = (e) => setDesktop(e.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

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
      ref={cartaoRef}
      className="relative mb-6 rounded-2xl border border-gray-700 bg-gray-800/50 p-2.5 sm:p-3"
      aria-label="Loja virtual"
    >
      {/* 🛒 carrinho de entrega (decorativo): no desktop cruza do selo ao
          compartilhar; no celular anda na faixa de entrega embaixo do nome */}
      <CarrinhoEntrega
        containerRef={cartaoRef}
        inicioRef={desktop ? inicioRef : pistaInicioRef}
        fimRef={desktop ? compartilharRef : pistaFimRef}
        textoNoMeio={desktop}
        entradaY={desktop ? -34 : -12}
      />
      <div className="flex items-center gap-3">
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
          <h3
            ref={cargo ? null : inicioRef}
            className="text-white font-bold text-sm sm:text-base leading-tight break-words line-clamp-2 sm:line-clamp-none sm:truncate"
          >
            {nome || 'Especial'}
          </h3>
          {/* Selo chapado: redondo (sem o quadrado branco atrás), no tamanho da foto */}
          {cargo && (
            <span ref={inicioRef} className="block w-11 h-11 shrink-0 overflow-hidden rounded-full">
              <SeloCargo cargo={cargo} title={levelName(cargo)} />
            </span>
          )}
        </div>
        {/* 🚚 "Envio para todo Brasil" saiu daqui: agora aparece no meio do cartão
            junto com o carrinho da animação (CarrinhoEntrega) e some com ele. */}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Compartilhar no padrão do leilão: quadradinho verde, só o ícone */}
        <button
          ref={compartilharRef}
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
      </div>

      {/* 📱 faixa de entrega (só celular): o texto fica fixo à esquerda e o
          carrinho percorre o resto da linha, sem passar por cima do nome */}
      <div className="sm:hidden mt-2 pt-2 border-t border-gray-700/60 flex items-center gap-1.5 text-[11px] text-gray-400">
        <Truck className="w-3.5 h-3.5 text-green-400 shrink-0" />
        <span ref={pistaInicioRef}>Envio para todo Brasil</span>
        <span className="flex-1" />
        <span ref={pistaFimRef} className="h-5 w-5 shrink-0" aria-hidden />
      </div>
    </section>
  );
}