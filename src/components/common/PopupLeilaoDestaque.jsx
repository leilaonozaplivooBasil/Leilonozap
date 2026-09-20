import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Gavel, ArrowRight, Clock } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { fmtBR } from '@/lib/money';
import {
  podeMostrar, dadosDoPopup, idDoLeilao, marcarVisto, paginaOndeFechou,
  contagemRegressiva, Z_INDEX, CHAVE_CONSENTIMENTO,
} from '@/lib/popupLeilaoDestaque';
import { urgenciaDoLeilao, pilulaDaUrgencia, recadoDaUrgencia } from '@/lib/urgenciaDoLeilao';

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
  /** Texto da contagem. Estado, não cálculo na renderização, porque ele ANDA. */
  const [contagem, setContagem] = useState('');
  /** Última página em que a consulta rodou. Muda de página, tenta de novo. */
  const ultimaPaginaTentada = useRef(null);
  /**
   * Espelho em RAM da página onde foi fechado.
   *
   * 🔴 Existe por causa do modo privativo. Com o sessionStorage bloqueado,
   * `paginaOndeFechou` devolve '' para sempre — e aí fechar o pop-up não
   * gravaria nada, a página se redesenharia e ele voltaria na cara de quem
   * acabou de fechar. Pop-up que não fecha é armadilha. Este ref não depende
   * de storage nenhum e segura esse caso.
   */
  const fechadoEm = useRef('');

  const fechar = useCallback(() => {
    setEntrou(false);
    const onde = String(currentPageName || '');
    fechadoEm.current = onde;
    marcarVisto(typeof window !== 'undefined' ? window.sessionStorage : null, onde);
    // some depois da animação; se o timer não rodar, o estado já saiu do ar
    setTimeout(() => setDados(null), 180);
  }, [currentPageName]);

  /** A página onde foi fechado, com o storage e a RAM concordando. */
  const ondeFoiFechado = useCallback(() => {
    const doStorage = paginaOndeFechou(typeof window !== 'undefined' ? window.sessionStorage : null);
    return doStorage || fechadoEm.current || '';
  }, []);

  useEffect(() => {
    // Uma tentativa por PÁGINA. Entrar em outra página refaz a consulta — que é
    // o pedido. Redesenhos da mesma página não refazem: sem esta guarda, uma
    // troca de estado qualquer reabriria o pop-up em cima de quem já fechou.
    const pagina = String(currentPageName || '');
    if (ultimaPaginaTentada.current === pagina) return;
    ultimaPaginaTentada.current = pagina;
    setDados(null);
    setEntrou(false);
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
          paginaJaVista: ondeFoiFechado(),
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
          paginaJaVista: ondeFoiFechado(),
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
  }, [currentPageName, ondeFoiFechado]);

  /**
   * ⏱ O relógio anda de segundo em segundo, e só enquanto há pop-up na tela.
   *
   * Um `setInterval` que sobrevivesse ao fechamento ficaria acordando o React
   * uma vez por segundo pelo resto da visita, sem nada para mostrar. O
   * `clearInterval` do retorno é o que impede isso.
   *
   * Quando a contagem zera (leilão encerrou com a pessoa na página),
   * `contagemRegressiva` devolve '' e a pílula some sozinha — sem prometer
   * "00:00:00", que é pior que não mostrar nada.
   */
  useEffect(() => {
    if (!dados?.encerraEm) { setContagem(''); return undefined; }
    const bater = () => setContagem(contagemRegressiva(dados.encerraEm, Date.now()));
    bater();
    const id = setInterval(bater, 1000);
    return () => clearInterval(id);
  }, [dados?.encerraEm]);

  // Esc fecha. Registrado só enquanto há pop-up — sem ouvinte pendurado.
  useEffect(() => {
    if (!dados) return undefined;
    const aoTeclar = (e) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [dados, fechar]);

  if (!dados) return null;

  const faixa = urgenciaDoLeilao(dados.encerraEm, Date.now());
  const recado = recadoDaUrgencia(faixa);

  /* ⏱ A CONTAGEM. É o que faz o pop-up chamar atenção com INFORMAÇÃO em vez de
     barulho: aperta sozinha na última hora (vermelho do fogo, pulso) e se
     acalma sozinha quando sobram dias. A cor vem da mesma régua dos cards da
     home — uma linguagem só no site inteiro.

     Fica numa variável porque tem DOIS lugares: sobre a foto (o normal) e solta
     no corpo quando não há foto. Duplicar o JSX seria duplicar a régua junto. */
  const pilulaDaContagem = contagem ? (
    <span
      data-teste="contagem"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-sm font-bold tabular-nums backdrop-blur ${pilulaDaUrgencia(faixa)}`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" />
      {contagem}
      {recado && (
        <span className="font-sans text-[10px] font-semibold uppercase tracking-wider opacity-80">
          {recado}
        </span>
      )}
    </span>
  ) : null;

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
        className={`absolute inset-0 h-full w-full cursor-default bg-nz-noite-2/85 backdrop-blur-md transition-opacity duration-300 ${entrou ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* 🎨 20/09/2026 — "bem mais bonito, moderno e interativo. Identidade da
          marca." O card usava `green-500` e `#0b1018`: verde de biblioteca e um
          escuro qualquer, nenhum dos dois da marca. Agora sai tudo do
          tailwind.config: nz-noite (o verde quase preto do logo), nz-verde-neon
          (o verde do símbolo) e Roboto Slab no título, que é a fonte da home. */}
      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl border border-nz-verde-neon/25 bg-nz-noite shadow-2xl shadow-black/70 transition-all duration-300 ease-out motion-reduce:transition-none ${entrou ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'}`}
      >
        {/* Brilho de marca no topo: o verde do logo vazando por trás do card.
            `pointer-events-none` porque é pintura, não alvo de clique. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full bg-nz-verde-neon/25 blur-2xl"
        />

        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-20 rounded-full border border-white/10 bg-black/50 p-2 text-white/70 backdrop-blur transition-all hover:scale-110 hover:border-nz-verde-neon/40 hover:bg-black/70 hover:text-white motion-reduce:hover:scale-100"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Assinatura da casa. Antes o pop-up não dizia de quem era. */}
        <div className="relative z-10 flex items-center gap-2 px-5 pt-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-nz-verde-neon/15 ring-1 ring-nz-verde-neon/30">
            <Gavel className="h-3.5 w-3.5 text-nz-verde-neon" />
          </span>
          <span className="font-slab text-[11px] font-bold uppercase tracking-[0.18em] text-nz-verde-menta">
            Leilão NoZap
          </span>
        </div>

        {/* 🔴 02/09/2026 — "a imagem não é vista direito". `object-contain`
            sobre fundo claro: foto de produto é ALTA, e `object-cover` mostrava
            só uma faixa do meio. O fundo continua claro (a foto do PS5 é
            recortada em branco), mas agora é um degradê com cantos arredondados
            dentro do card escuro, em vez de uma tarja branca de ponta a ponta —
            era ela que quebrava a identidade no print do dono. */}
        {dados.imagem && (
          <div className="relative z-10 px-5 pt-4">
            <div className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-white to-nz-verde-fundo p-3 ring-1 ring-white/10">
              <img
                src={dados.imagem}
                alt=""
                className={`max-h-full max-w-full object-contain drop-shadow-lg transition-transform duration-500 motion-reduce:transition-none ${entrou ? 'scale-100' : 'scale-90'}`}
                // Imagem quebrada esconde a moldura inteira, não só a foto —
                // senão sobra um retângulo claro vazio no meio do pop-up.
                onError={(e) => { const m = e.currentTarget.parentElement?.parentElement; if (m) m.style.display = 'none'; }}
              />
              {/* Véu escuro só no pé da foto: sem ele a tarja clara termina numa
                  linha reta contra o card escuro e fica descolada. Com ele, a
                  foto ENTRA no card. E é onde a contagem se apoia. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-nz-noite via-nz-noite/80 to-transparent"
              />
              <div className="absolute bottom-2.5 left-2.5">{pilulaDaContagem}</div>
            </div>
          </div>
        )}

        <div className="relative z-10 p-5">
          {/* ⏱ A CONTAGEM. É o que faz o pop-up chamar atenção com INFORMAÇÃO
              em vez de barulho: aperta sozinha na última hora (vermelho do
              fogo, pulso) e se acalma sozinha quando sobram dias. A cor vem da
              mesma régua dos cards da home — uma linguagem só no site todo. */}
          {!dados.imagem && pilulaDaContagem && <div className="mb-3">{pilulaDaContagem}</div>}

          <h2 className="mb-3 font-slab text-xl font-bold leading-snug text-white">{dados.titulo}</h2>

          {/* O preço deixa de ser uma frase e vira o número que ele é. */}
          <div className="mb-5">
            {dados.preco ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-nz-verde-menta/70">
                  Lance atual
                </p>
                {/* `fmtBR` devolve só "797,00" — sem o R$, o número maior da
                    tela fica ambíguo. O símbolo entra menor e mais apagado, do
                    jeito que a home já faz. */}
                <p className="font-slab text-3xl font-bold leading-tight text-nz-verde-neon">
                  <span className="mr-1 text-lg font-semibold text-nz-verde-menta">R$</span>
                  {fmtBR(dados.preco)}
                </p>
              </>
            ) : (
              <p className="font-slab text-xl font-bold text-nz-verde-neon">
                Lance livre — dê o primeiro
              </p>
            )}
          </div>

          {/* O botão: varredura de brilho no hover e um anel que acende. Tudo em
              `motion-reduce` para quem pediu menos movimento no sistema. */}
          <a
            href={dados.destino}
            onClick={fechar}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-nz-verde-neon px-4 py-3.5 font-slab text-base font-bold text-nz-noite shadow-lg shadow-nz-verde-neon/25 transition-all duration-200 hover:shadow-xl hover:shadow-nz-verde-neon/40 hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full motion-reduce:hidden"
            />
            <Gavel className="relative h-4 w-4" />
            {/* 20/09/2026 — o dono pediu "botão para dar lance". "Ir para o
                leilão" descrevia a navegação; "Dar meu lance" diz o que a
                pessoa vai FAZER. O destino é o mesmo: a sala, onde o lance
                acontece. */}
            <span className="relative">Dar meu lance</span>
            <ArrowRight className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
          </a>

          <button
            type="button"
            onClick={fechar}
            className="mt-2.5 w-full py-2 text-sm text-white/40 transition-colors hover:text-white/70"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
