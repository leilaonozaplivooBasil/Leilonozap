/**
 * videoDoProduto — o que é um vídeo de produto válido, e como tocá-lo.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 🔴 POR QUE ISTO EXISTE, E POR QUE É UMA LISTA BRANCA
 * ══════════════════════════════════════════════════════════════════════════
 * Pedido do dono (15/09/2026): anexar vídeo OU colar link de vídeo no cadastro
 * de produto. As duas coisas moram na mesma coluna `products.video_urls`, e é
 * aqui que se decide o que entra e como toca.
 *
 * A validação aceita SÓ hosts conhecidos. Não é preciosismo:
 *
 *   • o endereço colado vira `<iframe src>` na página de venda. Aceitar
 *     qualquer host é deixar um terceiro escolher o que roda dentro do nosso
 *     site — e o vercel.json não define CSP nenhuma hoje, então não há segunda
 *     rede embaixo desta;
 *   • a lição do LAVAJATO (02/09) vale em vídeo também: conteúdo servido por
 *     terceiro pode virar outra coisa amanhã. YouTube e Vimeo são escolhidos
 *     porque servem por embed estável e não custam banda nossa;
 *   • host desconhecido some calado no navegador de quem compra — quem cadastra
 *     acha que salvou e ninguém descobre até um cliente reclamar.
 *
 * Arquivo NOSSO (balde `videos-produtos`) é o outro caminho aceito, e toca em
 * `<video>` direto, sem iframe.
 */

/** Onde o nosso Storage mora. Espelha src/lib/imagemExterna.js. */
const NOSSO_HOST = 'supabase.co';

/** O balde criado em 20260915132423_video_do_produto.sql. */
export const BALDE_VIDEO = 'videos-produtos';

/**
 * Teto do arquivo, 10% ABAIXO do balde (50 MB) — a mesma margem do gravador do
 * ritual, e pelo mesmo motivo: o Storage mede o CORPO da requisição, que
 * carrega cabeçalho e envelope além dos bytes do vídeo. Um arquivo de 49,9 MB
 * pode ser recusado por um balde de 50 MB, e a pessoa não entenderia por quê.
 */
export const TETO_BYTES = Math.floor(50 * 1024 * 1024 * 0.9);

/** O que o balde aceita — espelho do `allowed_mime_types` da migração. */
export const TIPOS_ACEITOS = ['video/mp4', 'video/webm', 'video/quicktime'];

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

/** É arquivo nosso, no Storage? */
export function ehVideoNosso(url) {
  const s = texto(url);
  if (!/^https?:\/\//i.test(s)) return false;
  try {
    const u = new URL(s);
    return u.hostname.endsWith(NOSSO_HOST) && u.pathname.includes(`/${BALDE_VIDEO}/`);
  } catch { return false; }
}

/**
 * O id do vídeo do YouTube, nas quatro formas que as pessoas realmente colam:
 * watch?v=, youtu.be/, /embed/ e /shorts/. `null` quando não é YouTube.
 */
function idDoYoutube(u) {
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'music.youtube.com') return null;
  if (u.pathname === '/watch') return u.searchParams.get('v');
  const m = /^\/(embed|shorts|v)\/([^/?]+)/.exec(u.pathname);
  return m ? m[2] : null;
}

/** O id do vídeo no Vimeo, ou `null`. */
function idDoVimeo(u) {
  if (u.hostname.replace(/^www\./, '') !== 'vimeo.com') return null;
  const m = /^\/(\d+)/.exec(u.pathname);
  return m ? m[1] : null;
}

/**
 * Entende um endereço colado ou enviado.
 *
 * @returns {{ok: true, url: string, tipo: 'youtube'|'vimeo'|'arquivo', embed: string}
 *         | {ok: false, motivo: string}}
 *   `url` é o que vai pro banco (guardamos o que a pessoa colou, não o embed:
 *   se um dia a forma do embed mudar, o endereço original ainda é recuperável).
 *   `embed` é o que o player usa.
 */
export function entenderVideo(bruto) {
  const s = texto(bruto);
  if (!s) return { ok: false, motivo: 'vazio' };

  if (ehVideoNosso(s)) return { ok: true, url: s, tipo: 'arquivo', embed: s };

  let u;
  try { u = new URL(s); } catch { return { ok: false, motivo: 'endereco_invalido' }; }
  if (!/^https?:$/i.test(u.protocol)) return { ok: false, motivo: 'protocolo_nao_permitido' };

  const yt = idDoYoutube(u);
  if (yt) return { ok: true, url: s, tipo: 'youtube', embed: `https://www.youtube.com/embed/${yt}` };

  const vm = idDoVimeo(u);
  if (vm) return { ok: true, url: s, tipo: 'vimeo', embed: `https://player.vimeo.com/video/${vm}` };

  return { ok: false, motivo: 'host_nao_permitido' };
}

/** A frase que a pessoa lê quando o endereço não serve. Sem jargão. */
export function recadoDoErro(motivo) {
  return ({
    vazio: 'Cole o link do vídeo ou escolha um arquivo.',
    endereco_invalido: 'Isso não parece um endereço de vídeo. Cole o link inteiro, começando com https://',
    protocolo_nao_permitido: 'Só aceito endereço que comece com https://',
    host_nao_permitido: 'Por enquanto aceito link do YouTube ou do Vimeo — ou o arquivo de vídeo direto, pelo botão de anexar.',
  })[motivo] || 'Não consegui usar esse vídeo.';
}

/** O arquivo escolhido serve? Confere tipo e tamanho ANTES de subir. */
export function conferirArquivo(file) {
  if (!file) return { ok: false, recado: 'Escolha um arquivo de vídeo.' };
  if (!TIPOS_ACEITOS.includes(file.type)) {
    return { ok: false, recado: 'Formato não aceito. Use MP4, WebM ou MOV.' };
  }
  if (file.size > TETO_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(0);
    return { ok: false, recado: `O vídeo tem ${mb} MB e o limite é 45 MB. Corte um pedaço ou reduza a qualidade.` };
  }
  return { ok: true, recado: '' };
}

/**
 * A lista limpa que vai pro banco: só o que é válido, sem repetido, na ordem.
 * Usada na gravação — a tela nunca manda direto o que a pessoa digitou.
 */
export function videosValidos(lista) {
  const vistos = new Set();
  const out = [];
  for (const item of Array.isArray(lista) ? lista : []) {
    const r = entenderVideo(item);
    if (!r.ok || vistos.has(r.url)) continue;
    vistos.add(r.url);
    out.push(r.url);
  }
  return out;
}

/** O primeiro vídeo tocável do produto, já entendido. `null` se não houver. */
export function videoDoProduto(produto) {
  for (const item of Array.isArray(produto?.video_urls) ? produto.video_urls : []) {
    const r = entenderVideo(item);
    if (r.ok) return r;
  }
  return null;
}
