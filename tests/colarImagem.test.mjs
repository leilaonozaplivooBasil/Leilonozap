// Colar imagem no quadro dos sonhos (06/09/2026): o que a área de
// transferência traz vira arquivo pro MESMO upload de sempre; endereço
// colado vira URL; e o botão lê pela Async Clipboard API.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arquivosDoColar, urlDoColar, lerImagensDaAreaDeTransferencia } from '../src/lib/colarImagem.js';

const arquivo = (type, name = 'x') => ({ type, name });

test('arquivosDoColar: pega só imagens de `files`, sem repetir', () => {
  const png = arquivo('image/png');
  const pdf = arquivo('application/pdf');
  assert.deepEqual(arquivosDoColar({ files: [png, pdf, png] }), [png]);
});

test('arquivosDoColar: navegador que só preenche `items` (kind file) também serve', () => {
  const jpg = arquivo('image/jpeg');
  const cd = { files: [], items: [{ kind: 'string', type: 'text/plain' }, { kind: 'file', type: 'image/jpeg', getAsFile: () => jpg }] };
  assert.deepEqual(arquivosDoColar(cd), [jpg]);
});

test('arquivosDoColar: mesma imagem em `files` e em `items` conta uma vez; sem clipboardData é vazio', () => {
  const png = arquivo('image/png');
  assert.deepEqual(arquivosDoColar({ files: [png], items: [{ kind: 'file', type: 'image/png', getAsFile: () => png }] }), [png]);
  assert.deepEqual(arquivosDoColar(null), []);
});

test('urlDoColar: endereço http(s) colado como texto; qualquer outra coisa é null', () => {
  const cd = (t) => ({ getData: () => t });
  assert.equal(urlDoColar(cd(' https://site.com/foto.jpg ')), 'https://site.com/foto.jpg');
  assert.equal(urlDoColar(cd('BMW X6 preta')), null);
  assert.equal(urlDoColar(cd('https://a.com/x b')), null);
  assert.equal(urlDoColar(null), null);
});

test('lerImagensDaAreaDeTransferencia: item com imagem vira File com nome e tipo; texto puro é ignorado', async () => {
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
  const clipboard = {
    read: async () => [
      { types: ['text/plain'], getType: async () => new Blob(['oi']) },
      { types: ['text/html', 'image/webp'], getType: async (t) => (t === 'image/webp' ? blob : null) },
    ],
  };
  const lista = await lerImagensDaAreaDeTransferencia(clipboard);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].type, 'image/webp');
  assert.match(lista[0].name, /^colada-\d+\.webp$/);
  assert.equal(lista[0].size, 3);
});

test('lerImagensDaAreaDeTransferencia: sem a API o erro é "sem_api" (quem chama explica pra pessoa)', async () => {
  await assert.rejects(() => lerImagensDaAreaDeTransferencia({}), /sem_api/);
  await assert.rejects(() => lerImagensDaAreaDeTransferencia(undefined), /sem_api/);
});
