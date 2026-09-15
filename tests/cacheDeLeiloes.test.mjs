// 06/09/2026 — 33 leilões foram reativados no banco e a página continuou dizendo "6 rolando".
// O banco estava certo; o navegador servia dado velho.
//
// A Home guardava a lista em dois depósitos e só um tinha prazo:
//
//   sessionStorage.auctions_cache          → conferido por idade, com DOIS números diferentes
//                                            para a MESMA chave (300000 na montagem do state,
//                                            120000 dentro do loadAuctions)
//   localStorage.auctions_cache_persistent → SEM nenhuma conferência de idade
//
// O persistente era lido na montagem, sem perguntar de quando era, e gravado a cada busca
// bem-sucedida. Lista de semanas atrás era a primeira coisa que o visitante via. E o
// `?fresh=1`, que existe para forçar dado novo, limpava só o sessionStorage — o persistente
// sobrevivia e repintava a tela velha.
//
// Estes testes rodam as funções de verdade, com depósitos falsos.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  lerCache, lerCacheDeEmergencia, gravarCache, limparCache, cacheDaSessaoEstaFresco,
  semDuplicados, VALIDADE_SESSAO_MS, VALIDADE_PERSISTENTE_MS,
  CHAVE_SESSAO, CHAVE_SESSAO_HORA, CHAVE_PERSISTENTE, CHAVE_PERSISTENTE_HORA,
} from '../src/lib/cacheDeLeiloes.js';

// sessionStorage/localStorage de mentira — a mesma API que o navegador expõe.
function deposito(inicial = {}) {
  const dados = { ...inicial };
  return {
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
    removeItem: (k) => { delete dados[k]; },
    _dados: dados,
  };
}

const AGORA = 1788700000000;
const SEIS = [1, 2, 3, 4, 5, 6].map((n) => ({ id: `velho-${n}`, title: `Leilão velho ${n}` }));
const TRINTA_E_NOVE = Array.from({ length: 39 }, (_, i) => ({ id: `novo-${i}`, title: `Leilão ${i}` }));

describe('cache persistente — o que fez a página mostrar 6 com 39 no banco', () => {
  test('🔴 o bug: lista de ontem no localStorage não pode pintar a tela', () => {
    const local = deposito({
      [CHAVE_PERSISTENTE]: JSON.stringify(SEIS),
      [CHAVE_PERSISTENTE_HORA]: String(AGORA - 24 * 60 * 60 * 1000), // 24h atrás
    });
    const lido = lerCache({ agora: AGORA, sessao: deposito(), local });
    assert.deepEqual(lido, [], 'cache vencido voltou a pintar a vitrine');
  });

  test('cache persistente SEM marca de hora (gravado antes desta regra) também não pinta', () => {
    const local = deposito({ [CHAVE_PERSISTENTE]: JSON.stringify(SEIS) });
    assert.deepEqual(lerCache({ agora: AGORA, sessao: deposito(), local }), []);
  });

  test('dentro do prazo ele serve — é para isso que existe', () => {
    const local = deposito({
      [CHAVE_PERSISTENTE]: JSON.stringify(SEIS),
      [CHAVE_PERSISTENTE_HORA]: String(AGORA - 60000),
    });
    assert.equal(lerCache({ agora: AGORA, sessao: deposito(), local }).length, 6);
  });

  test('o limite é o declarado: 1ms antes vale, 1ms depois não', () => {
    const monta = (idade) => deposito({
      [CHAVE_PERSISTENTE]: JSON.stringify(SEIS),
      [CHAVE_PERSISTENTE_HORA]: String(AGORA - idade),
    });
    const s = deposito();
    assert.equal(lerCache({ agora: AGORA, sessao: s, local: monta(VALIDADE_PERSISTENTE_MS - 1) }).length, 6);
    assert.equal(lerCache({ agora: AGORA, sessao: s, local: monta(VALIDADE_PERSISTENTE_MS) }).length, 0);
  });
});

describe('cache da sessão — um prazo só, não dois', () => {
  test('vence em VALIDADE_SESSAO_MS, e aí cede a vez para a busca', () => {
    const monta = (idade) => deposito({
      [CHAVE_SESSAO]: JSON.stringify(SEIS),
      [CHAVE_SESSAO_HORA]: String(AGORA - idade),
    });
    assert.equal(cacheDaSessaoEstaFresco({ agora: AGORA, sessao: monta(VALIDADE_SESSAO_MS - 1) }), true);
    assert.equal(cacheDaSessaoEstaFresco({ agora: AGORA, sessao: monta(VALIDADE_SESSAO_MS) }), false);
  });

  test('a sessão fresca ganha do persistente fresco', () => {
    const sessao = deposito({
      [CHAVE_SESSAO]: JSON.stringify(TRINTA_E_NOVE),
      [CHAVE_SESSAO_HORA]: String(AGORA - 1000),
    });
    const local = deposito({
      [CHAVE_PERSISTENTE]: JSON.stringify(SEIS),
      [CHAVE_PERSISTENTE_HORA]: String(AGORA - 1000),
    });
    assert.equal(lerCache({ agora: AGORA, sessao, local }).length, 39);
  });

  test('marca de hora no futuro (relógio do usuário torto) não vale como fresca', () => {
    const sessao = deposito({
      [CHAVE_SESSAO]: JSON.stringify(SEIS),
      [CHAVE_SESSAO_HORA]: String(AGORA + 60000),
    });
    assert.equal(cacheDaSessaoEstaFresco({ agora: AGORA, sessao }), false);
  });
});

describe('limparCache — limpar é limpar OS DOIS', () => {
  test('🔴 o bug: o ?fresh=1 deixava o persistente vivo e ele repintava a lista velha', () => {
    const sessao = deposito({ [CHAVE_SESSAO]: JSON.stringify(SEIS), [CHAVE_SESSAO_HORA]: String(AGORA) });
    const local = deposito({ [CHAVE_PERSISTENTE]: JSON.stringify(SEIS), [CHAVE_PERSISTENTE_HORA]: String(AGORA) });
    limparCache({ sessao, local });
    assert.deepEqual(Object.keys(sessao._dados), []);
    assert.deepEqual(Object.keys(local._dados), [], 'o persistente sobreviveu à limpeza');
    assert.deepEqual(lerCache({ agora: AGORA, sessao, local }), []);
  });
});

describe('gravarCache — os dois depósitos, cada um com a sua hora', () => {
  test('grava lista e marca nos dois, e devolve a lista sem duplicados', () => {
    const sessao = deposito(); const local = deposito();
    const salvo = gravarCache([...SEIS, SEIS[0]], { agora: AGORA, sessao, local });
    assert.equal(salvo.length, 6, 'o duplicado passou');
    assert.equal(sessao._dados[CHAVE_SESSAO_HORA], String(AGORA));
    assert.equal(local._dados[CHAVE_PERSISTENTE_HORA], String(AGORA));
    assert.equal(lerCache({ agora: AGORA, sessao, local }).length, 6);
  });

  test('depois de gravar 39, ler devolve 39 — não os 6 de antes', () => {
    const sessao = deposito({ [CHAVE_SESSAO]: JSON.stringify(SEIS), [CHAVE_SESSAO_HORA]: String(AGORA - 5000) });
    const local = deposito({ [CHAVE_PERSISTENTE]: JSON.stringify(SEIS), [CHAVE_PERSISTENTE_HORA]: String(AGORA - 5000) });
    gravarCache(TRINTA_E_NOVE, { agora: AGORA, sessao, local });
    assert.equal(lerCache({ agora: AGORA, sessao, local }).length, 39);
  });

  test('depósito que estoura a cota não derruba a página', () => {
    const cheio = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); }, removeItem: () => {} };
    assert.equal(gravarCache(SEIS, { agora: AGORA, sessao: cheio, local: cheio }).length, 6);
  });
});

describe('lerCacheDeEmergencia — a exceção, e só ela', () => {
  test('quando a busca falha, dado velho vale mais que tela vazia', () => {
    const local = deposito({
      [CHAVE_PERSISTENTE]: JSON.stringify(SEIS),
      [CHAVE_PERSISTENTE_HORA]: String(AGORA - 30 * 24 * 60 * 60 * 1000), // um mês
    });
    assert.equal(lerCacheDeEmergencia({ sessao: deposito(), local }).length, 6);
    assert.deepEqual(lerCache({ agora: AGORA, sessao: deposito(), local }), [],
      'a leitura normal NÃO pode aceitar o que a de emergência aceita');
  });

  test('sem nada guardado, devolve lista vazia em vez de quebrar', () => {
    assert.deepEqual(lerCacheDeEmergencia({ sessao: deposito(), local: deposito() }), []);
  });
});

describe('robustez', () => {
  test('JSON corrompido não derruba a leitura', () => {
    const sessao = deposito({ [CHAVE_SESSAO]: '{isso não é json', [CHAVE_SESSAO_HORA]: String(AGORA) });
    assert.deepEqual(lerCache({ agora: AGORA, sessao, local: deposito() }), []);
  });

  test('semDuplicados descarta item sem id', () => {
    assert.deepEqual(semDuplicados([{ id: 'a' }, {}, { id: 'a' }, null]), [{ id: 'a' }]);
  });
});

// ---------------------------------------------------------------------------
// A Home não pode voltar a falar com o storage por fora.
//
// O defeito não foi o VALOR do prazo — foi haver DOIS prazos para a MESMA chave,
// escritos na mão em pontos diferentes do Home.jsx (300000 na montagem do state,
// 120000 no loadAuctions), e um depósito sem prazo nenhum. Enquanto cada ponto do
// arquivo puder ler e gravar direto, a divergência volta.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');

const linhasDeCodigo = (regex) => home.split('\n')
  .map((t, i) => ({ n: i + 1, t }))
  .filter(({ t }) => regex.test(t) && !t.trim().startsWith('//') && !t.trim().startsWith('*'))
  .map(({ n, t }) => `${n}: ${t.trim().slice(0, 80)}`);

describe('Home.jsx — todo acesso ao cache passa pelo módulo', () => {
  test('🔴 nenhuma leitura ou gravação direta das chaves de cache', () => {
    assert.deepEqual(
      linhasDeCodigo(/auctions_cache/), [],
      'a Home voltou a mexer no storage por fora de cacheDeLeiloes.js',
    );
  });

  test('nenhum prazo de cache escrito na mão', () => {
    // O `interval: 120000` do polling fica de fora de propósito: é a cadência de buscar,
    // não a validade do que está guardado. O que não pode voltar é número de prazo perto
    // da palavra cache.
    assert.deepEqual(linhasDeCodigo(/(120000|300000|1800000).*cache|cache.*(120000|300000|1800000)/i), []);
  });

  test('a Home importa o módulo', () => {
    assert.match(home, /from '@\/lib\/cacheDeLeiloes'/);
  });
});
