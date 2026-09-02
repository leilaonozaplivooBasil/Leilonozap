import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Gavel, ArrowRight } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { fmtBR } from '@/lib/money';
import {
  podeMostrar, dadosDoPopup, idDoLeilao, marcarVisto,
  Z_INDEX, CHAVE_CONSENTIMENTO,
} from '@/lib/popupLeilaoDestaque';

/**
 * Pop-up do leilão em destaque — montado UMA vez no Layout.
 *
 * Pedido do dono (02/09/2026): "ao abrir o site precisa estourar um pop-up com
 * o leilão em destaque que escolhermos, independente da página. Isso chamará
 * atenção e conduzirá o cliente a ir direto ao lance."
 *
 * 🔴 A REGRA NÃO ESTÁ AQUI. Ela mora em src/lib/popupLeilaoDestaque.js, em JS
 * puro, testada no Node sem navegador — porque o risco desta peça não é o
 * desenho, é a HORA de aparecer. Aqui só se desenha o que a regra liberou.
 *
 * O PADRÃO É NÃO APARECER: qualquer falha (sem configuração, rede fora, leilão
 * encerrado, página proibida) devolve null. O pop-up não tem como derrubar
 * página nenhuma porque o estado normal dele é ausente.
 *
 * Onde a escolha mora: `banner_images` com context='popup_leilao' — tabela que
 * já existe, já é escrita pelo entityWrite e já tem os campos certos
 * (is_active, title, image_url, link_url). Nenhuma migração: migração hoje não
 * sobe sozinha, e esta demanda não pode depender disso.
 */
export default function PopupLeilaoDestaque({ currentPageName }) {
  const [dados, setDados] = useState(null);   // null = não desenha nada
  const [entrou, setEntrou] = useState(false);
  const jaTentou = useRef(false);

  const fechar = useCallback(() => {
    setEntrou(false);
    marcarVisto(typeof window !== 'undefined' ? window.sessionStorage : null);
    // some depois da animação; se o timer não rodar, o estado já saiu do ar
    setTimeout(() => setDados(null), 180);
  }, []);

  useEffect(() => {
    // Uma tentativa por montagem. Navegar entre páginas não refaz a consulta.
    if (jaTentou.current) return;
    jaTentou.current = true;
    let vivo = true;

    (async () => {
      try {
        const consentimentoPendente = (() => {
          try { return !localStorage.getItem(CHAVE_CONSENTIMENTO); } catch { return false; }
        })();

        // Corte barato ANTES de falar com o banco: se a página é proibida, se já
        // viu nesta sessão ou se o consentimento está na tela, nem consulta.
        const previa = podeMostrar({
          config: { is_active: true, link_url: 'x' },  // só para passar do 1º portão
          leilao: { status: 'active', end_time: new Date(Date.now() + 60000).toISOString() },
          paginaAtual: currentPageName, consentimentoPendente,
          sessionStorage: window.sessionStorage,
        });
        if (!previa.mostrar) return;

        const banners = await plataforma.entities.BannerImage.filter({ context: 'popup_leilao' });
        const config = (Array.isArray(banners) ? banners : []).find((b) => b.is_active) || null;
        if (!config) return;

        // Só agora o leilão, e só o que interessa para saber se ainda vale.
        const alvo = idDoLeilao(config.link_url);
        let leilao = null;
        if (alvo) {
          const achado = await plataforma.entities.Auction.filter({ id: alvo });
          leilao = (Array.isArray(achado) ? achado : [])[0] || null;
        }

        const veredito = podeMostrar({
          config, leilao, paginaAtual: currentPageName, consentimentoPendente,
          sessionStorage: window.sessionStorage,
        });
        if (!vivo || !veredito.mostrar) return;

        setDados(dadosDoPopup(config, leilao));
        requestAnimationFrame(() => vivo && setEntrou(true));
      } catch {
        // Rede fora, tabela ausente, resposta estranha: fica sem pop-up. Nunca
        // deixa rastro na tela nem derruba a página que está por baixo.
      }
    })();

    return () => { vivo = false; };
  }, [currentPageName]);

  // Esc fecha. Registrado só enquanto há pop-up — sem ouvinte pendurado.
  useEffect(() => {
    if (!dados) return undefined;
    const aoTeclar = (e) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [dados, fechar]);

  if (!dados) return null;

  // Portal no <body>: fora da árvore de qualquer página, então nenhum
  // `overflow` ou `transform` de container pode cortar ou deslocar o pop-up.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Leilão em destaque"
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX }}
    >
      {/* Véu. Clique fora fecha. */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={fechar}
        className={`absolute inset-0 w-full h-full cursor-default bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${entrou ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-2xl border border-green-400/30 bg-[#0b1018] shadow-2xl shadow-black/60 transition-all duration-200 motion-reduce:transition-none ${entrou ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-2 text-white/80 transition-colors hover:bg-black/80 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {dados.imagem && (
          <img
            src={dados.imagem}
            alt=""
            className="h-44 w-full object-cover"
            // Imagem quebrada não deixa moldura vazia na tela.
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        <div className="p-5">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-green-400">
            <Gavel className="h-3.5 w-3.5" />
            Leilão em destaque
          </p>
          <h2 className="mb-2 text-lg font-bold leading-snug text-white">{dados.titulo}</h2>
          <p className="mb-4 text-sm text-gray-400">
            {dados.preco
              ? <>Lance atual <b className="text-white">{fmtBR(dados.preco)}</b></>
              : 'Lance livre — dê o primeiro'}
          </p>

          <a
            href={dados.destino}
            onClick={fechar}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 font-bold text-black transition-colors hover:bg-green-400"
          >
            Ir para o leilão
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={fechar}
            className="mt-2 w-full py-2 text-sm text-gray-400 transition-colors hover:text-gray-200"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
