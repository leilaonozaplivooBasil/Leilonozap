// conexao — prova real de conexão (DIR-35): offline nunca se declara pelo
// palpite do navegador, só quando a busca no próprio domínio falha de verdade.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { provarConexao, URL_PROVA_CONEXAO } from '../src/lib/conexao.js';

describe('provarConexao', () => {
  test('rede respondeu (qualquer status) → online', async () => {
    const chamadas = [];
    const fetchOk = async (url, opts) => { chamadas.push([url, opts]); return { ok: false, status: 404 }; };
    assert.equal(await provarConexao(fetchOk), true); // até 404 prova que a REDE está viva
    const [url, opts] = chamadas[0];
    assert.ok(url.startsWith(`${URL_PROVA_CONEXAO}?t=`)); // cache-buster obrigatório
    assert.equal(opts.cache, 'no-store'); // nunca aceitar cópia de cache como prova
  });

  test('busca estourou → offline de verdade', async () => {
    const fetchMorto = async () => { throw new TypeError('Failed to fetch'); };
    assert.equal(await provarConexao(fetchMorto), false);
  });

  test('a prova é no PRÓPRIO domínio — caminho relativo, sem depender de outro site', () => {
    assert.ok(URL_PROVA_CONEXAO.startsWith('/'));
    assert.ok(!URL_PROVA_CONEXAO.includes('http'));
  });
});
