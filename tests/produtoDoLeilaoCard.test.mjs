// 📦 DIR-207 — PRODUTO, MEDIDAS E VÍDEO NO EDITOR DO LEILÃO (08/10/2026)
//
// Dono: "inseri vídeo que não está disponível quando clico no botão editar".
// O editor gravava SÓ em auctions; vídeo, medidas e peso vivem em products.
// Estes testes leem o código como texto e garantem que:
//   • o card existe e usa a régua única (medidasDoProduto) e o MESMO CampoDeVideo
//     da gestão, e que toda foto de fora passa por trazerFotosParaNosso;
//   • as rotas são chamadas pelo nome certo, com acao 'ler' e 'salvar', e o card
//     NUNCA manda preço;
//   • o editor renderiza o card, grava o pendente ANTES de Auction.update, a
//     cópia (handleDuplicate) leva product_id, o buscador de fotos copia antes
//     de somar, e a descrição por IA é SÓ por clique (nunca useEffect);
//   • o updatePayload de auctions não leva peso/altura — a tabela não tem essas
//     colunas e o entityWrite as removeria em silêncio.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const leia = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const CARD = semComentarios(leia('src/components/auction/ProdutoDoLeilaoCard.jsx'));
const EDITOR = semComentarios(leia('src/pages/EditAuction.jsx'));

test('o card existe e usa a régua única, o CampoDeVideo da gestão e a cópia de fotos', () => {
  assert.match(CARD, /from '@\/lib\/medidasDoProduto'/);
  for (const fn of ['normalizarMedidas', 'caixaDoFrete', 'resumoDaCaixa', 'ORIGENS_MEDIDA']) {
    assert.ok(CARD.includes(`${fn}(`) || CARD.includes(`${fn}[`), `card usa ${fn}`);
  }
  assert.match(CARD, /import CampoDeVideo from '@\/components\/catalog\/CampoDeVideo'/);
  assert.match(CARD, /<CampoDeVideo valor=\{videoUrls\} aoMudar=\{mudarVideo\} claro=\{false\} \/>/);
  assert.match(CARD, /import \{ trazerFotosParaNosso \} from '@\/lib\/fotosParaNosso'/);
  assert.match(CARD, /await trazerFotosParaNosso\(novas, titulo\)/);
  // vídeo passa pela mesma peneira da gestão antes de ir ao servidor
  assert.match(CARD, /video_urls: videosValidos\(videoUrls\)/);
  // os pontos que a tela marca para os testes de navegador
  for (const t of ['medidas-do-leilao', 'frete-caixa', 'video-do-leilao', 'importar-pelo-link']) {
    assert.ok(CARD.includes(`data-teste="${t}"`), `data-teste ${t}`);
  }
  // a linha do frete avisa quando está chutando
  assert.match(CARD, /O frete vai cotar com: \{resumoDaCaixa\(caixa\)\}/);
  assert.match(CARD, /caixa padrão: o frete está chutando/);
  assert.match(CARD, /caixa\.padrao \? 'text-rose-400' : 'text-emerald-400'/);
});

test('rotas chamadas pelo nome certo, com acao ler/salvar, e o card nunca envia preço', () => {
  assert.match(CARD, /plataforma\.functions\.invoke\('salvarProdutoDoLeilao', \{ actor_id: quemSouEu\(\), auction_id: auctionId, acao: 'ler' \}\)/);
  assert.match(CARD, /plataforma\.functions\.invoke\('salvarProdutoDoLeilao', \{[\s\S]*?acao: 'salvar',[\s\S]*?medidas: valores,[\s\S]*?medidas_origem: origemX \|\| 'manual',[\s\S]*?video_urls: videosValidos\(videoUrls\),[\s\S]*?\}\)/);
  assert.match(CARD, /plataforma\.functions\.invoke\('importarProdutoPeloLink', \{ actor_id: quemSouEu\(\), url: u, titulo \}\)/);
  // plano B quando a rota falha: lê o produto direto (como useVideoDoLote)
  assert.match(CARD, /plataforma\.entities\.Product\.filter\(\{ id: productIdRef\.current \}\)/);
  // NUNCA toca em preço
  assert.ok(!/price|preco:|preço:|starting_price|current_price|buy_now/i.test(CARD.replace(/O preço do leilão não é tocado/, '')), 'card não manda preço');
  // a origem acompanha a fonte da importação; digitar à mão vira manual
  assert.match(CARD, /setOrigem\(resultado\.fonte === 'pagina' \? 'pagina' : 'estimativa_ia'\)/);
  assert.match(CARD, /setOrigem\('manual'\)/);
  // ref para o pai: salvarSePendente nunca rejeita e devolve {ok, erro}
  assert.match(CARD, /useImperativeHandle\(ref, \(\) => \(\{\s*salvarSePendente: async \(\) => \{\s*if \(!pendente\) return \{ ok: true \};/);
  assert.match(CARD, /onProdutoVinculado\?\.\(d\.product_id\)/);
});

test('o editor importa e renderiza o card logo depois das fotos, e grava o pendente ANTES de Auction.update', () => {
  assert.match(EDITOR, /import ProdutoDoLeilaoCard from '@\/components\/auction\/ProdutoDoLeilaoCard'/);
  assert.match(EDITOR, /<ProdutoDoLeilaoCard\s+ref=\{produtoRef\}/);
  // vem depois do card "Fotos do Leilão" e antes de "Detalhes do Leilão", na coluna da esquerda
  const fotos = EDITOR.indexOf('Fotos do Leilão');
  const card = EDITOR.indexOf('<ProdutoDoLeilaoCard');
  const detalhes = EDITOR.indexOf('Detalhes do Leilão');
  assert.ok(fotos > 0 && fotos < card && card < detalhes, 'card entre Fotos e Detalhes');
  // o pendente é gravado antes do leilão e NUNCA bloqueia o salvar
  const salvar = EDITOR.indexOf("const p = await produtoRef.current?.salvarSePendente();");
  const update = EDITOR.indexOf('await Auction.update(auctionId, updatePayload);');
  assert.ok(salvar > 0 && update > salvar, 'salvarSePendente vem antes de Auction.update');
  assert.match(EDITOR, /if \(p && !p\.ok\) notify\.aviso\('Medidas\/vídeo não salvos', p\.erro\);/);
  // callbacks do card
  assert.match(EDITOR, /onDescricao=\{aplicarDescricaoImportada\}/);
  assert.match(EDITOR, /onFotos=\{somarFotosImportadas\}/);
  assert.match(EDITOR, /onProdutoVinculado=\{\(productId\) => setAuction\(\(a\) => \(\{ \.\.\.a, product_id: productId \}\)\)\}/);
  // fotos importadas somam sem duplicar
  assert.match(EDITOR, /setImageUrls\(\(prev\) => \[\.\.\.prev, \.\.\.lista\.filter\(\(u\) => !prev\.includes\(u\)\)\]\)/);
});

test('handleDuplicate leva product_id e o BuscadorFotos passa por trazerFotosParaNosso', () => {
  const dup = EDITOR.slice(EDITOR.indexOf('const handleDuplicate'), EDITOR.indexOf("notify.ok('Leilão duplicado'"));
  assert.match(dup, /product_id: auction\?\.product_id \|\| null/);
  assert.match(EDITOR, /import \{ trazerFotosParaNosso \} from '@\/lib\/fotosParaNosso'/);
  const buscador = EDITOR.slice(EDITOR.indexOf('<BuscadorFotos'), EDITOR.indexOf('/>', EDITOR.indexOf('<BuscadorFotos')));
  assert.match(buscador, /onSelect=\{async \(urls\) => \{/);
  assert.match(buscador, /await trazerFotosParaNosso\(urls, formData\.title\)/);
  assert.match(buscador, /fotos\.filter\(\(u\) => !prev\.includes\(u\)\)/);
  assert.match(buscador, /foto\(s\) não puderam ser copiadas/);
});

test('descrição por IA existe SÓ por clique: nenhum useEffect gera descrição', () => {
  assert.match(EDITOR, /Gerar descrição com IA/);
  assert.match(EDITOR, /onClick=\{gerarDescricaoComIA\}/);
  // a função é definida uma vez e usada uma vez (no onClick) — nunca num efeito
  assert.equal((EDITOR.match(/gerarDescricaoComIA/g) || []).length, 2);
  assert.equal((EDITOR.match(/InvokeLLM\(/g) || []).length, 1);
  // nenhum useEffect do editor contém InvokeLLM nem a geração
  const efeitos = EDITOR.split('useEffect(').slice(1);
  for (const corpo of efeitos) {
    const trecho = corpo.slice(0, corpo.indexOf('}, ['));
    assert.ok(!/InvokeLLM|gerarDescricaoComIA|autoGenerate/.test(trecho), 'useEffect não gera descrição');
  }
  assert.ok(!EDITOR.includes('DescriptionWithAI'), 'não reutiliza DescriptionWithAI (useEffect destrutivo)');
  // a resposta passa pela guarda do PONTO 74 e o prompt pede texto sem HTML
  assert.match(EDITOR, /const texto = textoDaIA\(resposta\);/);
  assert.match(EDITOR, /SEM HTML/);
  // confirmação antes de substituir descrição existente (pelo modal da página)
  const ia = EDITOR.slice(EDITOR.indexOf('const gerarDescricaoComIA'), EDITOR.indexOf('const handleSupplierLogoUpload'));
  assert.match(ia, /Substituir a descrição atual pela da IA\?/);
});

test('o updatePayload de auctions não leva peso/altura/largura/comprimento nem vídeo', () => {
  const ini = EDITOR.indexOf('const updatePayload = {');
  const fim = EDITOR.indexOf('await Auction.update(auctionId, updatePayload);');
  assert.ok(ini > 0 && fim > ini);
  const payload = EDITOR.slice(ini, fim);
  assert.ok(!/\b(peso|altura|largura|comprimento|video_urls|medidas_origem)\b/.test(payload), 'auctions não tem essas colunas');
  // e o formData (que é espalhado no payload) também não ganhou esses campos
  const form = EDITOR.slice(EDITOR.indexOf('const [formData, setFormData] = useState({'), EDITOR.indexOf('const [imageUrls, setImageUrls]'));
  assert.ok(!/\b(peso|altura|largura|comprimento|video_urls)\b/.test(form), 'formData sem campos de products');
});

test('o botão de 1 clique puxa as medidas pelo link (ou estima pelo nome) e GRAVA na hora, com a origem certa', () => {
  const C = CARD;
  assert.ok(C.includes('data-teste="atualizar-medidas-um-clique"'));
  assert.ok(C.includes("const u = (urlImport || produto?.source_url || auction?.source_url || '').trim();"), 'link colado, do produto ou do leilão');
  assert.ok(C.includes("const nova = d.fonte === 'pagina' ? 'pagina' : 'estimativa_ia';"));
  assert.ok(C.includes('const g = await gravar(novos, nova);'), 'grava o que acabou de importar, sem esperar o estado');
  assert.ok(C.includes("setAvisosServidor(['As medidas vieram fora da faixa e NÃO foram gravadas: confira e salve.', ...avisos]);"));
  assert.ok(C.includes('const salvar = useCallback(() => gravar(campos, origem), [gravar, campos, origem]);'));
});
