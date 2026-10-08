// 🎬 COMPARTILHAR SEMPRE COM O VÍDEO (08/10/2026).
//
// Dono: "quando eu compartilhar, precisa sempre puxar o vídeo, não a imagem. Se
// tiver vídeo postado, compartilha o vídeo. Fica muito melhor e chama mais atenção."
//
// O que o WhatsApp permite, dito sem enfeite:
//   • vídeo NOSSO (arquivo): vai ANEXADO — chega como vídeo, com miniatura e play.
//     Teto do anexo: 16 MB; acima disso o aparelho recusa e cai na foto;
//   • vídeo do YOUTUBE: o preview do WhatsApp é o do PRIMEIRO link da mensagem, e
//     para um link do YouTube o preview é o vídeo (miniatura com play, que abre ali
//     mesmo). Então o link do vídeo vai PRIMEIRO e o nosso link logo abaixo —
//     o código de afiliado de quem compartilha segue no nosso link;
//   • o WhatsApp NÃO toca vídeo de dentro de um link de terceiros nem de og:video.
//     Não existe tag que mude isso; o anexo e o link do YouTube são os caminhos reais.
//
// Uma regra só, usada pelo card do leilão, pela sala, pelo card da Loja e pela
// página do produto — antes cada um tinha a sua e só o card do destaque levava vídeo.
import { mensagemSemLink } from './compartilhar.js';

/** Teto do WhatsApp para vídeo anexado. */
export const TETO_ANEXO_BYTES = 16 * 1024 * 1024;

/** Vídeo que é um LINK (YouTube/Vimeo): não há arquivo para anexar. */
export function ehVideoDeLink(video) {
  return Boolean(video && (video.tipo === 'youtube' || video.tipo === 'vimeo') && /^https?:\/\//i.test(String(video.url || '')));
}

/** A mensagem com o link do vídeo na frente, para o preview ser o vídeo. */
export function mensagemComVideo(mensagem, video) {
  const m = String(mensagem ?? '');
  if (!ehVideoDeLink(video)) return m;
  return `🎥 Veja em vídeo:\n${String(video.url).trim()}\n\n${m}`;
}

const nomeDoArquivo = (titulo) => `${String(titulo || 'produto').substring(0, 40).replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_') || 'produto'}.mp4`;

/**
 * Tenta anexar o vídeo nosso. Devolve 'compartilhado', 'cancelado' (a pessoa fechou a
 * folha) ou 'indisponivel' (sem suporte, arquivo grande ou rede): quem chama segue.
 */
export async function compartilharArquivoDeVideo({ video, titulo, texto, url, nav = globalThis.navigator, buscar = globalThis.fetch, aoPreparar }) {
  if (video?.tipo !== 'arquivo' || !video.embed || !nav?.share || !nav?.canShare || !buscar) return 'indisponivel';
  try {
    aoPreparar?.(true);
    const resposta = await buscar(video.embed, { mode: 'cors' });
    if (!resposta?.ok) return 'indisponivel';
    const blob = await resposta.blob();
    if (blob.size > TETO_ANEXO_BYTES) return 'indisponivel';
    const arquivo = new File([blob], nomeDoArquivo(titulo), { type: blob.type || 'video/mp4' });
    if (!nav.canShare({ files: [arquivo] })) return 'indisponivel';
    await nav.share({ title: titulo, text: texto, url, files: [arquivo] });
    return 'compartilhado';
  } catch (erro) {
    if (erro?.name === 'AbortError') return 'cancelado';
    return 'indisponivel';
  } finally {
    aoPreparar?.(false);
  }
}

/**
 * A regra única. `mensagem` traz o nosso link dentro (como os cards já montam).
 * @returns {Promise<{feito: boolean, via: 'anexo'|'link-do-video'|'whatsapp'|'cancelado'|null}>}
 *   `feito: false` = não há vídeo aproveitável: quem chama segue o fluxo de sempre (foto).
 */
export async function compartilharComVideo({
  video, titulo, mensagem, url, nav = globalThis.navigator, buscar = globalThis.fetch, abrir = (u) => globalThis.window?.open(u, '_blank'), aoPreparar,
}) {
  if (!video) return { feito: false, via: null };

  if (video.tipo === 'arquivo') {
    const r = await compartilharArquivoDeVideo({ video, titulo, texto: mensagemSemLink(mensagem, url), url, nav, buscar, aoPreparar });
    if (r === 'compartilhado') return { feito: true, via: 'anexo' };
    if (r === 'cancelado') return { feito: true, via: 'cancelado' };
    return { feito: false, via: null };
  }

  if (ehVideoDeLink(video)) {
    const completa = mensagemComVideo(mensagem, video);
    if (nav?.share) {
      try {
        await nav.share({ title: titulo, text: mensagemSemLink(completa, url), url });
        return { feito: true, via: 'link-do-video' };
      } catch (erro) {
        if (erro?.name === 'AbortError') return { feito: true, via: 'cancelado' };
      }
    }
    abrir(`https://api.whatsapp.com/send?text=${encodeURIComponent(completa)}`);
    return { feito: true, via: 'whatsapp' };
  }

  return { feito: false, via: null };
}
