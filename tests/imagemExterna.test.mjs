// "irmão, tá aparecendo lavajato kkk em torneira"
//
// 02/09/2026: a Loja Virtual mostrava foto de um LAVAJATO na "Torneira Gourmet".
// E o "TDS medidor pureza água", no card ao lado, mostrava O MESMO lavajato.
// Dois produtos diferentes com a mesma imagem errada — o que só acontece quando
// quem serve a foto é um TERCEIRO que trocou o conteúdo.
//
// A primeira foto dos dois estava em `i.zst.com.br`, um comparador de preços.
// Retrato daquele dia na loja: 513 fotos no nosso servidor (271 produtos) e
// 61 fotos hospedadas fora, sendo a CAPA de 25 produtos.
//
// A causa: `extractMLImages` e `extractGoogleShoppingImages` gravavam o endereço
// de fora direto em `image_urls`. Nada copiava a imagem para cá.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ehExterna, separarFotos, NOSSO_HOST } from '../src/lib/imagemExterna.js';
import { urlSeguraParaBuscar, extensaoDoTipo, nomeDoArquivo } from '../api/_lib/imagemExterna.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const NOSSA = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/uploads/1787694961196_torneira.webp';
const LAVAJATO = 'https://i.zst.com.br/thumbs/51/5/15/-1634891403.jpg';

// ─────────────── reconhecer foto que não é nossa ───────────────

test('reconhece a foto emprestada que virou lavajato', () => {
  assert.equal(ehExterna(LAVAJATO), true);
  assert.equal(ehExterna('https://encrypted-tbn0.gstatic.com/images?q=abc'), true);
  assert.equal(ehExterna('https://http2.mlstatic.com/D_NQ_NP_2X_1.webp'), true);
  assert.equal(ehExterna('https://assets.rediredi.com/x.jpg'), true);
});

test('a nossa foto não é confundida com a de fora', () => {
  assert.equal(ehExterna(NOSSA), false);
  assert.equal(NOSSO_HOST, 'supabase.co');
  assert.equal(ehExterna('/uploads/foto.jpg'), false);   // caminho nosso
  assert.equal(ehExterna('data:image/png;base64,AAA'), false);
  assert.equal(ehExterna('blob:http://x/y'), false);
});

test('lixo não vira "foto de fora"', () => {
  for (const v of ['', '   ', null, undefined, 'nao-e-url', 42, {}]) {
    assert.equal(ehExterna(v), false, `passou: ${JSON.stringify(v)}`);
  }
});

test('separa as nossas das de fora sem perder a ordem', () => {
  // O caso real da Torneira Gourmet: a de FORA estava em primeiro, e é a
  // primeira que o card da loja mostra. As duas certas estavam escondidas atrás.
  const { nossas, externas } = separarFotos([LAVAJATO, NOSSA, NOSSA + '2']);
  assert.deepEqual(nossas, [NOSSA, NOSSA + '2']);
  assert.deepEqual(externas, [LAVAJATO]);
  assert.deepEqual(separarFotos([]), { nossas: [], externas: [] });
  assert.deepEqual(separarFotos(null), { nossas: [], externas: [] });
  assert.deepEqual(separarFotos(['', '  ', NOSSA]).nossas, [NOSSA]);
});

// ─────────────── a rota busca no servidor: não pode virar porta ───────────────

test('o servidor recusa endereço interno (SSRF)', () => {
  // Esta rota recebe um endereço e o SERVIDOR vai buscá-lo. Sem trava, viraria
  // um jeito de fazer nosso servidor bater na infraestrutura interna.
  for (const u of [
    'http://localhost/admin', 'http://127.0.0.1:8080/', 'http://0.0.0.0/',
    'http://10.0.0.5/', 'http://192.168.1.1/', 'http://169.254.169.254/latest/meta-data/',
    'http://172.16.0.1/', 'http://172.31.255.1/', 'http://[::1]/',
  ]) {
    assert.equal(urlSeguraParaBuscar(u).ok, false, `deixou passar: ${u}`);
  }
});

test('o servidor recusa protocolo que não seja http/https', () => {
  for (const u of ['file:///etc/passwd', 'ftp://x.com/a.jpg', 'gopher://x/', 'data:image/png;base64,AA']) {
    assert.equal(urlSeguraParaBuscar(u).ok, false, `deixou passar: ${u}`);
  }
});

test('endereço público de verdade passa', () => {
  assert.equal(urlSeguraParaBuscar(LAVAJATO).ok, true);
  assert.equal(urlSeguraParaBuscar('https://http2.mlstatic.com/a.webp').ok, true);
});

test('vazio e lixo são recusados com motivo, sem explodir', () => {
  assert.equal(urlSeguraParaBuscar('').motivo, 'vazia');
  assert.equal(urlSeguraParaBuscar('%%%').ok, false);
  assert.doesNotThrow(() => urlSeguraParaBuscar(null));
  assert.doesNotThrow(() => urlSeguraParaBuscar(undefined));
});

// ─────────────── só imagem de verdade entra ───────────────

test('página de erro em HTML NÃO vira foto do produto', () => {
  // Sem isto, um 404 que devolve HTML com status 200 viraria "imagem".
  assert.equal(extensaoDoTipo('text/html'), null);
  assert.equal(extensaoDoTipo('application/json'), null);
  assert.equal(extensaoDoTipo(''), null);
  assert.equal(extensaoDoTipo(null), null);
  assert.equal(extensaoDoTipo('image/svg+xml'), null);  // svg carrega script
});

test('os tipos de imagem que aceitamos', () => {
  assert.equal(extensaoDoTipo('image/jpeg'), 'jpg');
  assert.equal(extensaoDoTipo('image/png; charset=binary'), 'png');
  assert.equal(extensaoDoTipo('IMAGE/WEBP'), 'webp');
  assert.equal(extensaoDoTipo('image/avif'), 'avif');
});

test('o nome do arquivo sai limpo, sem acento nem caractere estranho', () => {
  const n = nomeDoArquivo('Torneira Gourmet Cozinha / Bancada 40cm — Ação!', 0, 'jpg');
  assert.match(n, /^\d+_0_[a-z0-9-]+\.jpg$/, `nome sujo: ${n}`);
  assert.ok(!/[^\x20-\x7E]/.test(n), 'sobrou caractere não-ASCII');
  assert.match(nomeDoArquivo('', 1, 'png'), /_1_produto\.png$/);
  assert.match(nomeDoArquivo(null, 2, 'webp'), /_2_produto\.webp$/);
  // dois produtos diferentes não colidem no mesmo arquivo
  assert.notEqual(nomeDoArquivo('A', 0, 'jpg'), nomeDoArquivo('B', 0, 'jpg'));
});

// ─────────────── a ligação: a tela e a rota ───────────────

const tela = ler('../src/pages/AddCatalogProduct.jsx');
const rota = ler('../api/functions/copiarImagensParaNosso.js');

test('os TRÊS caminhos de importação copiam antes de salvar', () => {
  // Eram três pontos gravando endereço de fora: fotos já vindas do Google
  // Shopping, importação do Mercado Livre, e busca por nome.
  const chamadas = tela.match(/await trazerParaNosso\(/g) || [];
  assert.equal(chamadas.length, 3, `só ${chamadas.length} dos 3 caminhos copiam`);
});

test('nenhum caminho grava o endereço de fora direto', () => {
  for (const antigo of [
    'image_urls: mlImgs.slice(0, 5)',
    'image_urls: imgs }',
    'image_urls: existingImages }',
  ]) {
    assert.ok(!tela.includes(antigo), `voltou a gravar direto: ${antigo}`);
  }
});

test('cópia que falha NÃO guarda o endereço de fora', () => {
  // Guardar o link "porque a cópia falhou" é exatamente o bug de volta.
  assert.match(tela, /return \{ fotos: nossas, falharam: externas\.length \}/);
  assert.match(tela, /falharam\s*\?/);   // e a tela avisa quem está cadastrando
});

test('a rota fica em api/_lib, não importa de src/', () => {
  // Nenhuma rota deste projeto importa de `src/`, e o vercel.json não configura
  // isso: import de dois níveis já derrubou função em produção aqui.
  assert.match(rota, /from '\.\.\/_lib\/imagemExterna\.js'/);
  assert.ok(!/from '\.\.\/\.\.\/src\//.test(rota), 'a rota voltou a importar de src/');
});

test('a rota exige sessão e tem teto de tamanho e de tempo', () => {
  assert.match(rota, /exigirSessao\(req, actorId, 'copiarImagensParaNosso'\)/);
  assert.match(rota, /MAX_BYTES\s*=/);
  assert.match(rota, /TIMEOUT_MS\s*=/);
  assert.match(rota, /AbortController/);
  // content-length pode mentir: confere o tamanho real também
  assert.match(rota, /bytes\.length > MAX_BYTES/);
});
