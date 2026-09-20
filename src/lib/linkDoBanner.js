// 🔗 PARA ONDE O BANNER LEVA — e como.
//
// 🔴 POR QUE ISTO EXISTE (19/09/2026, dono: "vamos corrigir o link dos banners").
//
// Três coisas estavam erradas ao mesmo tempo, e as três num lugar só:
//
// 1. TODO banner abria ABA NOVA. O `RotatingBanner` tinha `target="_blank"`
//    cravado no ramo da imagem. O cliente clicava no banner da home e ganhava
//    uma segunda aba do MESMO site. Aba nova é para sair da casa, não para
//    andar dentro dela.
//
// 2. OS LINKS ERAM URL ABSOLUTA DO PRÓPRIO SITE. Seis banners apontavam para
//    `https://leilaonozap.net/leiloes`. Sendo absoluto, o navegador larga a
//    aplicação e BAIXA TUDO DE NOVO — a pessoa vê a tela de carregamento uma
//    segunda vez para ir de uma página nossa para outra página nossa. E no dia
//    em que o domínio mudar, os seis quebram juntos.
//
// 3. O RAMO DE VÍDEO NÃO CONCORDAVA COM O DA IMAGEM: um abria aba nova, o
//    outro não. Mesmo clique, dois comportamentos.
//
// A régua daqui: link nosso NAVEGA DENTRO DA APLICAÇÃO, na mesma aba; link de
// fora abre em aba nova, com `rel` de segurança. E a normalização é feita na
// LEITURA, não no banco — assim banner antigo já gravado com endereço absoluto
// para de recarregar o site sem ninguém precisar reeditar nada.
//
// 🛡️ E UMA TRAVA DE SEGURANÇA. `link_url` é um campo que o administrador
// digita e que vai direto para um `href`. `javascript:...` num href executa
// script no nosso domínio. Nunca tivemos incidente disso, e é justamente por
// isso que a trava entra agora: quem edita banner hoje é de casa, mas o campo
// não sabe disso.

/** Os domínios que são nossos. Subdomínio conta (www, preview da Vercel não). */
const NOSSOS = ['leilaonozap.net', 'leilaonozap.com.br'];

/** Esquemas que abrem outro aplicativo — nunca em aba nova, nunca bloqueados. */
const APLICATIVO = /^(mailto:|tel:|whatsapp:)/i;

/** Esquemas que NÃO podem virar href. */
const PROIBIDO = /^\s*(javascript|data|vbscript):/i;

const ehNosso = (host) => {
  const h = String(host || '').toLowerCase();
  return NOSSOS.some((d) => h === d || h.endsWith(`.${d}`));
};

/**
 * Traduz o `link_url` do banner no destino que a tela deve usar.
 *
 * @returns {null | {tipo:'interno', para:string} | {tipo:'externo', href:string, novaAba:boolean}}
 *   `null` quando não há link — a tela então NÃO envolve o banner num <a>,
 *   para não oferecer um clique que não leva a lugar nenhum.
 */
export function destinoDoBanner(linkUrl) {
  const cru = String(linkUrl ?? '').trim();
  if (!cru) return null;
  if (PROIBIDO.test(cru)) return null;

  if (APLICATIVO.test(cru)) return { tipo: 'externo', href: cru, novaAba: false };

  // Caminho nosso, já relativo: o caso mais comum e o mais barato.
  if (cru.startsWith('/')) return { tipo: 'interno', para: cru };

  if (/^https?:\/\//i.test(cru)) {
    let u;
    try { u = new URL(cru); } catch { return null; }
    if (!ehNosso(u.hostname)) return { tipo: 'externo', href: cru, novaAba: true };
    // Endereço absoluto do NOSSO site: vira caminho, para navegar sem recarregar.
    return { tipo: 'interno', para: `${u.pathname}${u.search}${u.hash}` || '/' };
  }

  // Sem esquema e sem barra ("leiloes"): o administrador quis dizer caminho nosso.
  return { tipo: 'interno', para: `/${cru}` };
}
