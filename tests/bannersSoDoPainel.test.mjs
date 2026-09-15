// 🖼️ 15/09/2026 — Ordem do dono, ao pé da letra: "todas as páginas que usam os
// banners devem receber esses 3 novos e ter APENAS eles como banners".
//
// O que quebrava antes: a Loja Virtual tinha uma lista de banners escrita no
// próprio código (4 artes empacotadas + 3 vídeos institucionais) que ganhava da
// prop `banners` vinda do Painel de Mídia. O dono subiu as artes novas e a loja
// continuou mostrando as velhas. A Home mostrava só a PRIMEIRA arte (`slice(0,1)`)
// e ainda intercalava os mesmos 3 vídeos.
//
// Estes testes existem para que ninguém reponha uma lista fixa sem perceber.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizarBannersPorDispositivo, prepararBannersDoPainel } from '../src/lib/bannersDoPainel.js';

// Só o CÓDIGO conta. Os comentários destes arquivos citam de propósito o que foi
// removido (`.slice(0, 1)`, `interleaveBanners`, os vídeos) para explicar o porquê —
// e sem isto o próprio comentário reprovaria o teste.
function semComentarios(fonte) {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')   // bloco  /* ... */  (inclui os {/* ... */} do JSX)
    .replace(/^\s*\/\/.*$/gm, '');        // linha inteira que começa com //
}

const ler = (caminho) => semComentarios(readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8'));

const LOJA = ler('src/components/loja/LojaShopeeHeader.jsx');
const HOME = ler('src/pages/Home.jsx');
const ABA_CATALOGO = ler('src/components/licensing/CatalogTabComponent.jsx');
const CATALOGO = ler('src/pages/Catalog.jsx');
const LUXO = ler('src/pages/LuxuryCollection.jsx');

test('a Loja Virtual não carrega mais nenhuma arte empacotada no código', () => {
  assert.ok(!/from '@\/assets\/banners\//.test(LOJA), 'voltou import de @/assets/banners');
  assert.ok(!/CATALOG_BANNERS/.test(LOJA), 'voltou a constante CATALOG_BANNERS');
  assert.ok(!/IMAGE_CATALOG_BANNERS|VIDEO_CATALOG_BANNERS/.test(LOJA));
});

test('a moldura da loja renderiza a prop `banners`, que vem do Painel de Mídia', () => {
  assert.match(LOJA, /<RotatingBanner banners=\{banners\}/);
  // e some quando não há banner cadastrado, em vez de deixar uma faixa preta
  assert.match(LOJA, /\{!modoBusca && banners\.length > 0 && \(/);
});

test('nenhum vídeo institucional entra mais no carrossel de banners', () => {
  for (const [nome, fonte] of [['loja', LOJA], ['home', HOME]]) {
    assert.ok(!/video_url:\s*'\/midia\//.test(fonte), `${nome} ainda injeta vídeo no carrossel`);
    assert.ok(!/interleaveBanners/.test(fonte), `${nome} ainda intercala vídeo`);
  }
});

test('a Home mostra TODAS as artes do painel, não só a primeira', () => {
  const trecho = HOME.slice(HOME.indexOf("context: 'home'"), HOME.indexOf("context: 'home'") + 900);
  assert.ok(!/\.slice\(0,\s*1\)/.test(trecho), 'voltou o corte que escondia as outras artes');
  assert.match(trecho, /prepararBannersDoPainel\(bannerData\)/);
});

test('aba Catálogo do Licenciado lê o mesmo contexto da loja pública', () => {
  assert.match(ABA_CATALOGO, /context: 'catalog'/);
  assert.match(ABA_CATALOGO, /<RotatingBanner banners=\{banners\}/);
});

test('as quatro telas passam pelo mesmo preparo antes de renderizar', () => {
  for (const [nome, fonte] of [['home', HOME], ['catalog', CATALOGO], ['luxo', LUXO], ['aba', ABA_CATALOGO]]) {
    assert.match(fonte, /prepararBannersDoPainel/, `${nome} não normaliza os banners do painel`);
  }
});

test('o catálogo não atrasa mais o banner de propósito', () => {
  // era `setTimeout(..., 1500)` em volta do fetch — com o hero vindo do banco,
  // atrasar significa faixa vazia no primeiro segundo de toda visita.
  const trecho = CATALOGO.slice(CATALOGO.indexOf('catalog_banners_cache'), CATALOGO.indexOf('catalog_banners_cache') + 1400);
  assert.ok(!/setTimeout\(/.test(trecho), 'voltou o atraso artificial no carregamento do banner');
});

// ——— normalizador ———

test('coluna Mobile vazia: a arte de desktop passa a servir os dois', () => {
  const saida = normalizarBannersPorDispositivo([
    { id: 'a', device_type: 'desktop' },
    { id: 'b', device_type: 'desktop' },
  ]);
  assert.deepEqual(saida.map((b) => b.device_type), ['any', 'any']);
});

test('as duas colunas preenchidas: cada dispositivo continua com a sua arte', () => {
  const entrada = [
    { id: 'a', device_type: 'desktop' },
    { id: 'b', device_type: 'mobile' },
  ];
  assert.deepEqual(normalizarBannersPorDispositivo(entrada).map((b) => b.device_type), ['desktop', 'mobile']);
});

test('banner sem device_type conta como desktop (é o padrão do carrossel)', () => {
  const saida = normalizarBannersPorDispositivo([{ id: 'a' }]);
  assert.equal(saida[0].device_type, 'any');
});

test('só mobile cadastrado: o desktop também recebe a arte', () => {
  const saida = normalizarBannersPorDispositivo([{ id: 'a', device_type: 'mobile' }]);
  assert.equal(saida[0].device_type, 'any');
});

test('já marcado como `any` não é mexido', () => {
  const entrada = [{ id: 'a', device_type: 'any' }];
  assert.deepEqual(normalizarBannersPorDispositivo(entrada), entrada);
});

test('lista vazia, nula ou com buraco não explode', () => {
  assert.deepEqual(normalizarBannersPorDispositivo([]), []);
  assert.deepEqual(normalizarBannersPorDispositivo(null), []);
  assert.deepEqual(normalizarBannersPorDispositivo(undefined), []);
  assert.deepEqual(prepararBannersDoPainel([null, undefined]), []);
});

test('a ordem é a do painel — quem o dono põe em 1º é o principal', () => {
  const saida = prepararBannersDoPainel([
    { id: 'licenciado', order: 3, device_type: 'desktop' },
    { id: 'ps5', order: 1, device_type: 'desktop' },
    { id: 'vendedor', order: 2, device_type: 'desktop' },
  ]);
  assert.deepEqual(saida.map((b) => b.id), ['ps5', 'vendedor', 'licenciado']);
});

test('banner sem `order` vai para o começo, não some da lista', () => {
  const saida = prepararBannersDoPainel([
    { id: 'com-ordem', order: 5, device_type: 'desktop' },
    { id: 'sem-ordem', device_type: 'desktop' },
  ]);
  assert.deepEqual(saida.map((b) => b.id), ['sem-ordem', 'com-ordem']);
});

test('preparar não muda a lista original (o cache da sessão é reaproveitado)', () => {
  const original = [{ id: 'a', order: 2, device_type: 'desktop' }, { id: 'b', order: 1, device_type: 'desktop' }];
  const copia = JSON.parse(JSON.stringify(original));
  prepararBannersDoPainel(original);
  assert.deepEqual(original, copia);
});
