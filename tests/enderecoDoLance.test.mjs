// 🔴 ADMIN NÃO CONSEGUIA DAR LANCE (15/09/2026).
//
// Vídeo da Beatriz (admin), 12h13: preenche o endereço na sala do leilão e lê
// "Não foi possível salvar seu endereço. Tente de novo." No log de produção, no
// mesmo minuto, duas tentativas recusadas:
//
//     POST /api/functions/adminUpdateUser 400   15:12:54 UTC
//     POST /api/functions/adminUpdateUser 400   15:13:33 UTC
//
// A caixinha de endereço manda SEIS campos. Quem salva é o plataformaAdapter, e
// ele escolhe a rota pelo cargo de quem está logado:
//
//     cliente comum  →  atualizarMeuCadastro  (lista MEUS_CAMPOS)
//     admin          →  adminUpdateUser       (lista ALLOWED)
//
// A segunda lista não tinha endereço nenhum. Os campos eram descartados, o
// pacote ficava vazio, e a rota respondia "Nenhum campo válido para atualizar".
// Sem endereço salvo não sai frete, e sem frete a sala não libera o lance.
//
// O TESTE É DO INVARIANTE, não da lista: todo campo que a TELA manda precisa ser
// aceito pelas DUAS rotas. Assim, acrescentar um campo novo na caixinha amanhã
// (ponto de referência, por exemplo) reprova aqui em vez de sumir calado em
// produção pra metade das pessoas.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

/** Os campos que a caixinha de endereço realmente envia, lidos da tela. */
function camposQueATelaManda() {
  const src = ler('../src/components/auction/FreteLanceBanner.jsx');
  const bloco = /onConfirmar\(\{([\s\S]*?)\}\);/.exec(src);
  assert.ok(bloco, 'não achei a chamada onConfirmar({...}) na caixinha de endereço');
  const campos = [...bloco[1].matchAll(/^\s*([a-z_]+)\s*:/gm)].map((m) => m[1]);
  assert.ok(campos.length >= 6, `esperava pelo menos 6 campos, achei ${campos.length}`);
  return campos;
}

/** Os nomes dentro de uma lista `const NOME = [ ... ];` de um arquivo. */
function listaDe(rel, nome) {
  const src = ler(rel);
  const m = new RegExp(`const ${nome} = \\[([\\s\\S]*?)\\n\\];`).exec(src);
  assert.ok(m, `não achei a lista ${nome} em ${rel}`);
  // só o que está entre aspas — comentário com nome de campo não conta como permissão
  const semComentario = m[1].split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  return [...semComentario.matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

describe('o endereço que libera o lance', () => {
  const daTela = camposQueATelaManda();

  test('a caixinha manda os seis campos de endereço, e nada além disso', () => {
    assert.deepEqual([...daTela].sort(), [
      'address_city', 'address_complement', 'address_neighborhood',
      'address_number', 'address_state', 'address_street', 'address_zip_code',
    ].sort());
  });

  test('🔴 a rota do ADMIN aceita todos — foi o que quebrou o lance da Beatriz', () => {
    const permitidos = listaDe('../api/functions/adminUpdateUser.js', 'ALLOWED');
    const faltando = daTela.filter((c) => !permitidos.includes(c));
    assert.deepEqual(faltando, [], `adminUpdateUser descarta em silêncio: ${faltando.join(', ')}`);
  });

  test('a rota do CLIENTE comum aceita todos', () => {
    const permitidos = listaDe('../api/functions/atualizarMeuCadastro.js', 'MEUS_CAMPOS');
    const faltando = daTela.filter((c) => !permitidos.includes(c));
    assert.deepEqual(faltando, [], `atualizarMeuCadastro descarta em silêncio: ${faltando.join(', ')}`);
  });

  test('a sala do leilão também salva só o CEP — pela mesma rota, então vale a mesma regra', () => {
    // AuctionRoom grava o CEP sozinho antes de cotar (linha ~521). Se este campo
    // saísse de uma das listas, a pessoa ficaria presa um passo antes.
    const sala = ler('../src/pages/AuctionRoom.jsx');
    assert.match(sala, /AppUser\.update\(currentUser\.id, \{ address_zip_code: cep \}\)/);
    for (const [arq, nome] of [
      ['../api/functions/adminUpdateUser.js', 'ALLOWED'],
      ['../api/functions/atualizarMeuCadastro.js', 'MEUS_CAMPOS'],
    ]) {
      assert.ok(listaDe(arq, nome).includes('address_zip_code'), `${nome} ficou sem address_zip_code`);
    }
  });

  test('🔒 e o endereço NÃO abriu a porta pra cargo ou dinheiro na rota do cliente', () => {
    // A lista do cliente é a mais sensível: é a única que a própria pessoa move.
    const meus = listaDe('../api/functions/atualizarMeuCadastro.js', 'MEUS_CAMPOS');
    for (const proibido of ['role', 'career_levels', 'primary_career_level', 'commission_balance',
      'saldo_disponivel', 'active', 'referred_by_id', 'referral_code', 'email', 'password']) {
      assert.ok(!meus.includes(proibido), `${proibido} entrou na lista que a própria pessoa edita`);
    }
  });
});
