/**
 * Dublê de `@/lib/videoDoProduto` — só para a banca.
 *
 * 🔴 POR QUE ELE EXISTE, E POR QUE NÃO É AFROUXAR A REGRA.
 *
 * A régua de produção (`ehVideoNosso`) exige endereço `https` no NOSSO host e
 * no balde de vídeos. É ela que impede um endereço qualquer colado no cadastro
 * de virar player na vitrine, e ela fica intacta.
 *
 * Só que o vídeo do PS5 mora no Supabase, e o contêiner da banca não alcança
 * `supabase.co`. Sem vídeo carregando, a banca não tem como provar a ÚNICA
 * coisa que o dono reclamou em 20/09: "parece uma imagem até passar o mouse".
 * E provar atributo não serve — `autoplay` é um pedido, e o defeito era o
 * pedido não virar reprodução.
 *
 * Então a banca serve um arquivo próprio de 8 KB, e este dublê ensina a régua a
 * aceitá-lo ALÉM do que ela já aceita: a real é consultada primeiro e manda em
 * tudo que ela reconhece. O que muda aqui é o alcance do teste, não a regra —
 * a régua de verdade continua provada em `tests/` sem navegador.
 */
import { videoDoProduto as reguaReal } from '../../../src/lib/videoDoProduto.js';

export function videoDoProduto(produto) {
  const daReal = reguaReal(produto);
  if (daReal) return daReal;
  const local = (Array.isArray(produto?.video_urls) ? produto.video_urls : [])
    .find((u) => typeof u === 'string' && /\.(mp4|webm)$/.test(u));
  return local ? { ok: true, url: local, tipo: 'arquivo', embed: local } : null;
}
