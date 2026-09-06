// 📋 COLAR IMAGEM — o que a área de transferência traz, em arquivos.
//
// Ordem do dono (06/09/2026), no "Adicionar ao quadro dos sonhos": "quero
// mais uma forma: copiar e colar a imagem. Aceitar isso no celular fica
// ainda mais foda". Duas portas, as duas caindo no MESMO upload de sempre:
//   • o evento `paste` (Ctrl+V no computador; "Colar" do menu do dedo no
//     celular) — `clipboardData.files` traz a imagem copiada; quando o que
//     foi copiado é um ENDEREÇO de imagem, vira a URL colada de sempre;
//   • o botão "Colar imagem" — `navigator.clipboard.read()` (Chrome no
//     Android, Safari no iPhone com a permissão) devolve os itens da área de
//     transferência; os que forem imagem viram File.
// Só regra de conteúdo aqui, nada de tela: dá pra testar no node.

const EH_IMAGEM = (tipo) => typeof tipo === 'string' && tipo.startsWith('image/');
const EXTENSAO = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/bmp': 'bmp', 'image/svg+xml': 'svg' };

/** Arquivos de imagem de um `clipboardData` (evento paste ou drop). */
export function arquivosDoColar(clipboardData) {
  if (!clipboardData) return [];
  const vistos = new Set();
  const lista = [];
  const guardar = (f) => { if (f && EH_IMAGEM(f.type) && !vistos.has(f)) { vistos.add(f); lista.push(f); } };
  for (const f of Array.from(clipboardData.files || [])) guardar(f);
  // alguns navegadores só preenchem `items` (kind: 'file')
  for (const item of Array.from(clipboardData.items || [])) {
    if (item.kind === 'file' && EH_IMAGEM(item.type)) guardar(item.getAsFile?.());
  }
  return lista;
}

/** Um endereço http(s) de imagem colado como texto — ou null. */
export function urlDoColar(clipboardData) {
  const texto = String(clipboardData?.getData?.('text/plain') || '').trim();
  if (!/^https?:\/\/\S+$/i.test(texto)) return null;
  return texto;
}

/**
 * Lê a área de transferência pelo botão (Async Clipboard API). Devolve os
 * arquivos de imagem; `[]` quando não há imagem; lança quando o navegador
 * não deixa (sem permissão / API ausente) — quem chama decide o que dizer.
 */
export async function lerImagensDaAreaDeTransferencia(clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard?.read) throw new Error('sem_api');
  const itens = await clipboard.read();
  const arquivos = [];
  for (const item of itens || []) {
    const tipo = (item.types || []).find(EH_IMAGEM);
    if (!tipo) continue;
    const blob = await item.getType(tipo);
    const nome = `colada-${Date.now()}.${EXTENSAO[tipo] || 'png'}`;
    arquivos.push(typeof File === 'function' ? new File([blob], nome, { type: tipo }) : Object.assign(blob, { name: nome }));
  }
  return arquivos;
}
